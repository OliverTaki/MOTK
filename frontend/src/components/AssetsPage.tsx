// src/components/AssetsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AssetForm from './AssetForm';

// Assetデータの型定義
interface Asset {
  id: number;
  name: string;
  asset_type: string;
  project_id: number;
  status: string;
  project?: { id: number; name: string; status: string; };
  tasks?: {id: number; name: string; status: string; }[]; // tasksの簡易表示
  files?: any[];
}

const AssetsPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // tasksをロードするように修正（backendのjoinedloadとPydanticスキーマが対応）
      const response = await axios.get<Asset[]>('http://127.0.0.1:8000/assets/');
      setAssets(response.data);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleAssetCreated = () => {
    fetchAssets();
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading assets...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Assets</h2>

      <AssetForm onSuccess={handleAssetCreated} />

      {assets.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No assets found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Project</th>
              <th>Tasks</th> {/* 新しく追加 */}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.id}</td>
                <td>{asset.name}</td>
                <td>{asset.asset_type}</td>
                <td>{asset.status}</td>
                <td>{asset.project ? asset.project.name : 'N/A'}</td>
                <td>
                  {asset.tasks && asset.tasks.length > 0 ? (
                    <ul>
                      {asset.tasks.map(task => (
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

export default AssetsPage;