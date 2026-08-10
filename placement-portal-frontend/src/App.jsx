import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { ROLES } from "./utils/constants";

// Public Pages
import LandingPage from "./pages/public/LandingPage";
import ContactUsPage from "./pages/public/ContactUsPage";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignupEmailPage from "./pages/auth/SignupEmailPage";
import SignupOtpPage from "./pages/auth/SignupOtpPage";
import SignupPasswordPage from "./pages/auth/SignupPasswordPage";
import ForgotPasswordEmailPage from "./pages/auth/ForgotPasswordEmailPage";
import ForgotPasswordOtpPage from "./pages/auth/ForgotPasswordOtpPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

// Shared Pages
import ProfilePage from "./pages/shared/ProfilePage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

// Student Pages
import OnboardingPage from "./pages/student/OnboardingPage";
import FeeReceiptUploadPage from "./pages/student/FeeReceiptUploadPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import DrivesListPage from "./pages/student/DrivesListPage";
import DriveDetailPage from "./pages/student/DriveDetailPage";
import TestPrecheckPage from "./pages/student/TestPrecheckPage";
import TestAttemptPage from "./pages/student/TestAttemptPage";
import TestResultsPage from "./pages/student/TestResultsPage";
import StudentTestsPage from "./pages/student/StudentTestsPage";
import TpoCreateTestPage from "./pages/tpo/TpoCreateTestPage";
import TpoTestAuditPage from "./pages/tpo/TpoTestAuditPage";
import ApplicationsTrackerPage from "./pages/student/ApplicationsTrackerPage";
import ResourcesLibraryPage from "./pages/student/ResourcesLibraryPage";

// TPO Pages
import TpoDashboard from "./pages/tpo/TpoDashboard";
import ManageDrivesPage from "./pages/tpo/ManageDrivesPage";
import TpoDriveDetailPage from "./pages/tpo/TpoDriveDetailPage";
import AllStudentsPage from "./pages/tpo/AllStudentsPage";
import PastTestsPage from "./pages/tpo/PastTestsPage";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminDrivesPage from "./pages/admin/AdminDrivesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Temporary placeholder for unbuilt TPO/Admin pages
function FoundationNotice({ label }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
      <p className="font-heading text-base font-semibold text-neutral-700">{label}</p>
      <p className="mt-1 text-sm">Pages for this route are built in a later phase.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup/email" element={<SignupEmailPage />} />
            <Route path="/signup/otp" element={<SignupOtpPage />} />
            <Route path="/signup/password" element={<SignupPasswordPage />} />
            <Route path="/forgot-password/email" element={<ForgotPasswordEmailPage />} />
            <Route path="/forgot-password/otp" element={<ForgotPasswordOtpPage />} />
            <Route path="/forgot-password/reset" element={<ResetPasswordPage />} />

            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
              <Route path="/student/onboarding" element={<OnboardingPage />} />
              <Route path="/student/tests/:id/attempt" element={<TestAttemptPage />} />
              <Route element={<DashboardLayout />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/fee-receipt" element={<FeeReceiptUploadPage />} />
                <Route path="/student/drives" element={<DrivesListPage />} />
                <Route path="/student/drives/:id" element={<DriveDetailPage />} />
                <Route path="/student/tests" element={<StudentTestsPage />} />
                <Route path="/student/applications" element={<ApplicationsTrackerPage />} />
                <Route path="/student/resources" element={<ResourcesLibraryPage />} />
                <Route path="/student/profile" element={<ProfilePage />} />
                <Route path="/student/change-password" element={<ChangePasswordPage />} />
                <Route path="/student/tests/:id/precheck" element={<TestPrecheckPage />} />
                <Route path="/student/tests/:id/results" element={<TestResultsPage />} />
                
                {/* Fallback for unbuilt student features (Phase 7) */}
                <Route path="/student/*" element={<FoundationNotice label="Student Feature" />} />
              </Route>
            </Route>

            {/* TPO Routes */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.TPO]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/tpo/dashboard" element={<TpoDashboard />} />
                <Route path="/tpo/drives" element={<ManageDrivesPage />} />
                <Route path="/tpo/drives/:id" element={<TpoDriveDetailPage />} />
                <Route path="/tpo/students" element={<AllStudentsPage />} />
                <Route path="/tpo/tests" element={<PastTestsPage />} />
                <Route path="/tpo/tests/create" element={<TpoCreateTestPage />} />
                <Route path="/tpo/tests/attempts/:attemptId/violations" element={<TpoTestAuditPage />} />
                <Route path="/tpo/instant-tests/history" element={<PastTestsPage />} />
                <Route path="/tpo/profile" element={<ProfilePage />} />
                <Route path="/tpo/change-password" element={<ChangePasswordPage />} />
                <Route path="/tpo/*" element={<FoundationNotice label="TPO Feature" />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/students" element={<AdminStudentsPage />} />
                <Route path="/admin/drives" element={<AdminDrivesPage />} />
                <Route path="/admin/profile" element={<ProfilePage />} />
                <Route path="/admin/change-password" element={<ChangePasswordPage />} />
                <Route path="/admin/*" element={<FoundationNotice label="Admin Dashboard" />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
