import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listStudents } from '../features/students/students.api';
import type { Student } from '../features/students/students.types';
import { useAuth } from '../context/auth-context';

export function StudentsPage() {
  const { role } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStudents()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.email} ${s.matricule ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Étudiants</h1>
        {role === 'gestionnaire' && (
          <Link to="/admin/students/import" className="btn btn-primary">
            Importer (.xlsx)
          </Link>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <input
            className="search-input"
            placeholder="Rechercher par nom, email ou matricule…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="text-muted" style={{ fontSize: '0.8125rem' }}>
            {filtered.length} étudiant{filtered.length !== 1 ? 's' : ''}
          </span>
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
              {loading ? (
                <tr><td colSpan={5} className="table-empty">Chargement…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="table-empty">Aucun étudiant trouvé.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="text-muted">{s.matricule ?? '—'}</td>
                    <td>{s.last_name}</td>
                    <td>{s.first_name}</td>
                    <td className="text-muted">{s.email}</td>
                    <td className="text-muted">{s.date_naissance ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
