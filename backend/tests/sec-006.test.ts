import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStartupEnv, config } from '../src/config';

describe('SEC-006: Dedicated Admin JWT Secret Isolation & Production Refusal', () => {
  it('should never fall back to student JWT_ACCESS_SECRET when ADMIN_JWT_SECRET is missing', () => {
    // In old code, config.adminJwt.secret falls back directly to process.env.JWT_ACCESS_SECRET
    // If student secret is 'student-super-secret-key' and ADMIN_JWT_SECRET is unset:
    const studentSecret = process.env.JWT_ACCESS_SECRET;
    assert.ok(studentSecret, 'JWT_ACCESS_SECRET must be set for test');

    // On new code, config.adminJwt.secret must NOT equal the student secret
    assert.notStrictEqual(
      config.adminJwt.secret,
      studentSecret,
      'Admin JWT secret must never fall back to student JWT secret'
    );
  });

  it('should refuse to start in production if ADMIN_JWT_SECRET is missing', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAdminSecret = process.env.ADMIN_JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_JWT_SECRET;

      // In old code, validateStartupEnv does not check ADMIN_JWT_SECRET in production, so it does NOT throw!
      // In new code, it must throw an Error with ADMIN_JWT_SECRET
      assert.throws(
        () => {
          validateStartupEnv();
        },
        /Missing required environment variables:.*ADMIN_JWT_SECRET/
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalAdminSecret) process.env.ADMIN_JWT_SECRET = originalAdminSecret;
    }
  });
});
