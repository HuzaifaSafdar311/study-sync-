import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { hashPassword, verifyPassword } from '../../utils/hasher';

export interface AdminLoginInput {
  identifier: string; // username or email
  password: string;
  securityPassphrase?: string;
}

/**
 * SEC-017: Constant-time string comparison to eliminate timing side-channels
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * SEC-017: Verifies security passphrase supporting Argon2id hashes with fallback constant-time comparison
 */
export async function verifyPassphrase(storedPassphrase: string, providedPassphrase: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedPassphrase || !providedPassphrase) {
    return { valid: false, needsRehash: false };
  }

  const trimmedProvided = providedPassphrase.trim();

  // 1. If stored as Argon2id hash
  if (storedPassphrase.startsWith('$argon2id$')) {
    const isMatch = await verifyPassword(storedPassphrase, trimmedProvided);
    return { valid: isMatch, needsRehash: false };
  }

  // 2. Legacy plaintext fallback: use constant-time comparison to eliminate timing attacks
  const isMatch = constantTimeCompare(storedPassphrase.trim(), trimmedProvided);
  return { valid: isMatch, needsRehash: isMatch };
}

class AdminAuthService {
  /**
   * Authenticate admin against public.admin_accounts table.
   * Signs a completely isolated Admin JWT using dedicated ADMIN_JWT_SECRET.
   */
  async login({ identifier, password, securityPassphrase }: AdminLoginInput) {
    const cleanId = (identifier || '').trim();
    if (!cleanId || !password) {
      throw Object.assign(new Error('Admin username/email and password are required.'), {
        statusCode: 400,
      });
    }

    // Find admin account by username or email
    let account = await prisma.adminAccount.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { email: cleanId.toLowerCase() },
        ],
      },
    });

    // Fallback search if OR query syntax varies
    if (!account) {
      account = await prisma.adminAccount.findUnique({
        where: { username: cleanId },
      });
    }
    if (!account) {
      account = await prisma.adminAccount.findUnique({
        where: { email: cleanId.toLowerCase() },
      });
    }

    if (!account) {
      throw Object.assign(new Error('Invalid admin credentials.'), {
        statusCode: 401,
      });
    }

    if (!account.isActive) {
      throw Object.assign(new Error('This administrator account has been disabled.'), {
        statusCode: 403,
      });
    }

    // Verify Password
    const isMatch = await verifyPassword(account.passwordHash, password);
    if (!isMatch) {
      throw Object.assign(new Error('Invalid admin credentials.'), {
        statusCode: 401,
      });
    }

    // SEC-017: Verify Security Passphrase using Argon2id / constant-time comparison
    if (account.securityPassphrase && account.securityPassphrase.trim() !== '') {
      if (!securityPassphrase) {
        throw Object.assign(new Error('Invalid admin security passphrase.'), {
          statusCode: 401,
        });
      }

      const { valid, needsRehash } = await verifyPassphrase(account.securityPassphrase, securityPassphrase);
      if (!valid) {
        throw Object.assign(new Error('Invalid admin security passphrase.'), {
          statusCode: 401,
        });
      }

      // Upgrade plaintext passphrase in DB to Argon2id
      if (needsRehash) {
        try {
          const hashed = await hashPassword(securityPassphrase.trim());
          await prisma.adminAccount.update({
            where: { id: account.id },
            data: { securityPassphrase: hashed },
          });
        } catch (err) {
          console.warn('[AdminAuth] Could not upgrade security passphrase hash:', err);
        }
      }
    }

    // Sign Dedicated Admin JWT with unique jti for individual token revocation
    const jti = crypto.randomUUID();
    const adminToken = jwt.sign(
      {
        adminId: account.id,
        username: account.username,
        email: account.email,
        role: account.role || 'superadmin',
        type: 'admin_session',
        jti,
      },
      config.adminJwt.secret,
      { expiresIn: config.adminJwt.expiresIn } as jwt.SignOptions
    );

    // Update last login
    try {
      await prisma.adminAccount.update({
        where: { id: account.id },
        data: { lastLogin: new Date() },
      });
    } catch (err) {
      console.warn('[AdminAuth] Could not update lastLogin timestamp:', err);
    }

    return {
      adminToken,
      admin: {
        id: account.id,
        username: account.username,
        email: account.email,
        role: account.role || 'superadmin',
        lastLogin: account.lastLogin,
      },
    };
  }

  /**
   * Retrieve active admin profile
   */
  async getProfile(adminId: string) {
    const account = await prisma.adminAccount.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!account || !account.isActive) {
      throw Object.assign(new Error('Admin session invalid or expired.'), {
        statusCode: 401,
      });
    }

    return account;
  }

  /**
   * Update admin password safely
   */
  async changePassword(adminId: string, currentPass: string, newPass: string) {
    const account = await prisma.adminAccount.findUnique({
      where: { id: adminId },
    });

    if (!account) {
      throw Object.assign(new Error('Admin account not found.'), { statusCode: 404 });
    }

    const isMatch = await verifyPassword(account.passwordHash, currentPass);
    if (!isMatch) {
      throw Object.assign(new Error('Current password does not match.'), { statusCode: 400 });
    }

    if (!newPass || newPass.length < 8) {
      throw Object.assign(new Error('New password must be at least 8 characters long.'), { statusCode: 400 });
    }

    const newHash = await hashPassword(newPass);
    await prisma.adminAccount.update({
      where: { id: adminId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Admin password successfully updated.' };
  }
}

export const adminAuthService = new AdminAuthService();
