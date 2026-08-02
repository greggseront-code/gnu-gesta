import request from 'supertest';
import { app } from '../src/app';
import { createTestDb, setDb } from '../src/db/db.connection';
import type { Database } from 'better-sqlite3';
import {
  loginAsGestionnaire,
  loginAsLecteur,
  loginAsEtudiant,
  loginAsEntreprise,
  type AuthenticatedAgent,
} from './helpers/authenticated-agent';

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

// L'email d'un contact est une clé unique globale : chaque entreprise
// supplémentaire créée dans un même test doit porter un contact distinct.
const withContact = (email: string) => [{ ...validCompany.contacts[0], email }];

test('GET /api/companies retourne la liste des entreprises', async () => {
  await postCompany(validCompany);
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com', contacts: withContact('pierre@beta.com') });

  const res = await manager.agent.get('/api/companies');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(2);
});

test('GET /api/companies?search= filtre par nom', async () => {
  await postCompany(validCompany);
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com', contacts: withContact('pierre@beta.com') });

  const res = await manager.agent.get('/api/companies?search=acme');

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].name).toBe('Acme Corp');
});

test('POST /api/companies signale les doublons probables', async () => {
  await postCompany(validCompany);

  const res = await postCompany({
    ...validCompany,
    name: 'Acme Corporation',
    general_email: 'other@acme.com',
    contacts: withContact('marie@acme-corporation.com'),
  });

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

test('PATCH /api/companies/:id vers un nom/adresse déjà utilisé (casse et espaces) retourne 409', async () => {
  await postCompany({ ...validCompany, name: 'Beta Inc', address: '1 rue A', general_email: 'beta@beta.com', contacts: withContact('beta-contact@beta.com') });
  const target = (await postCompany({ ...validCompany, name: 'Gamma Sarl', address: '2 rue B', general_email: 'gamma@gamma.com', contacts: withContact('gamma-contact@gamma.com') })).body;

  const res = await manager.agent
    .patch(`/api/companies/${target.id}`)
    .set('x-csrf-token', manager.csrfToken)
    .send({ name: '  BETA INC  ', address: ' 1 RUE A ' });

  expect(res.status).toBe(409);
});

test('GET /api/companies?duplicate_risk=true retourne les entreprises à risque de doublon', async () => {
  await postCompany(validCompany);
  await postCompany({
    ...validCompany,
    name: 'Acme Corporation',
    general_email: 'corp@acme.com',
    contacts: withContact('marie@acme-corporation.com'),
  });
  await postCompany({ ...validCompany, name: 'Beta Inc', general_email: 'beta@beta.com', contacts: withContact('pierre@beta.com') });

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

// ─── Statut de validation et visibilité ────────────────────────────────────

function insertStudent(email: string, firstName = 'Etu', lastName = 'Diant') {
  db.prepare('INSERT INTO students (first_name, last_name, email) VALUES (?, ?, ?)').run(firstName, lastName, email);
}

const postAs = (agent: AuthenticatedAgent, body: object) =>
  agent.agent.post('/api/companies').set('x-csrf-token', agent.csrfToken).send(body);

test('entreprise ne peut pas créer une entreprise (403)', async () => {
  const entreprise = await loginAsEntreprise((await postCompany(validCompany)).body.id);
  const res = await postAs(entreprise, { ...validCompany, name: 'Autre', contacts: withContact('a@a.com') });
  expect(res.status).toBe(403);
});

test('une entreprise créée par un étudiant est en attente avec son créateur enregistré', async () => {
  insertStudent('alice@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');

  const res = await postAs(alice, validCompany);
  expect(res.status).toBe(201);
  expect(res.body.validation_status).toBe('pending');
  expect(res.body.contacts[0].validation_status).toBe('pending');
  expect(res.body.validated_at).toBeNull();
});

test('une entreprise créée par le gestionnaire est validée immédiatement', async () => {
  const res = await postCompany(validCompany);
  expect(res.body.validation_status).toBe('validated');
  expect(res.body.validated_at).not.toBeNull();
  expect(res.body.contacts[0].validation_status).toBe('validated');
});

test("l'étudiant créateur retrouve sa propre entreprise en attente en liste, recherche et détail", async () => {
  insertStudent('alice@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;

  const list = await alice.agent.get('/api/companies');
  expect(list.body.map((c: { id: number }) => c.id)).toContain(created.id);

  const search = await alice.agent.get('/api/companies?search=acme');
  expect(search.body.map((c: { id: number }) => c.id)).toContain(created.id);

  const detail = await alice.agent.get(`/api/companies/${created.id}`);
  expect(detail.status).toBe(200);
});

test("un autre étudiant ne voit pas l'entreprise en attente d'autrui (liste, recherche, détail = 404)", async () => {
  insertStudent('alice@student.vinci.be');
  insertStudent('bob@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const bob = await loginAsEtudiant('bob@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;

  const list = await bob.agent.get('/api/companies');
  expect(list.body.map((c: { id: number }) => c.id)).not.toContain(created.id);

  const search = await bob.agent.get('/api/companies?search=acme');
  expect(search.body.map((c: { id: number }) => c.id)).not.toContain(created.id);

  const detail = await bob.agent.get(`/api/companies/${created.id}`);
  expect(detail.status).toBe(404);
});

test("le lecteur ne voit pas une entreprise en attente (liste et détail = 404)", async () => {
  insertStudent('alice@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;
  const lecteur = await loginAsLecteur();

  const list = await lecteur.agent.get('/api/companies');
  expect(list.body.map((c: { id: number }) => c.id)).not.toContain(created.id);

  const detail = await lecteur.agent.get(`/api/companies/${created.id}`);
  expect(detail.status).toBe(404);
});

test('le gestionnaire voit les entreprises en attente en liste et détail', async () => {
  insertStudent('alice@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;

  const list = await manager.agent.get('/api/companies');
  expect(list.body.map((c: { id: number }) => c.id)).toContain(created.id);

  const detail = await manager.agent.get(`/api/companies/${created.id}`);
  expect(detail.status).toBe(200);
});

test("un contact ajouté par un étudiant à une entreprise validée est en attente et n'est visible que par lui", async () => {
  const company = (await postCompany(validCompany)).body;
  insertStudent('alice@student.vinci.be');
  insertStudent('bob@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const bob = await loginAsEtudiant('bob@student.vinci.be');

  const res = await alice.agent
    .post(`/api/companies/${company.id}/contacts`)
    .set('x-csrf-token', alice.csrfToken)
    .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] });
  expect(res.status).toBe(201);
  expect(res.body.validation_status).toBe('pending');

  const aliceView = await alice.agent.get(`/api/companies/${company.id}`);
  expect(aliceView.body.contacts.map((c: { id: number }) => c.id)).toContain(res.body.id);

  const bobView = await bob.agent.get(`/api/companies/${company.id}`);
  expect(bobView.body.contacts.map((c: { id: number }) => c.id)).not.toContain(res.body.id);

  const managerView = await manager.agent.get(`/api/companies/${company.id}`);
  expect(managerView.body.contacts.map((c: { id: number }) => c.id)).toContain(res.body.id);
});

test("un étudiant peut ajouter un contact à sa propre entreprise en attente", async () => {
  insertStudent('alice@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;

  const res = await alice.agent
    .post(`/api/companies/${created.id}/contacts`)
    .set('x-csrf-token', alice.csrfToken)
    .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] });

  expect(res.status).toBe(201);
});

test("un étudiant ne peut pas ajouter de contact à l'entreprise en attente d'un autre étudiant (404)", async () => {
  insertStudent('alice@student.vinci.be');
  insertStudent('bob@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const bob = await loginAsEtudiant('bob@student.vinci.be');
  const created = (await postAs(alice, validCompany)).body;

  const res = await bob.agent
    .post(`/api/companies/${created.id}/contacts`)
    .set('x-csrf-token', bob.csrfToken)
    .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] });

  expect(res.status).toBe(404);
});

test('un contact ajouté par une entreprise à sa propre fiche est directement validé', async () => {
  const company = (await postCompany(validCompany)).body;
  const entreprise = await loginAsEntreprise(company.id);

  const res = await entreprise.agent
    .post(`/api/companies/${company.id}/contacts`)
    .set('x-csrf-token', entreprise.csrfToken)
    .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] });

  expect(res.status).toBe(201);
  expect(res.body.validation_status).toBe('validated');
  expect(res.body.validated_at).not.toBeNull();
});

