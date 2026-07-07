import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FarmersPage from './pages/FarmersPage';
import FarmerDetailPage from './pages/FarmerDetailPage';
import PaymentsPage from './pages/PaymentsPage';
import MasterDataPage from './pages/MasterDataPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ConfigPage from './pages/ConfigPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/approvals" element={<ApprovalsPage />} />
                <Route path="/farmers" element={<FarmersPage />} />
                <Route path="/farmers/:id" element={<FarmerDetailPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/master-data" element={<MasterDataPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute requireSuperadmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/config" element={<ConfigPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
