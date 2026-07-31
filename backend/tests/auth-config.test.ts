import { describe, it, expect } from 'vitest';
import { parseAuthConfig } from '../src/features/auth/auth.config';

const VALID_ENV = {
  ENTRA_TENANT_ID: 'tenant-123',
  ENTRA_CLIENT_ID: 'client-123',
  ENTRA_CLIENT_SECRET: 'secret-123',
  ENTRA_REDIRECT_URI: 'http://localhost:5173/api/auth/callback',
  APP_BASE_URL: 'http://localhost:5173',
  SESSION_SECRET: 'a-long-enough-dev-session-secret',
  GESTA_MANAGER_EMAIL: 'gregory.seront@vinci.be',
};

describe('parseAuthConfig', () => {
  it('accepts a complete valid configuration', () => {
    const result = parseAuthConfig(VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.GESTA_MANAGER_EMAIL).toBe('gregory.seront@vinci.be');
    }
  });

  it('rejects a configuration missing the client secret', () => {
    const { ENTRA_CLIENT_SECRET: _omit, ...incomplete } = VALID_ENV;
    const result = parseAuthConfig(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing).toContain('ENTRA_CLIENT_SECRET');
    }
  });

  it('rejects an invalid redirect URI without leaking other values', () => {
    const result = parseAuthConfig({ ...VALID_ENV, ENTRA_REDIRECT_URI: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing).toEqual(['ENTRA_REDIRECT_URI']);
    }
  });

  it('rejects a session secret that is too short', () => {
    const result = parseAuthConfig({ ...VALID_ENV, SESSION_SECRET: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing).toContain('SESSION_SECRET');
    }
  });

  it('rejects a manager email that is not a valid email', () => {
    const result = parseAuthConfig({ ...VALID_ENV, GESTA_MANAGER_EMAIL: 'not-an-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing).toContain('GESTA_MANAGER_EMAIL');
    }
  });

  it('reports every missing variable when the environment is empty', () => {
    const result = parseAuthConfig({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.missing.sort()).toEqual(
        [
          'ENTRA_TENANT_ID',
          'ENTRA_CLIENT_ID',
          'ENTRA_CLIENT_SECRET',
          'ENTRA_REDIRECT_URI',
          'APP_BASE_URL',
          'SESSION_SECRET',
          'GESTA_MANAGER_EMAIL',
        ].sort(),
      );
    }
  });
});
