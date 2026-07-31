import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RoleProvider, useRole } from '../context/role-context';
import { AuthProvider } from '../context/auth-context';
import { LoginPage } from '../pages/login.page';
import { AuthCheckPage } from '../pages/auth-check.page';
import { AppLayout } from '../components/app-layout';
import { HomePage } from '../pages/home.page';
import { CompaniesPage } from '../pages/companies.page';
import { OffersPage } from '../pages/offers.page';
import { OfferDetailsPage } from '../pages/offer-details.page';
import { SubmitOfferPage } from '../pages/submit-offer.page';
import { StudentProposalPage } from '../pages/student-proposal.page';
import { AdminOffersPage } from '../pages/admin-offers.page';
import { AdminCompanyFormPage } from '../pages/admin-company-form.page';
import { AdminCompanyDetailPage } from '../pages/admin-company-detail.page';
import { RoleSelectPage } from '../pages/role-select.page';
import { StudentsPage } from '../pages/students.page';
import { StudentsImportPage } from '../pages/students-import.page';
import { CompanyDashboardPage } from '../pages/company-dashboard.page';
import { StudentApplicationsPage } from '../pages/student-applications.page';
import { AdminApplicationsPage } from '../pages/admin-applications.page';

function RoleGate({ children }: { children: ReactNode }) {
  const { role } = useRole();
  if (!role) return <Navigate to="/select-role" replace />;
  return <>{children}</>;
}

function RequireWrite({ children }: { children: ReactNode }) {
  const { role } = useRole();
  if (role === 'lecteur') return <Navigate to="/companies" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pilote authentification (jalon 1) : isole du reste de l'app, ne remplace pas encore /select-role. */}
      <Route path="/login" element={<AuthProvider><LoginPage /></AuthProvider>} />
      <Route path="/auth-check" element={<AuthProvider><AuthCheckPage /></AuthProvider>} />

      <Route path="/select-role" element={<RoleSelectPage />} />
      <Route
        path="/"
        element={
          <RoleGate>
            <AppLayout />
          </RoleGate>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="offers/new" element={<RequireWrite><SubmitOfferPage /></RequireWrite>} />
        <Route path="offers/proposal" element={<RequireWrite><StudentProposalPage /></RequireWrite>} />
        <Route path="offers/:id/edit" element={<RequireWrite><SubmitOfferPage /></RequireWrite>} />
        <Route path="offers/:id" element={<OfferDetailsPage />} />
        <Route path="admin/offers" element={<AdminOffersPage />} />
        <Route path="admin/companies/new" element={<RequireWrite><AdminCompanyFormPage /></RequireWrite>} />
        <Route path="admin/companies/:id" element={<AdminCompanyDetailPage />} />
        <Route path="admin/students" element={<StudentsPage />} />
        <Route path="admin/students/import" element={<RequireWrite><StudentsImportPage /></RequireWrite>} />
        <Route path="company/dashboard" element={<CompanyDashboardPage />} />
        <Route path="student/applications" element={<StudentApplicationsPage />} />
        <Route path="admin/applications" element={<AdminApplicationsPage />} />
        <Route path="*" element={<p>Page non trouvée.</p>} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppRoutes />
      </RoleProvider>
    </BrowserRouter>
  );
}
