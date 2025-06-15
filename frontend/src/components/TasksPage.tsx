// src/components/TasksPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TaskForm from './TaskForm'; // TaskFormをインポート

// Taskデータの型定義 (main.pyのTaskスキーマに対応)
interface Task {
  id: number;
  name: string;
  status: string;
  assigned_to_id?: number;
  shot_id?: number;
  asset_id?: number;
  
  assigned_to?: { id: number; username: string; }; // 関連ユーザー
  shot?: { id: number; name: string; }; // 関連ショット
  asset?: { id: number; name: string; }; // 関連アセット

  dependencies_info?: { id: number; name: string; }[]; // 依存先タスク
  dependent_tasks_info?: { id: number; name: string; }[]; // 依存元タスク
}

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Task[]>('http://127.0.0.1:8000/tasks/');
      setTasks(response.data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please check the backend server and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskCreated = () => {
    fetchTasks(); // タスク作成成功後にリストを再取得
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading tasks...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Tasks</h2>

      {/* タスク作成フォームの表示 */}
      <TaskForm onSuccess={handleTaskCreated} />

      {/* タスクリストの表示 */}
      {tasks.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No tasks found.</p>
      ) : (
        <table style={{ marginTop: '20px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Parent (Shot/Asset)</th>
              <th>Dependencies</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>{task.name}</td>
                <td>{task.status}</td>
                <td>{task.assigned_to ? task.assigned_to.username : 'N/A'}</td>
                <td>
                  {task.shot ? `Shot: ${task.shot.name} (ID: ${task.shot.id})` : ''}
                  {task.asset ? `Asset: ${task.asset.name} (ID: ${task.asset.id})` : ''}
                  {!task.shot && !task.asset ? 'N/A' : ''}
                </td>
                <td>
                  {task.dependencies_info && task.dependencies_info.length > 0 ? (
                    <ul>
                      {task.dependencies_info.map(dep => (
                        <li key={dep.id}>{dep.name} (ID: {dep.id})</li>
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

export default TasksPage;