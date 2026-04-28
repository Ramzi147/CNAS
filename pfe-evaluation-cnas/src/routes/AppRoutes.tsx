// src/routes/AppRoutes.tsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Header from "../components/layout/HeaderClean";
import Sidebar from "../components/layout/SidebarClean";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

// Pages
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Evaluations from "../pages/Evaluations";
import EvaluationDetail from "../pages/EvaluationDetail";
import SelfEvaluations from "../pages/SelfEvaluations";
import Campaigns from "../pages/Campaigns";
import Organization from "../pages/Organization";
import JobProfiles from "../pages/JobProfiles";
import FormVersions from "../pages/FormVersions";
import DailyFollowup from "../pages/DailyFollowup";
import Rankings from "../pages/Rankings";
import Reports from "../pages/Reports";
import ComplianceCenter from "../pages/ComplianceCenter";
import AuditLog from "../pages/AuditLog";
import AdminDashboard from "../pages/AdminDashboard";
import HRDashboard from "../pages/HRDashboard";
import ManagerDashboard from "../pages/ManagerDashboard";
import EmployeeDashboard from "../pages/EmployeeDashboard";
import SuperAdminDashboard from "../pages/SuperAdminDashboard";
import UsersAccess from "../pages/UsersAccess";

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="app-shell">
      <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />

      <div className="app-body">
        <Sidebar
          role={user?.role ?? null}
          onLogout={logout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="app-main" onClick={() => setSidebarOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  );
}

function homeByRole(role: string | undefined) {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  if (role === "hr") return "/hr";
  if (role === "manager") return "/manager";
  return "/employee";
}

function DashboardRedirect() {
  const { user } = useAuth();
  const target = homeByRole(user?.role);
  return <Navigate to={target} replace />;
}

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={isAuthenticated ? homeByRole(user?.role) : "/login"}
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={homeByRole(user?.role)} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Shell>
              <Profile />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluations"
        element={
          <ProtectedRoute>
            <Shell>
              <Evaluations />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/organization"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <Organization />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/evaluations/:id"
        element={
          <ProtectedRoute>
            <Shell>
              <EvaluationDetail />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/self-evaluations"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr", "manager", "employee", "agent"]}>
            <Shell>
              <SelfEvaluations />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <Campaigns />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users-access"
        element={
          <ProtectedRoute allow={["superadmin", "admin"]}>
            <Shell>
              <UsersAccess />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/job-profiles"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <JobProfiles />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/form-versions"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <FormVersions />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/daily-followup"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr", "manager"]}>
            <Shell>
              <DailyFollowup />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rankings"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <Rankings />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/compliance"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr", "manager", "employee", "agent"]}>
            <Shell>
              <ComplianceCenter />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr", "manager"]}>
            <Shell>
              <Reports />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit-log"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <AuditLog />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allow={["superadmin"]}>
            <Shell>
              <SuperAdminDashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["superadmin", "admin"]}>
            <Shell>
              <AdminDashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr"
        element={
          <ProtectedRoute allow={["superadmin", "admin", "hr"]}>
            <Shell>
              <HRDashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager"
        element={
          <ProtectedRoute allow={["superadmin", "manager"]}>
            <Shell>
              <ManagerDashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee"
        element={
          <ProtectedRoute allow={["superadmin", "employee", "agent"]}>
            <Shell>
              <EmployeeDashboard />
            </Shell>
          </ProtectedRoute>
        }
      />

      <Route path="/agent" element={<Navigate to="/employee" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
