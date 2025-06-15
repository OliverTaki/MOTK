// src/components/AssetForm.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Projectデータの型定義（アセットフォーム内でプロジェクトを選択するために必要）
interface Project {
  id: number;
  name: string;
}

// フォームのプロパティの型定義
interface AssetFormProps {
  onSuccess: () => void; // アセット作成成功時に呼び出すコールバック関数
}

const AssetForm: React.FC<AssetFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [assetType, setAssetType] = useState<string>('character'); // アセットタイプ
  const [projectId, setProjectId] = useState<number | ''>(''); // プロジェクトID
  const [status, setStatus] = useState<string>('pending');

  const [projects, setProjects] = useState<Project[]>([]); // プロジェクトリストを保持
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true); // プロジェクトリストのロード状態
  const [fetchError, setFetchError] = useState<string | null>(null); // プロジェクトリスト取得エラー

  const [loading, setLoading] = useState<boolean>(false); // フォーム送信中のローディング
  const [error, setError] = useState<string | null>(null); // フォーム送信エラー
  const [success, setSuccess] = useState<string | null>(null); // フォーム送信成功

  // プロジェクトリストをフェッチする
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get<Project[]>('http://127.0.0.1:8000/projects/');
        setProjects(response.data);
        if (response.data.length > 0) {
          setProjectId(response.data[0].id); // 最初のプロジェクトをデフォルトで選択
        }
      } catch (err) {
        console.error('Error fetching projects for form:', err);
        setFetchError('Failed to load projects for selection. Please create at least one project first.');
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!projectId) {
      setError('Please select a project.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.post('http://127.0.0.1:8000/assets/', {
        name,
        asset_type: assetType, // アセットタイプを追加
        project_id: Number(projectId),
        status,
      });
      setSuccess('Asset created successfully!');
      setName('');
      setAssetType('character'); // リセット
      setStatus('pending');
      onSuccess(); // 親コンポーネントに成功を通知
    } catch (err: any) {
      console.error('Error creating asset:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Failed to create asset: ${err.response.data.detail}`);
      } else {
        setError('Failed to create asset. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingProjects) {
    return <div>Loading projects for asset form...</div>;
  }

  if (fetchError) {
    return <div style={{ color: 'red' }}>Error: {fetchError}</div>;
  }

  if (projects.length === 0) {
    return <div style={{ color: 'orange' }}>Please create at least one project in the Projects page before creating an asset.</div>;
  }

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
      <h3>Create New Asset</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="assetName" style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
          <input
            type="text"
            id="assetName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="assetType" style={{ display: 'block', marginBottom: '5px' }}>Type:</label>
          <select
            id="assetType"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="character">Character</option>
            <option value="prop">Prop</option>
            <option value="environment">Environment</option>
            <option value="vehicle">Vehicle</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="assetProject" style={{ display: 'block', marginBottom: '5px' }}>Project:</label>
          <select
            id="assetProject"
            value={projectId}
            onChange={(e) => setProjectId(Number(e.target.value))}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="assetStatus" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
          <select
            id="assetStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="on_hold">On Hold</option>
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
          {loading ? 'Creating...' : 'Create Asset'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
};

export default AssetForm;