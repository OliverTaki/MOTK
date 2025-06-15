// src/components/TaskForm.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Shot, Asset, Userデータの型定義 (タスクフォーム内で選択するために必要)
interface Shot {
  id: number;
  name: string;
  project_id: number;
}

interface Asset {
  id: number;
  name: string;
  project_id: number;
}

interface User {
  id: number;
  username: string;
}

interface Task { // 依存タスク選択用
  id: number;
  name: string;
}

// フォームのプロパティの型定義
interface TaskFormProps {
  onSuccess: () => void; // タスク作成成功時に呼び出すコールバック関数
}

const TaskForm: React.FC<TaskFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<string>('todo');
  const [assignedToId, setAssignedToId] = useState<number | ''>('');
  const [selectedParentType, setSelectedParentType] = useState<'shot' | 'asset' | ''>(''); // 親の種類を選択
  const [parentId, setParentId] = useState<number | ''>(''); // 親のID (shot_id or asset_id)
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]); // 選択された依存タスクID

  const [shots, setShots] = useState<Shot[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]); // 全タスクをロードし、依存タスク選択肢に使う

  const [loadingParents, setLoadingParents] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 親エンティティ、ユーザー、全タスクリストをフェッチ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shotsRes, assetsRes, usersRes, tasksRes] = await Promise.all([
          axios.get<Shot[]>('http://127.0.0.1:8000/shots/'),
          axios.get<Asset[]>('http://127.0.0.1:8000/assets/'),
          axios.get<User[]>('http://127.0.0.1:8000/users/'),
          axios.get<Task[]>('http://127.0.0.1:8000/tasks/') // 全タスク取得
        ]);
        setShots(shotsRes.data);
        setAssets(assetsRes.data);
        setUsers(usersRes.data);
        setAllTasks(tasksRes.data);

        // デフォルト選択
        if (shotsRes.data.length > 0) {
          setSelectedParentType('shot');
          setParentId(shotsRes.data[0].id);
        } else if (assetsRes.data.length > 0) {
          setSelectedParentType('asset');
          setParentId(assetsRes.data[0].id);
        }

        if (usersRes.data.length > 0) {
          setAssignedToId(usersRes.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching data for task form:', err);
        setFetchError('Failed to load required data (shots, assets, users, tasks). Please ensure they are created.');
      } finally {
        setLoadingParents(false);
      }
    };

    fetchData();
  }, []);

  const handleParentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'shot' | 'asset' | '';
    setSelectedParentType(type);
    if (type === 'shot' && shots.length > 0) {
      setParentId(shots[0].id);
    } else if (type === 'asset' && assets.length > 0) {
      setParentId(assets[0].id);
    } else {
      setParentId('');
    }
  };

  const handleDependencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions).map(option => Number(option.value));
    setSelectedDependencies(options);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!parentId || !selectedParentType) {
      setError('Please select a parent (shot or asset).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload: any = {
      name,
      status,
      assigned_to_id: assignedToId || null,
      dependencies: selectedDependencies // ここで 'dependencies' というキー名で送る
    };

    if (selectedParentType === 'shot') {
      payload.shot_id = Number(parentId);
      payload.asset_id = null;
    } else {
      payload.asset_id = Number(parentId);
      payload.shot_id = null;
    }

    try {
      await axios.post('http://127.0.0.1:8000/tasks/', payload);
      setSuccess('Task created successfully!');
      setName('');
      setStatus('todo');
      // assignedToId, selectedParentType, parentId, selectedDependencies はリセットしない
      onSuccess();
    } catch (err: any) {
      console.error('Error creating task:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Failed to create task: ${err.response.data.detail}`);
      } else {
        setError('Failed to create task. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingParents) {
    return <div>Loading data for task form...</div>;
  }

  if (fetchError) {
    return <div style={{ color: 'red' }}>Error: {fetchError}</div>;
  }

  const availableParents = selectedParentType === 'shot' ? shots : assets;

  if (shots.length === 0 && assets.length === 0) {
    return <div style={{ color: 'orange' }}>Please create at least one shot or asset before creating a task.</div>;
  }
  if (users.length === 0) {
    return <div style={{ color: 'orange' }}>Please create at least one user in the Users page before creating a task.</div>;
  }


  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
      <h3>Create New Task</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="taskName" style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
          <input
            type="text"
            id="taskName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: 'calc(100% - 20px)', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="taskStatus" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
          <select
            id="taskStatus"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="assignedTo" style={{ display: 'block', marginBottom: '5px' }}>Assigned To:</label>
          <select
            id="assignedTo"
            value={assignedToId}
            onChange={(e) => setAssignedToId(Number(e.target.value))}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Parent Type:</label>
          <select
            value={selectedParentType}
            onChange={handleParentTypeChange}
            required
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
          >
            <option value="">-- Select Type --</option>
            {shots.length > 0 && <option value="shot">Shot</option>}
            {assets.length > 0 && <option value="asset">Asset</option>}
          </select>
        </div>
        {selectedParentType && (
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="parentId" style={{ display: 'block', marginBottom: '5px' }}>Select Parent:</label>
            <select
              id="parentId"
              value={parentId}
              onChange={(e) => setParentId(Number(e.target.value))}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px' }}
            >
              {availableParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} (Project: {parent.project_id})
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="dependencies" style={{ display: 'block', marginBottom: '5px' }}>Depends On Tasks (Ctrl/Cmd + Click to select multiple):</label>
          <select
            id="dependencies"
            multiple
            value={selectedDependencies.map(String)} // valueはstring[]である必要がある
            onChange={handleDependencyChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', minHeight: '100px' }}
          >
            {allTasks
              .filter(task => task.id !== (isNaN(Number(parentId)) ? 0 : Number(parentId))) // 自分自身を依存タスクにできない
              .map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name} (ID: {task.id})
                </option>
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
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {success && <p style={{ color: 'green', marginTop: '10px' }}>{success}</p>}
    </div>
  );
};

export default TaskForm;