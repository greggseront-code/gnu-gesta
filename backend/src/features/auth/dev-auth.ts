import type { Database } from 'better-sqlite3';
import { findCompanyByIdAny } from '../companies/companies.queries';
import { findStudentById } from '../students/students.queries';
import type { DevAuthConfig } from './auth.config';
import type { ImpersonationState, SessionUser } from './auth.types';

export const DEV_AUTH_FIXTURE_NAMES = ['manager', 'reader', 'student-alice', 'student-bob', 'company'] as const;
export type DevAuthFixtureName = (typeof DEV_AUTH_FIXTURE_NAMES)[number];

export interface DevAuthFixtureInfo {
  name: DevAuthFixtureName;
  label: string;
  description: string;
}

export interface DevAuthSession {
  user: SessionUser;
  impersonation?: ImpersonationState;
}

interface StudentFixtureDefinition {
  name: Extract<DevAuthFixtureName, 'student-alice' | 'student-bob'>;
  studentId: number;
  label: string;
  description: string;
}

const STUDENT_FIXTURES: StudentFixtureDefinition[] = [
  {
    name: 'student-alice',
    studentId: 1,
    label: 'Étudiante — fiche locale 1',
    description: 'Teste la visibilité des offres et les candidatures étudiantes.',
  },
  {
    name: 'student-bob',
    studentId: 2,
    label: 'Étudiant — fiche locale 2',
    description: 'Deuxième identité étudiante pour vérifier les cloisonnements.',
  },
];

function baseUser(config: DevAuthConfig, fixture: string, email: string, displayName: string, baseRole: SessionUser['baseRole'], entityId: number | null): SessionUser {
  return {
    tid: 'dev-local',
    oid: `dev-${fixture}`,
    email,
    displayName,
    baseRole,
    entityId,
    status: 'ok',
  };
}

export function listDevAuthFixtures(db: Database, config: DevAuthConfig): DevAuthFixtureInfo[] {
  const fixtures: DevAuthFixtureInfo[] = [
    {
      name: 'manager',
      label: 'Gestionnaire',
      description: 'Accès complet de gestion et changement de rôle temporaire.',
    },
    {
      name: 'reader',
      label: 'Lecteur',
      description: 'Accès en lecture seule aux données autorisées.',
    },
  ];

  for (const definition of STUDENT_FIXTURES) {
    const student = findStudentById(db, definition.studentId);
    if (student) {
      fixtures.push({
        name: definition.name,
        label: `${definition.label} — ${student.first_name} ${student.last_name}`,
        description: definition.description,
      });
    }
  }

  const company = findCompanyByIdAny(db, 1);
  if (company) {
    fixtures.push({
      name: 'company',
      label: `Entreprise — ${company.name}`,
      description: 'Gestionnaire incarné en entreprise pour tester le dépôt d’offres.',
    });
  }

  return fixtures;
}

export function buildDevAuthSession(
  db: Database,
  config: DevAuthConfig,
  fixture: DevAuthFixtureName,
): DevAuthSession | null {
  if (fixture === 'manager') {
    return {
      user: baseUser(config, fixture, config.GESTA_MANAGER_EMAIL, 'Gestionnaire local', 'gestionnaire', null),
    };
  }

  if (fixture === 'reader') {
    return {
      user: baseUser(config, fixture, 'reader@local.test', 'Lecteur local', 'lecteur', null),
    };
  }

  if (fixture === 'company') {
    const company = findCompanyByIdAny(db, 1);
    if (!company) return null;
    return {
      user: baseUser(config, fixture, config.GESTA_MANAGER_EMAIL, 'Gestionnaire local', 'gestionnaire', null),
      impersonation: { kind: 'company', entityId: company.id },
    };
  }

  const definition = STUDENT_FIXTURES.find((candidate) => candidate.name === fixture);
  if (!definition) return null;

  const student = findStudentById(db, definition.studentId);
  if (!student) return null;

  return {
    user: baseUser(config, fixture, student.email, `${student.first_name} ${student.last_name}`, 'etudiant', student.id),
  };
}
