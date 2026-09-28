import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from './auth.service';
import { AuthRequest } from '../../middleware/authGuard';
import { config } from '../../config';
import { toSafeUser } from '../../utils/safeUser';

function getEffectiveGoogleRedirectUri(req: Request): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const host = (req.get('x-forwarded-host') || req.get('host') || req.headers.host || '').trim();
  const proto = (req.get('x-forwarded-proto') || (req.secure ? 'https' : (host.includes('localhost') ? 'http' : 'https'))).trim();

  // If running in production (Vercel or non-localhost domain)
  if (isVercel || (!host.includes('localhost') && !host.includes('127.0.0.1') && host.length > 0)) {
    if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
      return process.env.GOOGLE_REDIRECT_URI.trim();
    }
    return `${proto}://${host}/api/auth/google/callback`;
  }

  return config.google.redirectUri || 'http://localhost:5000/api/auth/google/callback';
}

function getEffectiveFrontendUrl(req: Request): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const host = (req.get('x-forwarded-host') || req.get('host') || req.headers.host || '').trim();
  const proto = (req.get('x-forwarded-proto') || (req.secure ? 'https' : (host.includes('localhost') ? 'http' : 'https'))).trim();

  if (isVercel || (!host.includes('localhost') && !host.includes('127.0.0.1') && host.length > 0)) {
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
      return process.env.FRONTEND_URL.trim();
    }
    return `${proto}://${host}`;
  }

  return config.frontendUrl || 'http://localhost:5173';
}

class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      if (result.requiresVerification) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            requiresVerification: true,
            email: result.email,
          },
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Welcome to StudySync! Your account is ready.',
        data: {
          user: toSafeUser((result as any).user),
          accessToken: (result as any).accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.body.email;
      const otp = req.body.otp || req.body.otpCode;
      if (!email || !otp) {
        res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required.' });
        return;
      }

      const result = await authService.verifyOtp(email, otp);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: toSafeUser(result.user),
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/resend-otp
   */
  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required.' });
        return;
      }

      const result = await authService.resendOtp(email);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result: any = await authService.login(req.body);

      if (result.requiresVerification) {
        res.status(200).json({
          success: false,
          requiresVerification: true,
          email: result.email,
          message: result.message,
        });
        return;
      }

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: result.isAdmin ? 'Admin session authorized.' : 'Welcome back!',
        data: {
          user: toSafeUser(result.user),
          accessToken: result.accessToken,
          adminToken: result.adminToken,
          isAdmin: result.isAdmin || false,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required.' });
        return;
      }

      const result = await authService.requestPasswordReset(email);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Email, reset code, and new password are required.',
        });
        return;
      }

      const result = await authService.resetPassword(email, otp, newPassword);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token missing. Please log in.',
        });
        return;
      }

      const result = await authService.refreshTokens(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        data: {
          user: toSafeUser(result.user),
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.userId) {
        await authService.logout(req.userId);
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.userId!);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/auth/profile
   */
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        fullName,
        email,
        reminderLeadTimeMins,
        whatsappNumber,
        avatarUrl,
        university,
        major,
        semester,
        plan,
        aiProviderPreference,
        activeByokProvider,
      } = req.body;

      if (!req.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await authService.updateProfile(req.userId, {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(reminderLeadTimeMins !== undefined ? { reminderLeadTimeMins: Number(reminderLeadTimeMins) } : {}),
        ...(whatsappNumber !== undefined ? { whatsappNumber } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(university !== undefined ? { university } : {}),
        ...(major !== undefined ? { major } : {}),
        ...(semester !== undefined ? { semester } : {}),
        ...(plan !== undefined ? { plan } : {}),
        ...(aiProviderPreference !== undefined ? { aiProviderPreference } : {}),
        ...(activeByokProvider !== undefined ? { activeByokProvider } : {}),
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/onboarding/complete
   */
  async completeOnboarding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        university,
        major,
        semester,
        plan,
        aiProviderPreference,
        activeByokProvider,
      } = req.body;

      const user = await authService.completeOnboarding(req.userId, {
        university,
        major,
        semester,
        plan: plan || 'trial',
        aiProviderPreference: aiProviderPreference || 'system',
        activeByokProvider,
      });

      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully! Welcome to StudySync AI.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/google/url
   */
  async googleAuthUrl(req: Request, res: Response) {
    const redirectUri = getEffectiveGoogleRedirectUri(req);
    const authData = authService.getGoogleAuthUrl(redirectUri);
    res.status(200).json({
      success: true,
      data: authData,
    });
  }

  /**
   * GET /api/auth/google
   * Direct redirect to Google OAuth consent screen
   */
  async googleRedirect(req: Request, res: Response) {
    const redirectUri = getEffectiveGoogleRedirectUri(req);
    const authData = authService.getGoogleAuthUrl(redirectUri);
    if (authData.isConfigured && authData.url) {
      res.redirect(authData.url);
    } else {
      const frontendUrl = getEffectiveFrontendUrl(req);
      res.redirect(`${frontendUrl}/login?google_unconfigured=true`);
    }
  }

  /**
   * GET /api/auth/google/callback
   */
  async googleCallback(req: Request, res: Response, next: NextFunction) {
    const redirectUri = getEffectiveGoogleRedirectUri(req);
    const frontendUrl = getEffectiveFrontendUrl(req);
    try {
      const { code, error } = req.query;
      if (error) {
        res.redirect(`${frontendUrl}/login?google_error=${encodeURIComponent(String(error))}`);
        return;
      }
      if (!code || typeof code !== 'string') {
        res.redirect(`${frontendUrl}/login?google_error=${encodeURIComponent('No authorization code received from Google.')}`);
        return;
      }

      const result = await authService.handleGoogleCallback(code, redirectUri);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.redirect(
        `${frontendUrl}/login?google_auth=success&token=${result.accessToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`
      );
    } catch (err: any) {
      console.error('[GoogleCallback] Error:', err);
      res.redirect(`${frontendUrl}/login?google_error=${encodeURIComponent(err.message || 'Google sign-in failed.')}`);
    }
  }

  /**
   * POST /api/auth/google/token
   * Accepts Google credential token OR simulated developer Google sign-in
   */
  async googleToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential, isSimulated, email, name } = req.body;

      let result;
      if (credential) {
        result = await authService.handleGoogleCredentialToken(credential);
      } else if (isSimulated || !config.google.clientId) {
        result = await authService.simulateGoogleLogin(email, name);
      } else {
        res.status(400).json({ success: false, message: 'Google credential token is required.' });
        return;
      }

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: result.message || 'Google authentication successful!',
        data: {
          user: toSafeUser(result.user),
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