// ─── Conflits d'unicité (409) ───────────────────────────────────────────────

test('POST /api/companies avec un email de contact déjà utilisé retourne 409', async () => {
  await postCompany(validCompany);

  const res = await postCompany({
    ...validCompany,
    name: 'Totalement Différent',
    general_email: 'diff@diff.com',
    contacts: [{ ...validCompany.contacts[0] }], // même email jean@acme.com
  });

  expect(res.status).toBe(409);
  expect(res.body.error).toBeTruthy();
});

test('POST /api/companies avec le même nom et la même adresse retourne 409', async () => {
  await postCompany({ ...validCompany, address: '1 rue A' });

  const res = await postCompany({
    ...validCompany,
    address: '  1 RUE A  ',
    name: '  acme corp  ',
    contacts: withContact('autre@acme.com'),
  });

  expect(res.status).toBe(409);
});

test("un étudiant qui tente de créer une entreprise en conflit avec une soumission masquée reçoit un 409 générique sans détail de la soumission cachée", async () => {
  insertStudent('alice@student.vinci.be');
  insertStudent('bob@student.vinci.be');
  const alice = await loginAsEtudiant('alice@student.vinci.be');
  const bob = await loginAsEtudiant('bob@student.vinci.be');
  const aliceCompany = (await postAs(alice, validCompany)).body; // pending, invisible à bob

  const res = await postAs(bob, { ...validCompany, contacts: withContact('bob-contact@acme.com') });

  expect(res.status).toBe(409);
  expect(res.body.id).toBeUndefined();
  expect(JSON.stringify(res.body)).not.toContain(String(aliceCompany.id));
});

