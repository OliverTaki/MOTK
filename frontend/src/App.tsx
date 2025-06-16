import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import ProtectedRoute from './ProtectedRoute';
import ProjectDetailPage from './ProjectDetailPage';

// AG Gridのスタイルシートをアプリケーションのトップレベルでインポートします
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// メインレイアウトコンポーネント
const MainLayout = () => {
  const { logout } = useAuth();
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{ width: '200px', background: '#f4f4f4', padding: '20px', borderRight: '1px solid #ddd' }}>
        <h2 style={{ marginTop: 0 }}>MOTK</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}><Link to="/dashboard">Projects</Link></li>
        </ul>
        <button onClick={logout} style={{ position: 'absolute', bottom: '20px' }}>Logout</button>
      </nav>
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

// Appコンポーネント
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
