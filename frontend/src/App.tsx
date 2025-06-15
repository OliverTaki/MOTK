// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import OrganizationsPage from './components/OrganizationsPage';
import ProjectsPage from './components/ProjectsPage';
import ShotsPage from './components/ShotsPage';
import AssetsPage from './components/AssetsPage';
import UsersPage from './components/UsersPage';
import TasksPage from './components/TasksPage'; // 新しくインポート
import './App.css'; 

function App() {
  return (
    <Router>
      <div className="container">
        <h1>MOTK Production Management System</h1>
        
        {/* ナビゲーションバー */}
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '20px' }}>
            <li>
              <Link to="/">Organizations</Link>
            </li>
            <li>
              <Link to="/projects">Projects</Link>
            </li>
            <li>
              <Link to="/shots">Shots</Link>
            </li>
            <li>
              <Link to="/assets">Assets</Link>
            </li>
            <li>
              <Link to="/tasks">Tasks</Link> {/* 新しく追加 */}
            </li>
            <li>
              <Link to="/users">Users</Link>
            </li>
            {/* Files, StorageLocationsなどのリンクも追加可能 */}
          </ul>
        </nav>

        <hr />

        {/* ルーティングの設定 */}
        <Routes>
          <Route path="/" element={<OrganizationsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/shots" element={<ShotsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/tasks" element={<TasksPage />} /> {/* 新しく追加 */}
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;