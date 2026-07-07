import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function ProtectedRoute({ requireSuperadmin = false }) {
  const { isAuthed, isSuperadmin, ready } = useAuth();
  if (!ready) return null; // brief bootstrap; a spinner could go here
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (requireSuperadmin && !isSuperadmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
