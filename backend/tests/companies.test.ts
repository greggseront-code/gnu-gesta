import request from 'supertest';
import { app } from '../src/app';
import { createTestDb, setDb } from '../src/db/db.connection';
import type { Database } from 'better-sqlite3';
import { loginAsGestionnaire, type AuthenticatedAgent } from './helpers/authenticated-agent';

let db: Database;
let manager: AuthenticatedAgent;

beforeEach(async () => {
  db = createTestDb();
  setDb(db);
  manager = await loginAsGestionnaire();
});

afterEach(() => {
  db.close();
});

const validCompany = {
  name: 'Acme Corp',
  general_email: 'contact@acme.com',
  contacts: [
    {
      first_name: 'Jean',
      last_name: 'Dupont',
      email: 'jean@acme.com',
      roles: ['maitre_de_stage'],
    },
  ],
};

// Helper: POST as gestionnaire
const postCompany = (body: object) =>
  manager.agent.post('/api/companies').set('x-csrf-token', manager.csrfToken).send(body);

test('POST /api/companies crée une entreprise avec contacts', async () => {
  const res = await postCompany(validCompany);

  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  expect(res.body.name).toBe('Acme Corp');
  expect(res.body.contacts).toHaveLength(1);
  expect(res.body.contacts[0].id).toBeDefined();
  expect(res.body.contacts[0].roles).toEqual(['maitre_de_stage']);
});

test('POST /api/companies sans contacts retourne 400', async () => {
  const res = await postCompany({ name: 'Acme Corp', general_email: 'contact@acme.com', contacts: [] });

  expect(res.status).toBe(400);
  expect(res.body.error).toBeDefined();
});

test('POST /api/companies sans general_email retourne 400', async () => {
  const res = await postCompany({ name: 'Acme Corp', contacts: validCompany.contacts });

  expect(res.status).toBe(400);
});

test('POST /api/companies avec email invalide retourne 400', async () => {
  const res = await postCompany({ ...validCompany, general_email: 'pas-un-email' });

  expect(res.status).toBe(400);
});

test('GET /api/companies retourne la liste des entreprises', async () => {
  await postCompany(validCompany);
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com' });

  const res = await manager.agent.get('/api/companies');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
});

test('GET /api/companies?search= filtre par nom', async () => {
  await postCompany(validCompany);
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com' });

  const res = await manager.agent.get('/api/companies?search=acme');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].name).toBe('Acme Corp');
});

test('POST /api/companies signale les doublons probables', async () => {
  await postCompany(validCompany);

  const res = await postCompany({ ...validCompany, name: 'Acme Corporation', general_email: 'other@acme.com' });

  expect(res.status).toBe(201);
  expect(res.body.probable_duplicates).toHaveLength(1);
  expect(res.body.probable_duplicates[0].name).toBe('Acme Corp');
});

test("GET /api/companies/:id retourne l'entreprise avec ses contacts", async () => {
  const created = (await postCompany(validCompany)).body;

  const res = await manager.agent.get(`/api/companies/${created.id}`);

  expect(res.status).toBe(200);
  expect(res.body.id).toBe(created.id);
  expect(res.body.name).toBe('Acme Corp');
  expect(res.body.contacts).toHaveLength(1);
  expect(res.body.contacts[0].email).toBe('jean@acme.com');
});

test('GET /api/companies/:id avec un id inexistant retourne 404', async () => {
  const res = await manager.agent.get('/api/companies/9999');
  expect(res.status).toBe(404);
});

test('POST /api/companies/:id/contacts ajoute un contact et le retourne', async () => {
  const created = (await postCompany(validCompany)).body;

  const res = await manager.agent
    .post(`/api/companies/${created.id}/contacts`)
    .set('x-csrf-token', manager.csrfToken)
    .send({ first_name: 'Marie', last_name: 'Curie', email: 'marie@acme.com', roles: ['responsable_administratif'] });

  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  expect(res.body.company_id).toBe(created.id);
  expect(res.body.roles).toEqual(['responsable_administratif']);
});

test('POST /api/companies/:id/contacts sans email retourne 400', async () => {
  const created = (await postCompany(validCompany)).body;

  const res = await manager.agent
    .post(`/api/companies/${created.id}/contacts`)
    .set('x-csrf-token', manager.csrfToken)
    .send({ first_name: 'Marie', last_name: 'Curie', roles: ['maitre_de_stage'] });

  expect(res.status).toBe(400);
});

test("PATCH /api/companies/:id met à jour les champs de l'entreprise", async () => {
  const created = (await postCompany(validCompany)).body;

  const res = await manager.agent
    .patch(`/api/companies/${created.id}`)
    .set('x-csrf-token', manager.csrfToken)
    .send({ name: 'Acme Corp Modifié', general_email: 'nouveau@acme.com' });

  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Acme Corp Modifié');
  expect(res.body.general_email).toBe('nouveau@acme.com');
});

test('GET /api/companies?duplicate_risk=true retourne les entreprises à risque de doublon', async () => {
  await postCompany(validCompany);
  await postCompany({ ...validCompany, name: 'Acme Corporation', general_email: 'corp@acme.com' });
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com' });

  const res = await manager.agent.get('/api/companies?duplicate_risk=true');

  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThanOrEqual(2);
  const names = res.body.map((c: { name: string }) => c.name);
  expect(names).toContain('Acme Corp');
  expect(names).toContain('Acme Corporation');
  expect(names).not.toContain('Beta Inc');
});

test('GET /api/companies anonyme reçoit 401', async () => {
  const res = await request(app).get('/api/companies');
  expect(res.status).toBe(401);
});
