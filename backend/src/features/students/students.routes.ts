import { Router } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
import { importStudents, listStudents } from './students.service';
import { StudentsImportSchema } from './students.schemas';
import { getApplicationsByStudent } from '../applications/applications.service';

export const studentsRouter = Router();

// GET /api/students — tout rôle authentifié (jalon 4 : ferme l'accès anonyme).
// Volontairement plus large que "gestionnaire seul" : admin-applications
// (lecteur) et company-dashboard (entreprise) l'utilisent comme annuaire de
// référence pour afficher les noms des candidats. Voir la review du jalon 4
// pour le détail de cet écart par rapport à la décision initiale.
studentsRouter.get('/', requireRole('gestionnaire', 'lecteur', 'entreprise'), (_req, res) => {
  res.json(listStudents());
});

// POST /api/students/import — gestionnaire only
studentsRouter.post(
  '/import',
  requireRole('gestionnaire'),
  (req, res) => {
    const result = StudentsImportSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Les données d'import sont invalides.",
        details: result.error.flatten(),
      });
      return;
    }
    res.json({
      imported: importStudents(result.data),
      academic_year: result.data.academic_year,
    });
  },
);

// GET /api/students/:studentId/applications — gestionnaire, lecteur, etudiant (etudiant: own only)
studentsRouter.get(
  '/:studentId/applications',
  requireRole('gestionnaire', 'lecteur', 'etudiant'),
  (req, res) => {
    const studentId = Number(req.params.studentId);

    if (req.auth.role === 'etudiant' && req.auth.entityId !== studentId) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }

    res.json(getApplicationsByStudent(studentId));
  },
);
