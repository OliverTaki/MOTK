// src/components/OrganizationsPage.tsx
import React, { useState, useEffect, useCallback } from 'react'; // useCallback をインポート
import axios from 'axios';
import OrganizationForm from './OrganizationForm'; // OrganizationForm をインポート

// Organizationデータの型定義
interface Organization {
  id: number;
  name: string;
  status: string;
  projects?: any[]; 
  users?: any[];
}

const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 組織リストをフェッチする関数をuseCallbackでメモ化
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Organization[]>('http://127.0.0.1:8000/organizations/');
      setOrganizations(response.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []); // 依存配列が空なので、この関数はコンポーネントのライフサイクル中に一度だけ作成される

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]); // fetchOrganizationsが変更された時に実行（初回マウント時）

  // 組織作成成功時にリストを再読み込みするハンドラ
  const handleOrganizationCreated = () => {
    fetchOrganizations(); // 組織が作成されたら、最新のリストを再取得
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading organizations...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Organizations</h2>

      {/* 組織作成フォームの表示 */}
      <OrganizationForm onSuccess={handleOrganizationCreated} />

      {/* 組織リストの表示 */}
      {organizations.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No organizations found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id}>
                <td>{org.id}</td>
                <td>{org.name}</td>
                <td>{org.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrganizationsPage;