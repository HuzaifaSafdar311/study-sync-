/**
 * BUG-005: Strips sensitive fields (passwordHash, refreshToken, verificationOtp, etc.)
 * from any user object before sending it to clients or returning from services.
 * Refresh tokens are strictly delivered via httpOnly cookies; password hashes and
 * OTP secrets must never leave the server boundary.
 */
export function toSafeUser<T extends Record<string, any>>(
  user: T | null | undefined
): Omit<T, 'passwordHash' | 'refreshToken' | 'verificationOtp' | 'otpExpiresAt'> | null {
  if (!user || typeof user !== 'object') return null;
  const {
    passwordHash: _p,
    refreshToken: _r,
    verificationOtp: _v,
    otpExpiresAt: _o,
    ...safe
  } = user;
  return safe as any;
}
