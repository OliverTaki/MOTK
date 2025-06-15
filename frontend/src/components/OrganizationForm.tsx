// src/components/OrganizationForm.tsx
import React, { useState } from 'react';
import axios from 'axios';

// フォームのプロパティの型定義
interface OrganizationFormProps {
  onSuccess: () => void; // 組織作成成功時に呼び出すコールバック関数
}

const OrganizationForm: React.FC<OrganizationFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<string>('active'); // デフォルト値を設定
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // フォームのデフォルトの送信動作をキャンセル

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // FastAPIバックエンドのAPIエンドポイントにPOSTリクエストを送信
      await axios.post('http://127.0.0.1:8000/organizations/', {
        name,
        status,
      });
      setSuccess('Organization created successfully!');
      setName(''); // フォームをクリア
      setStatus('active'); // ステータスをリセット
      onSuccess(); // 親コンポーネントに成功を通知し、リストを再読み込みさせる
    } catch (err: any) {
      console.error('Error creating organization:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        // バックエンドからの詳細なエラーメッセージを表示
        setError(`Failed to create organization: ${err.response.data.detail}`);
      } else {
        setError('Failed to create organization. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
      <h3>Create New Organization</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="orgName" style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
          <input
            type="text"
            id="orgName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="orgStatus" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
          <select
            id="orgStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
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
          {loading ? 'Creating...' : 'Create Organization'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
};

export default OrganizationForm;