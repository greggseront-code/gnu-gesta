import { Router, type Response } from 'express';
import { requireRole } from '../../middlewares/authorization.middleware';
import { HttpError } from '../../lib/http-errors';
import {
  AcademicYearSchema,
  InternshipPreparationSchema,
  InternshipTerminalStatusSchema,
} from './internships.schemas';
import {
  closeInternship,
  confirmInternship,
  deleteInternship,
  getAcademicYears,
  getAnnualInternships,
  getInternship,
  updateInternshipPreparation,
  exportAnnualInternships,
  generateConvention,
  getInternshipDocumentDownload,
  saveSignedConvention,
} from './internships.service';
import multer from 'multer';
import { internshipDocumentUpload, removeInternshipDocument } from './internship-documents.storage';

export const internshipsRouter = Router();

function handleError(error: unknown, res: Response): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...(error.details ? error.details as object : {}) });
    return;
  }
  throw error;
}

internshipsRouter.get('/years', requireRole('gestionnaire', 'lecteur'), (_req, res) => {
  res.json(getAcademicYears());
});

internshipsRouter.get('/', requireRole('gestionnaire', 'lecteur'), (req, res) => {
  const parsed = AcademicYearSchema.safeParse(req.query.academic_year);
  if (!parsed.success) {
    res.status(400).json({ error: 'Une année académique valide est requise.' });
    return;
  }
  res.json(getAnnualInternships(parsed.data));
});

internshipsRouter.get('/export/:academicYear', requireRole('gestionnaire', 'lecteur'), async (req, res) => {
  const parsed = AcademicYearSchema.safeParse(req.params.academicYear);
  if (!parsed.success) {
    res.status(400).json({ error: 'Année académique invalide.' });
    return;
  }
  try {
    const workbook = await exportAnnualInternships(parsed.data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="stages-${parsed.data}.xlsx"`);
    res.send(workbook);
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.get('/:id', requireRole('gestionnaire', 'lecteur'), (req, res) => {
  try {
    res.json(getInternship(Number(req.params.id)));
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.patch('/:id', requireRole('gestionnaire'), (req, res) => {
  const parsed = InternshipPreparationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    res.json(updateInternshipPreparation(Number(req.params.id), parsed.data));
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.post('/:id/generate-convention', requireRole('gestionnaire'), (req, res) => {
  try {
    res.json(generateConvention(Number(req.params.id)));
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.post('/:id/signed-convention', requireRole('gestionnaire'), (req, res) => {
  internshipDocumentUpload.single('file')(req, res, (uploadError) => {
    if (uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'Le fichier dépasse la limite de 5 Mio.' });
      return;
    }
    if (uploadError) {
      res.status(400).json({ error: uploadError instanceof Error ? uploadError.message : 'Fichier refusé.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Fichier manquant.' });
      return;
    }
    try {
      res.json(saveSignedConvention(Number(req.params.id), req.file));
    } catch (error) {
      if (req.file) removeInternshipDocument(req.file.filename);
      handleError(error, res);
    }
  });
});

internshipsRouter.get('/:id/documents/:kind', requireRole('gestionnaire', 'lecteur'), (req, res) => {
  const kind = req.params.kind;
  if (kind !== 'generated' && kind !== 'signed') {
    res.status(404).json({ error: 'Document non trouvé.' });
    return;
  }
  try {
    const download = getInternshipDocumentDownload(Number(req.params.id), kind);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(download.path, download.document.original_name, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Document non disponible.' });
    });
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.post('/:id/confirm', requireRole('gestionnaire'), (req, res) => {
  try {
    res.json(confirmInternship(Number(req.params.id)));
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.post('/:id/terminal-status', requireRole('gestionnaire'), (req, res) => {
  const parsed = InternshipTerminalStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    res.json(closeInternship(Number(req.params.id), parsed.data.status));
  } catch (error) {
    handleError(error, res);
  }
});

internshipsRouter.delete('/:id', requireRole('gestionnaire'), (req, res) => {
  try {
    deleteInternship(Number(req.params.id));
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});
