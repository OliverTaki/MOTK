// src/components/ProjectsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ProjectForm from './ProjectForm'; // ProjectForm をインポート

// Projectデータの型定義
interface Project {
  id: number;
  name: string;
  status: string;
  organization_id: number;
  start_date?: string;
  end_date?: string;
  organization?: { id: number; name: string; status: string; };
  shots?: any[];
  assets?: any[];
  files?: any[];
}

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // プロジェクトリストをフェッチする関数をuseCallbackでメモ化
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Project[]>('http://127.0.0.1:8000/projects/');
      setProjects(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // プロジェクト作成成功時にリストを再読み込みするハンドラ
  const handleProjectCreated = () => {
    fetchProjects(); // プロジェクトが作成されたら、最新のリストを再取得
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading projects...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Projects</h2>

      {/* プロジェクト作成フォームの表示 */}
      <ProjectForm onSuccess={handleProjectCreated} />

      {/* プロジェクトリストの表示 */}
      {projects.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No projects found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Organization</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => (
              <tr key={proj.id}>
                <td>{proj.id}</td>
                <td>{proj.name}</td>
                <td>{proj.status}</td>
                <td>{proj.organization ? proj.organization.name : 'N/A'}</td>
                <td>{proj.start_date || 'N/A'}</td>
                <td>{proj.end_date || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectsPage;