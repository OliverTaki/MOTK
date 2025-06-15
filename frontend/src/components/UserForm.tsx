// src/components/UserForm.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Organizationデータの型定義（ユーザーフォーム内で組織を選択するために必要）
interface Organization {
  id: number;
  name: string;
}

// フォームのプロパティの型定義
interface UserFormProps {
  onSuccess: () => void; // ユーザー作成成功時に呼び出すコールバック関数
}

const UserForm: React.FC<UserFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('artist');
  const [organizationId, setOrganizationId] = useState<number | ''>('');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 組織リストをフェッチする
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await axios.get<Organization[]>('http://127.0.0.1:8000/organizations/');
        setOrganizations(response.data);
        if (response.data.length > 0) {
          setOrganizationId(response.data[0].id); // 最初の組織をデフォルトで選択
        }
      } catch (err) {
        console.error('Error fetching organizations for user form:', err);
        setFetchError('Failed to load organizations for selection. Please create at least one organization first.');
      } finally {
        setLoadingOrganizations(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organizationId) {
      setError('Please select an organization.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://127.0.0.1:8000/users/', {
        username,
        email,
        role,
        organization_id: Number(organizationId),
      });
      setSuccess('User created successfully!');
      setUsername('');
      setEmail('');
      setRole('artist');
      // organizationId は維持
      onSuccess();
    } catch (err: any) {
      console.error('Error creating user:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Failed to create user: ${err.response.data.detail}`);
      } else {
        setError('Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrganizations) {
    return <div>Loading organizations for user form...</div>;
  }

  if (fetchError) {
    return <div style={{ color: 'red' }}>Error: {fetchError}</div>;
  }

  if (organizations.length === 0) {
    return <div style={{ color: 'orange' }}>Please create at least one organization in the Organizations page before creating a user.</div>;
  }

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
      <h3>Create New User</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>Role:</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="artist">Artist</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="userOrg" style={{ display: 'block', marginBottom: '5px' }}>Organization:</label>
          <select
            id="userOrg"
            value={organizationId}
            onChange={(e) => setOrganizationId(Number(e.target.value))}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
};

export default UserForm;