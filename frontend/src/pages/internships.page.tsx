import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import {
  internshipExportUrl,
  listAcademicYears,
  listAnnualInternships,
} from '../features/internships/internships.api';
import {
  INTERNSHIP_STATUS_LABELS,
  type AnnualInternshipRow,
} from '../features/internships/internships.types';

function currentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startsThisYear = now.getMonth() > 8 || (now.getMonth() === 8 && now.getDate() >= 15);
  const from = startsThisYear ? year : year - 1;
  return `${from}-${from + 1}`;
}

function displayDate(value: string | null): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-BE') : '—';
}

export function InternshipsPage() {
  const { role } = useAuth();
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState(currentAcademicYear());
  const [rows, setRows] = useState<AnnualInternshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (selectedYear: string) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listAnnualInternships(selectedYear));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([listAcademicYears()])
      .then(([availableYears]) => {
        setYears(availableYears);
        const initial = availableYears.includes(currentAcademicYear())
          ? currentAcademicYear()
          : availableYears[0] ?? currentAcademicYear();
        setYear(initial);
        return loadRows(initial);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
        setLoading(false);
      });
  }, [loadRows]);

  if (role !== 'gestionnaire' && role !== 'lecteur') {
    return <div className="alert alert-error">Cette vue est réservée à l'équipe pédagogique.</div>;
  }

  function handleYear(value: string) {
    setYear(value);
    void loadRows(value);
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stages</h1>
          <p className="page-subtitle">Étudiants éligibles, dossiers et conventions par année académique.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Année académique</span>
            <select className="form-select" value={year} onChange={(event) => handleYear(event.target.value)}>
              {(years.length > 0 ? years : [year]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <a className="btn btn-secondary" href={internshipExportUrl(year)} download={`stages-${year}.xlsx`}>
            Exporter en Excel
          </a>
          {role === 'gestionnaire' && <Link className="btn btn-primary" to="/admin/students/import">Importer des éligibles</Link>}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="card"><div className="card-body table-empty">
          Aucun étudiant éligible n'a encore été importé pour {year}.
          {role === 'gestionnaire' && <> <Link to="/admin/students/import">Importer la liste</Link>.</>}
        </div></div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title">{rows.length} étudiant{rows.length > 1 ? 's' : ''} éligible{rows.length > 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr>
                <th>Matricule</th><th>Étudiant</th><th>Email</th><th>Situation</th><th>État</th>
                <th>Entreprise</th><th>Début</th><th>Fin</th><th>Signataire</th><th></th>
              </tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={`${row.student_id}-${row.internship_id ?? 'none'}`}>
                  <td className="text-muted">{row.matricule ?? '—'}</td>
                  <td><strong>{row.last_name} {row.first_name}</strong></td>
                  <td className="text-muted">{row.email}</td>
                  <td><span className={`badge ${row.has_internship ? 'badge-primary' : 'badge-warning'}`}>
                    {row.has_internship ? 'Avec stage' : 'Sans stage'}
                  </span></td>
                  <td>{row.status ? INTERNSHIP_STATUS_LABELS[row.status] : '—'}</td>
                  <td>{row.company_name ?? '—'}</td>
                  <td>{displayDate(row.start_date)}</td>
                  <td>{displayDate(row.end_date)}</td>
                  <td>{row.signing_contact_name ?? '—'}</td>
                  <td>{row.internship_id && <Link className="btn btn-secondary btn-sm" to={`/internships/${row.internship_id}`}>Ouvrir</Link>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
