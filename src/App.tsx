import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { ClaimDetailPage } from "./pages/ClaimDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewClaimPage } from "./pages/NewClaimPage";

function Protected() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/claims/new" element={<NewClaimPage />} />
            <Route path="/claims/:id" element={<ClaimDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

