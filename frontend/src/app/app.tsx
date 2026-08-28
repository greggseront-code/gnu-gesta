import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/auth-context';
import { LoginPage } from '../pages/login.page';
import { AuthCheckPage } from '../pages/auth-check.page';
import { AccountNotLinkedPage } from '../pages/account-not-linked.page';
import { AppLayout } from '../components/app-layout';
import { HomePage } from '../pages/home.page';
import { CompaniesPage } from '../pages/companies.page';
import { OffersPage } from '../pages/offers.page';
import { OfferDetailsPage } from '../pages/offer-details.page';
import { SubmitOfferPage } from '../pages/submit-offer.page';
import { StudentProposalPage } from '../pages/student-proposal.page';
import { AdminOffersPage } from '../pages/admin-offers.page';
import { AdminCompaniesPage } from '../pages/admin-companies.page';
import { AdminCompanyFormPage } from '../pages/admin-company-form.page';
import { AdminCompanyDetailPage } from '../pages/admin-company-detail.page';
import { StudentsPage } from '../pages/students.page';
import { StudentsImportPage } from '../pages/students-import.page';
import { CompanyDashboardPage } from '../pages/company-dashboard.page';
import { StudentApplicationsPage } from '../pages/student-applications.page';
import { AdminApplicationsPage } from '../pages/admin-applications.page';
import { ImpersonationSelectPage } from '../pages/impersonation-select.page';
import { DevLoginPage } from '../pages/dev-login.page';
import { InternshipsPage } from '../pages/internships.page';
import { InternshipDetailPage } from '../pages/internship-detail.page';

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="text-muted" style={{ padding: '2rem' }}>Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'student_not_imported') return <Navigate to="/account-not-linked" replace />;
  return <>{children}</>;
}

function RequireWrite({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role === 'lecteur') return <Navigate to="/companies" replace />;
  return <>{children}</>;
}

function RequireGestionnaireBase({ children }: { children: ReactNode }) {
  const { baseRole } = useAuth();
  if (baseRole !== 'gestionnaire') return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Rôle effectif (pas baseRole) : une incarnation gestionnaire prend le rôle
 * etudiant/entreprise et doit donc rester bloquée hors des écrans de
 * validation, contrairement à RequireGestionnaireBase (voir spec).
 */
function RequireGestionnaireRole({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== 'gestionnaire') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequirePedagogicalRole({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== 'gestionnaire' && role !== 'lecteur') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dev-login" element={<DevLoginPage />} />
      <Route path="/auth-check" element={<AuthCheckPage />} />
      <Route path="/account-not-linked" element={<AccountNotLinkedPage />} />

      <Route
        path="/"
        element={
          <AuthGate>
            <AppLayout />
          </AuthGate>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="offers/new" element={<RequireWrite><SubmitOfferPage /></RequireWrite>} />
        <Route path="offers/proposal" element={<RequireWrite><StudentProposalPage /></RequireWrite>} />
        <Route path="offers/:id/edit" element={<RequireWrite><SubmitOfferPage /></RequireWrite>} />
        <Route path="offers/:id" element={<OfferDetailsPage />} />
        <Route
          path="admin/offers"
          element={
            <RequireGestionnaireRole>
              <AdminOffersPage />
            </RequireGestionnaireRole>
          }
        />
        <Route
          path="admin/companies"
          element={
            <RequireGestionnaireRole>
              <AdminCompaniesPage />
            </RequireGestionnaireRole>
          }
        />
        <Route
          path="admin/companies/new"
          element={
            <RequireGestionnaireRole>
              <AdminCompanyFormPage />
            </RequireGestionnaireRole>
          }
        />
        <Route path="admin/companies/:id" element={<AdminCompanyDetailPage />} />
        <Route path="admin/students" element={<StudentsPage />} />
        <Route path="admin/students/import" element={<RequireWrite><StudentsImportPage /></RequireWrite>} />
        <Route path="company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="student/applications" element={<StudentApplicationsPage />} />
        <Route path="admin/applications" element={<AdminApplicationsPage />} />
        <Route path="internships" element={<RequirePedagogicalRole><InternshipsPage /></RequirePedagogicalRole>} />
        <Route path="internships/:id" element={<RequirePedagogicalRole><InternshipDetailPage /></RequirePedagogicalRole>} />
        <Route
          path="impersonate"
          element={
            <RequireGestionnaireBase>
              <ImpersonationSelectPage />
            </RequireGestionnaireBase>
          }
        />
        <Route path="*" element={<p>Page non trouvée.</p>} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
