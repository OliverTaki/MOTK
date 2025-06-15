// src/components/ShotsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ShotForm from './ShotForm';

// Shotデータの型定義
interface Shot {
  id: number;
  name: string;
  project_id: number;
  status: string;
  project?: { id: number; name: string; status: string; };
  tasks?: {id: number; name: string; status: string; }[]; // tasksの簡易表示
  files?: any[];
}

const ShotsPage: React.FC = () => {
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // tasksをロードするように修正（backendのjoinedloadとPydanticスキーマが対応）
      const response = await axios.get<Shot[]>('http://127.0.0.1:8000/shots/'); 
      setShots(response.data);
    } catch (err) {
      console.error('Error fetching shots:', err);
      setError('Failed to load shots. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShots();
  }, [fetchShots]);

  const handleShotCreated = () => {
    fetchShots();
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading shots...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Shots</h2>

      <ShotForm onSuccess={handleShotCreated} />

      {shots.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No shots found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Project</th>
              <th>Tasks</th> {/* 新しく追加 */}
            </tr>
          </thead>
          <tbody>
            {shots.map((shot) => (
              <tr key={shot.id}>
                <td>{shot.id}</td>
                <td>{shot.name}</td>
                <td>{shot.status}</td>
                <td>{shot.project ? shot.project.name : 'N/A'}</td>
                <td>
                  {shot.tasks && shot.tasks.length > 0 ? (
                    <ul>
                      {shot.tasks.map(task => (
                        <li key={task.id}>{task.name} ({task.status})</li>
                      ))}
                    </ul>
                  ) : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ShotsPage;