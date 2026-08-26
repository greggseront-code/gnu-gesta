import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import type { Database } from 'better-sqlite3';
import { createTestDb, setDb } from '../src/db/db.connection';
import { setEntraProvider } from '../src/features/auth/entra.client';
import type { EntraAuthProvider, AuthCodeUrlRequest, TokenExchangeRequest } from '../src/features/auth/entra.client';
import type { AcquiredEntraToken, EntraProfile } from '../src/features/auth/auth.types';
import { testServer } from './helpers/test-server';

const REAL_TENANT_ID = 'test-tenant-id'; // matches TEST_CONFIG in auth.config.ts under NODE_ENV=test
const MANAGER_PROFILE: EntraProfile = {
  oid: 'oid-manager',
  userPrincipalName: 'gregory.seront@vinci.be',
  mail: 'gregory.seront@vinci.be',
  displayName: 'Gregory Seront',
};
const OTHER_PROFILE: EntraProfile = {
  oid: 'oid-jane',
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

describe('auth — connexion Microsoft Entra', () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
    setEntraProvider(new FakeEntraProvider(REAL_TENANT_ID, MANAGER_PROFILE));
  });

  afterEach(() => db.close());

  it('GET /api/auth/me returns 401 before login', async () => {
    const res = await request(testServer).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('full flow: login then callback establishes a manager session', async () => {
    const agent = request.agent(testServer);

    const loginRes = await agent.get('/api/auth/login');
    expect(loginRes.status).toBe(302);
    const state = extractState(loginRes.headers.location as string);
    expect(state).not.toBe('');

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).not.toMatch(/error=/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({
      name: 'Gregory Seront',
      email: 'gregory.seront@vinci.be',
      baseRole: 'gestionnaire',
      role: 'gestionnaire',
      entityId: null,
      status: 'ok',
    });
    expect(typeof meRes.body.csrfToken).toBe('string');
    expect(meRes.body.csrfToken.length).toBeGreaterThan(0);
  });

  it('rejects a callback with a mismatched state', async () => {
    const agent = request.agent(testServer);
    await agent.get('/api/auth/login');

    const callbackRes = await agent.get('/api/auth/callback?code=valid-code&state=not-the-real-state');
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=invalid_state/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('rejects a callback without a prior login (no pending auth)', async () => {
    const agent = request.agent(testServer);
    const callbackRes = await agent.get('/api/auth/callback?code=valid-code&state=anything');
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=missing_pending_auth/);
  });

  it('rejects a callback carrying an Entra error parameter', async () => {
    const agent = request.agent(testServer);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?error=access_denied&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=entra_error/);
  });

  it('rejects a token from another tenant', async () => {
    setEntraProvider(new FakeEntraProvider('some-other-tenant', MANAGER_PROFILE));
    const agent = request.agent(testServer);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toMatch(/error=invalid_tenant/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('authenticates a non-manager, non-student account of the tenant as lecteur', async () => {
    setEntraProvider(new FakeEntraProvider(REAL_TENANT_ID, OTHER_PROFILE));
    const agent = request.agent(testServer);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);

    const callbackRes = await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).not.toMatch(/error=/);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({
      name: 'Jane Doe',
      email: 'jane.doe@vinci.be',
      baseRole: 'lecteur',
      role: 'lecteur',
      entityId: null,
      status: 'ok',
    });
  });

  it('logout clears the session', async () => {
    const agent = request.agent(testServer);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);
    await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);

    const meBefore = await agent.get('/api/auth/me');
    expect(meBefore.status).toBe(200);

    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('x-csrf-token', meBefore.body.csrfToken);
    expect(logoutRes.status).toBe(204);

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });

  it('clears the MSAL token cache after reading the profile, on success and on rejection', async () => {
    const managerProvider = new FakeEntraProvider(REAL_TENANT_ID, MANAGER_PROFILE);
    setEntraProvider(managerProvider);
    const agent = request.agent(testServer);
    const loginRes = await agent.get('/api/auth/login');
    const state = extractState(loginRes.headers.location as string);
    await agent.get(`/api/auth/callback?code=valid-code&state=${state}`);
    expect(managerProvider.cacheClearCount).toBe(1);

    const wrongTenantProvider = new FakeEntraProvider('some-other-tenant', MANAGER_PROFILE);
    setEntraProvider(wrongTenantProvider);
    const agent2 = request.agent(testServer);
    const loginRes2 = await agent2.get('/api/auth/login');
    const state2 = extractState(loginRes2.headers.location as string);
    await agent2.get(`/api/auth/callback?code=valid-code&state=${state2}`);
    expect(wrongTenantProvider.cacheClearCount).toBe(1);
  });
});