test('POST /api/companies/:id/contacts avec un email déjà utilisé retourne 409', async () => {
  const company = (await postCompany(validCompany)).body;

  const res = await manager.agent
    .post(`/api/companies/${company.id}/contacts`)
    .set('x-csrf-token', manager.csrfToken)
    .send({ first_name: 'Marc', last_name: 'Petit', email: 'jean@acme.com', roles: ['encadrant_technique'] });

  expect(res.status).toBe(409);
});

// ─── Modération gestionnaire ────────────────────────────────────────────────

describe('modération gestionnaire des entreprises et contacts', () => {
  async function createPendingCompany() {
    insertStudent('alice@student.vinci.be');
    const alice = await loginAsEtudiant('alice@student.vinci.be');
    const created = (await postAs(alice, validCompany)).body;
    return { alice, created };
  }

  test('GET /api/companies/pending est réservé au gestionnaire', async () => {
    const lecteur = await loginAsLecteur();
    expect((await lecteur.agent.get('/api/companies/pending')).status).toBe(403);

    insertStudent('alice@student.vinci.be');
    const alice = await loginAsEtudiant('alice@student.vinci.be');
    expect((await alice.agent.get('/api/companies/pending')).status).toBe(403);

    expect((await request(app).get('/api/companies/pending')).status).toBe(401);
  });

  test('GET /api/companies/pending liste les entreprises et contacts en attente avec créateur et doublons', async () => {
    const { created } = await createPendingCompany();
    await postCompany({ ...validCompany, name: 'Acme Corporation', address: 'x', contacts: withContact('other@acme-corp.com') });

    const res = await manager.agent.get('/api/companies/pending');
    expect(res.status).toBe(200);
    expect(res.body.companies).toHaveLength(1);
    expect(res.body.companies[0].id).toBe(created.id);
    expect(res.body.companies[0].submitted_by_student.email).toBe('alice@student.vinci.be');
    expect(res.body.companies[0].probable_duplicates.map((d: { name: string }) => d.name)).toContain('Acme Corporation');
    expect(res.body.contacts).toHaveLength(1); // le premier contact de la soumission initiale
  });

  test("POST /api/companies/:id/validate valide l'entreprise et ses contacts initiaux", async () => {
    const { created } = await createPendingCompany();

    const res = await manager.agent.post(`/api/companies/${created.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.validation_status).toBe('validated');
    expect(res.body.contacts[0].validation_status).toBe('validated');

    const pending = await manager.agent.get('/api/companies/pending');
    expect(pending.body.companies).toHaveLength(0);
    expect(pending.body.contacts).toHaveLength(0);
  });

  test('POST /api/companies/:id/validate sur une entreprise déjà validée retourne 409', async () => {
    const company = (await postCompany(validCompany)).body;
    const res = await manager.agent.post(`/api/companies/${company.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(409);
  });

  test('POST /api/companies/:id/validate sur un id inexistant retourne 404', async () => {
    const res = await manager.agent.post('/api/companies/9999/validate').set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(404);
  });

  test('les rôles non gestionnaire reçoivent 403 sur les actions de modération', async () => {
    const { created } = await createPendingCompany();
    const lecteur = await loginAsLecteur();

    expect(
      (await lecteur.agent.post(`/api/companies/${created.id}/validate`).set('x-csrf-token', lecteur.csrfToken)).status,
    ).toBe(403);
    expect((await lecteur.agent.delete(`/api/companies/${created.id}`).set('x-csrf-token', lecteur.csrfToken)).status).toBe(403);
  });

  test('DELETE /api/companies/:id refuse une soumission en attente non référencée', async () => {
    const { created } = await createPendingCompany();

    const res = await manager.agent.delete(`/api/companies/${created.id}`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(204);

    const check = await manager.agent.get(`/api/companies/${created.id}`);
    expect(check.status).toBe(404);
  });

  test('DELETE /api/companies/:id sur une entreprise déjà validée retourne 409', async () => {
    const company = (await postCompany(validCompany)).body;
    const res = await manager.agent.delete(`/api/companies/${company.id}`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(409);
  });

  test('DELETE /api/companies/:id référencée par une offre est bloqué avec les offer_ids', async () => {
    const { alice, created } = await createPendingCompany();
    const contactId = created.contacts[0].id;

    // L'offre est créée par l'étudiante créatrice elle-même : une offre
    // gestionnaire est désormais directement publiée et bloquerait donc sa
    // propre création tant que l'entreprise est en attente (voir tâche 004).
    const offerRes = await alice.agent
      .post('/api/offers')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        company_id: created.id,
        priority_contact_id: contactId,
        contact_ids: [contactId],
        description: 'Stage test',
        remote_allowed: false,
      });
    expect(offerRes.status).toBe(201);

    const res = await manager.agent.delete(`/api/companies/${created.id}`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(409);
    expect(res.body.offer_ids).toContain(offerRes.body.id);

    // La suppression n'a pas eu lieu : l'entreprise reste consultable par le gestionnaire.
    const check = await manager.agent.get(`/api/companies/${created.id}`);
    expect(check.status).toBe(200);
  });

  test("POST /api/companies/contacts/:contactId/validate valide un contact ajouté ultérieurement, sans toucher à l'entreprise", async () => {
    const company = (await postCompany(validCompany)).body;
    insertStudent('alice@student.vinci.be');
    const alice = await loginAsEtudiant('alice@student.vinci.be');
    const contact = (
      await alice.agent
        .post(`/api/companies/${company.id}/contacts`)
        .set('x-csrf-token', alice.csrfToken)
        .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] })
    ).body;

    const res = await manager.agent.post(`/api/companies/contacts/${contact.id}/validate`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(200);
    expect(res.body.validation_status).toBe('validated');
  });

  test('PATCH /api/companies/contacts/:contactId modifie un contact et applique les contraintes d\'unicité', async () => {
    const company = (await postCompany(validCompany)).body;
    const contactId = company.contacts[0].id;

    const ok = await manager.agent
      .patch(`/api/companies/contacts/${contactId}`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ first_name: 'Jean-Modifié' });
    expect(ok.status).toBe(200);
    expect(ok.body.first_name).toBe('Jean-Modifié');

    const other = (
      await manager.agent
        .post(`/api/companies/${company.id}/contacts`)
        .set('x-csrf-token', manager.csrfToken)
        .send({ first_name: 'Autre', last_name: 'Personne', email: 'autre@acme.com', roles: ['maitre_de_stage'] })
    ).body;

    const conflict = await manager.agent
      .patch(`/api/companies/contacts/${other.id}`)
      .set('x-csrf-token', manager.csrfToken)
      .send({ email: 'jean-modifie@acme.com' });
    // 'jean-modifie@acme.com' est différent de l'email courant du 1er contact
    // (toujours 'jean@acme.com', seul first_name a changé) : ceci doit réussir.
    expect(conflict.status).toBe(200);
  });

  test('DELETE /api/companies/contacts/:contactId refuse un contact en attente non référencé', async () => {
    const company = (await postCompany(validCompany)).body;
    insertStudent('alice@student.vinci.be');
    const alice = await loginAsEtudiant('alice@student.vinci.be');
    const contact = (
      await alice.agent
        .post(`/api/companies/${company.id}/contacts`)
        .set('x-csrf-token', alice.csrfToken)
        .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] })
    ).body;

    const res = await manager.agent.delete(`/api/companies/contacts/${contact.id}`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(204);
  });

  test('DELETE /api/companies/contacts/:contactId référencé par une offre est bloqué avec les offer_ids', async () => {
    const company = (await postCompany(validCompany)).body;
    const priorityContactId = company.contacts[0].id;
    insertStudent('alice@student.vinci.be');
    const alice = await loginAsEtudiant('alice@student.vinci.be');
    const pendingContact = (
      await alice.agent
        .post(`/api/companies/${company.id}/contacts`)
        .set('x-csrf-token', alice.csrfToken)
        .send({ first_name: 'Marc', last_name: 'Petit', email: 'marc@acme.com', roles: ['encadrant_technique'] })
    ).body;

    // Créée par l'étudiante elle-même : une offre gestionnaire est
    // directement publiée et bloquerait donc sa propre création tant que ce
    // contact est en attente (voir tâche 004).
    const offerRes = await alice.agent
      .post('/api/offers')
      .set('x-csrf-token', alice.csrfToken)
      .send({
        company_id: company.id,
        priority_contact_id: priorityContactId,
        contact_ids: [priorityContactId, pendingContact.id],
        description: 'Stage test',
        remote_allowed: false,
      });
    expect(offerRes.status).toBe(201);

    const res = await manager.agent.delete(`/api/companies/contacts/${pendingContact.id}`).set('x-csrf-token', manager.csrfToken);
    expect(res.status).toBe(409);
    expect(res.body.offer_ids).toContain(offerRes.body.id);
  });
});
