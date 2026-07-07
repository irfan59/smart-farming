import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const linkStyle = { display: 'block', padding: '8px 12px', textDecoration: 'none', color: '#1d9e75' };

export default function AdminLayout() {
  const { admin, isSuperadmin, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <nav style={{ width: 200, borderRight: '1px solid #eee', padding: 12 }}>
        <h2 style={{ fontSize: 16 }}>Smart Farming</h2>
        <Link style={linkStyle} to="/">Dashboard</Link>
        <Link style={linkStyle} to="/approvals">Approvals</Link>
        <Link style={linkStyle} to="/farmers">Farmers</Link>
        <Link style={linkStyle} to="/payments">Payments</Link>
        <Link style={linkStyle} to="/master-data">Master data</Link>
        <Link style={linkStyle} to="/announcements">Announcements</Link>
        {isSuperadmin && <Link style={linkStyle} to="/config">Config</Link>}
      </nav>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid #eee' }}>
          <span>{admin?.name}</span>
          <button onClick={onLogout}>Log out</button>
        </header>
        <main style={{ padding: 16 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
