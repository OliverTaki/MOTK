// src/components/ProjectForm.tsx
import React, { useState, useEffect } from 'react'; // useEffect をインポート
import axios from 'axios';

// Organizationデータの型定義（プロジェクトフォーム内で組織を選択するために必要）
interface Organization {
  id: number;
  name: string;
}

// フォームのプロパティの型定義
interface ProjectFormProps {
  onSuccess: () => void; // プロジェクト作成成功時に呼び出すコールバック関数
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [organizationId, setOrganizationId] = useState<number | ''>(''); // 組織ID
  const [status, setStatus] = useState<string>('active');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [organizations, setOrganizations] = useState<Organization[]>([]); // 組織リストを保持
  const [loadingOrganizations, setLoadingOrganizations] = useState<boolean>(true); // 組織リストのロード状態
  const [fetchError, setFetchError] = useState<string | null>(null); // 組織リスト取得エラー

  const [loading, setLoading] = useState<boolean>(false); // フォーム送信中のローディング
  const [error, setError] = useState<string | null>(null); // フォーム送信エラー
  const [success, setSuccess] = useState<string | null>(null); // フォーム送信成功

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
        console.error('Error fetching organizations for form:', err);
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
      await axios.post('http://127.0.0.1:8000/projects/', {
        name,
        organization_id: Number(organizationId), // Numberに変換
        status,
        start_date: startDate || null, // 空文字列の場合はnullを送信
        end_date: endDate || null,     // 空文字列の場合はnullを送信
      });
      setSuccess('Project created successfully!');
      setName('');
      // organizationId はそのまま維持しても良いし、リセットしても良い
      setStatus('active');
      setStartDate('');
      setEndDate('');
      onSuccess(); // 親コンポーネントに成功を通知
    } catch (err: any) {
      console.error('Error creating project:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Failed to create project: ${err.response.data.detail}`);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrganizations) {
    return <div>Loading organizations for project form...</div>;
  }

  if (fetchError) {
    return <div style={{ color: 'red' }}>Error: {fetchError}</div>;
  }

  if (organizations.length === 0) {
    return <div style={{ color: 'orange' }}>Please create at least one organization in the Organizations page before creating a project.</div>;
  }

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
      <h3>Create New Project</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="projectName" style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
          <input
            type="text"
            id="projectName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="projectOrg" style={{ display: 'block', marginBottom: '5px' }}>Organization:</label>
          <select
            id="projectOrg"
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
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="projectStatus" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
          <select
            id="projectStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="projectStartDate" style={{ display: 'block', marginBottom: '5px' }}>Start Date (YYYY-MM-DD):</label>
          <input
            type="date" // HTML5 date input type
            id="projectStartDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="projectEndDate" style={{ display: 'block', marginBottom: '5px' }}>End Date (YYYY-MM-DD):</label>
          <input
            type="date" // HTML5 date input type
            id="projectEndDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
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
          {loading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
};

export default ProjectForm;