import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { importStudents } from '../features/students/students.api';
import type { StudentInput } from '../features/students/students.types';

type ParseResult =
  | { ok: true; rows: StudentInput[] }
  | { ok: false; error: string };

async function parseExcel(file: File): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        if (raw.length === 0) {
          resolve({ ok: false, error: 'Le fichier ne contient aucune ligne.' });
          return;
        }

        const rows: StudentInput[] = raw.map((r) => {
          let date_naissance: string | undefined;
          const rawDate = r['Date-Naissance'];
          if (typeof rawDate === 'number') {
            const d = XLSX.SSF.parse_date_code(rawDate);
            date_naissance = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
          } else if (typeof rawDate === 'string' && rawDate) {
            date_naissance = rawDate.split('T')[0];
          }

          return {
            matricule: String(r['Matricule'] ?? '').trim() || undefined,
            last_name: String(r['Nom'] ?? '').trim(),
            first_name: String(r['Prénom'] ?? '').trim(),
            email: String(r['Email'] ?? '').trim(),
            date_naissance,
          };
        });

        const invalid = rows.filter((r) => !r.email || !r.last_name || !r.first_name);
        if (invalid.length > 0) {
          resolve({
            ok: false,
            error: `${invalid.length} ligne(s) avec des champs obligatoires manquants (Nom, Prénom, Email).`,
          });
          return;
        }

        resolve({ ok: true, rows });
      } catch {
        resolve({ ok: false, error: "Impossible de lire le fichier. Vérifiez qu'il s'agit d'un fichier Excel (.xlsx)." });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function StudentsImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<StudentInput[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setPreview(null);
    setParseError(null);
    setResult(null);
    setImportError(null);

    const parsed = await parseExcel(file);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }
    setPreview(parsed.rows);
  }

  async function handleImport() {
    if (!preview) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await importStudents(preview);
      setResult(res);
      setPreview(null);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setImportError(String(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Import des étudiants</h1>
          <p className="page-subtitle">
            <Link to="/admin/students">Étudiants</Link> / Import
          </p>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sélectionner un fichier Excel</span>
          </div>
          <div className="card-body">
            <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              Format attendu : fichier <strong>.xlsx</strong> avec les colonnes{' '}
              <code>Matricule</code>, <code>Nom</code>, <code>Prénom</code>, <code>Email</code>, <code>Date-Naissance</code>.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFile}
              style={{ display: 'none' }}
              id="file-input"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Choisir un fichier
              </label>
              {fileName && <span className="text-muted">{fileName}</span>}
            </div>
          </div>
        </div>

        {parseError && (
          <div className="alert alert-error">{parseError}</div>
        )}

        {result && (
          <div className="alert alert-success">
            <strong>{result.imported} étudiant{result.imported !== 1 ? 's' : ''} importé{result.imported !== 1 ? 's' : ''}.</strong>
            {' '}
            <Link to="/admin/students">Voir la liste →</Link>
          </div>
        )}

        {importError && (
          <div className="alert alert-error">{importError}</div>
        )}

        {preview && preview.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Aperçu — {preview.length} étudiant{preview.length !== 1 ? 's' : ''} détecté{preview.length !== 1 ? 's' : ''}</span>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? 'Import en cours…' : `Importer ${preview.length} étudiant${preview.length !== 1 ? 's' : ''}`}
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Date de naissance</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((s, i) => (
                    <tr key={i}>
                      <td className="text-muted">{s.matricule ?? '—'}</td>
                      <td>{s.last_name}</td>
                      <td>{s.first_name}</td>
                      <td className="text-muted">{s.email}</td>
                      <td className="text-muted">{s.date_naissance ?? '—'}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={5} className="text-muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                        … et {preview.length - 10} autre{preview.length - 10 !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
