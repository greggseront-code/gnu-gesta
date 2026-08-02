import { apiFetch, setCsrfToken, setUnauthorizedHandler } from './api-client';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  setCsrfToken(null);
  setUnauthorizedHandler(null);
});

test('apiFetch appelle /api + path et retourne le JSON', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );

  const result = await apiFetch<{ ok: boolean }>('/health');

  expect(fetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({
    credentials: 'include',
    headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
  }));
  expect(result).toEqual({ ok: true });
});

test('apiFetch lève une erreur si la réponse n\'est pas ok', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ error: 'Non trouvé' }), { status: 404 }),
  );

  await expect(apiFetch('/nope')).rejects.toThrow('Non trouvé');
});

test('apiFetch envoie le jeton CSRF sur une mutation, pas sur un GET', async () => {
  setCsrfToken('token-123');
  vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }));

  await apiFetch('/health');
  expect(fetch).toHaveBeenLastCalledWith('/api/health', expect.objectContaining({
    headers: expect.not.objectContaining({ 'x-csrf-token': expect.anything() }),
  }));

  await apiFetch('/companies', { method: 'POST', body: '{}' });
  expect(fetch).toHaveBeenLastCalledWith('/api/companies', expect.objectContaining({
    headers: expect.objectContaining({ 'x-csrf-token': 'token-123' }),
  }));
});

test('apiFetch déclenche le handler global sur un 401', async () => {
  const handler = vi.fn();
  setUnauthorizedHandler(handler);
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'not_authenticated' }), { status: 401 }));

  await expect(apiFetch('/companies')).rejects.toThrow();
  expect(handler).toHaveBeenCalledOnce();
});
