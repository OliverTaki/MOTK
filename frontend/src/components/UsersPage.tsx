// src/components/UsersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserForm from './UserForm'; // UserForm をインポート

// Userデータの型定義
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  organization_id: number;
  organization?: { id: number; name: string; status: string; };
  tasks_assigned_to_me?: any[];
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<User[]>('http://127.0.0.1:8000/users/');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ユーザー作成成功時にリストを再読み込みするハンドラ
  const handleUserCreated = () => {
    fetchUsers(); // ユーザーが作成されたら、最新のリストを再取得
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading users...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Users</h2>

      {/* ユーザー作成フォームの表示 */}
      <UserForm onSuccess={handleUserCreated} />

      {/* ユーザーリストの表示 */}
      {users.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No users found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.organization ? user.organization.name : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersPage;