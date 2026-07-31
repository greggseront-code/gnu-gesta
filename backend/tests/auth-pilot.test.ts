import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setEntraProvider } from '../src/features/auth/entra.client';
import type { EntraAuthProvider, AuthCodeUrlRequest, TokenExchangeRequest } from '../src/features/auth/entra.client';
import type { AcquiredEntraToken, EntraProfile } from '../src/features/auth/auth.types';

const REAL_TENANT_ID = 'test-tenant-id'; // matches TEST_CONFIG in auth.config.ts under NODE_ENV=test
const MANAGER_PROFILE: EntraProfile = {
  userPrincipalName: 'gregory.seront@vinci.be',
  mail: 'gregory.seront@vinci.be',
  displayName: 'Gregory Seront',
};
const OTHER_PROFILE: EntraProfile = {
  userPrincipalName: 'jane.doe@vinci.be',
  mail: 'jane.doe@vinci.be',
  displayName: 'Jane Doe',
};

class FakeEntraProvider implements EntraAuthProvider {
  cacheClearCount = 0;

  constructor(
    private readonly tenantId: string,
    private readonly profile: EntraProfile,
  ) {}

  async getAuthCodeUrl({ state }: AuthCodeUrlRequest): Promise<string> {
    return `https://login.microsoftonline.com/fake/oauth2/v2.0/authorize?state=${encodeURIComponent(state)}`;
  }

  async acquireTokenByCode({ code }: TokenExchangeRequest): Promise<AcquiredEntraToken> {
    if (code === 'invalid-code') {
      throw new Error('entra_invalid_code');
    }
    return { accessToken: 'fake-access-token', tenantId: this.tenantId, cacheHandle: null };
  }

  async getMe(): Promise<EntraProfile> {
    return this.profile;
  }

  async clearCache(): Promise<void> {
    this.cacheClearCount += 1;
  }
}

function extractState(location: string): string {
  return new URL(location).searchParams.get('state') ?? '';
}

describe('auth pilote — gestionnaire uniquement', () => {
  beforeEach(() => {
    setEntraProvider(new FakeEntraProvider(REAL_TENANT_ID, MANAGER_PROFILE));
  });

  it('GET /api/auth/me returns 401 before login', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('full flow: login then callback establishes a manager session', async () => {
    const agent = request.agent(app);

    const loginRes = await agent.get('/api/auth/login');
    expect(loginRes.status).toBe(302);
    const state = extractState(loginRes.headers.location as string);
    expect(state).not.toBe('');

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).not.toMatch(/error=/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      name: 'Gregory Seront',
      email: 'gregory.seront@vinci.be',
      role: 'gestionnaire',
    });
  });

  it('rejects a callback with a mismatched state', async () => {
    const agent = request.agent(app);
    await agent.get('/api/auth/login');

    const callbackRes = await agent.get('/api/auth/callback?code=valid-code&state=not-the-real-state');
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=invalid_state/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('rejects a callback without a prior login (no pending auth)', async () => {
    const agent = request.agent(app);
    const callbackRes = await agent.get('/api/auth/callback?code=valid-code&state=anything');
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=missing_pending_auth/);
  });

  it('rejects a callback carrying an Entra error parameter', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?error=access_denied&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=entra_error/);
  });

  it('rejects a token from another tenant', async () => {
    setEntraProvider(new FakeEntraProvider('some-other-tenant', MANAGER_PROFILE));
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=invalid_tenant/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('authenticates but does not grant a role to a non-manager account of the tenant', async () => {
    setEntraProvider(new FakeEntraProvider(REAL_TENANT_ID, OTHER_PROFILE));
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).not.toMatch(/error=/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({
      name: 'Jane Doe',
      email: 'jane.doe@vinci.be',
      status: 'pilot_not_manager',
    });
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);
    await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);

    const meBefore = await agent.get('/api/auth/me');
    expect(meBefore.status).toBe(200);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(204);

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });

  it('does not leave a business route affected by the pilot session', async () => {
    const res = await request(app).get('/api/companies');
    expect(res.status).toBe(200);
  });

  it('clears the MSAL token cache after reading the profile, on success and on rejection', async () => {
    const managerProvider = new FakeEntraProvider(REAL_TENANT_ID, MANAGER_PROFILE);
    setEntraProvider(managerProvider);
    const agent = request.agent(app);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);
    await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(managerProvider.cacheClearCount).toBe(1);

    const wrongTenantProvider = new FakeEntraProvider('some-other-tenant', MANAGER_PROFILE);
    setEntraProvider(wrongTenantProvider);
    const agent2 = request.agent(app);
    const loginRes2 = await agent2.get('/api/auth/login');
    const state2 = extractState(loginRes2.headers.location as string);
    await agent2.get(`/api/auth/callback?code=valid-code&state=${state2}`);
    expect(wrongTenantProvider.cacheClearCount).toBe(1);
  });
});
