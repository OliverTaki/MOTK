import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from './api';

// --- 型定義の更新 ---
interface Account { id: number; display_name: string; }
interface ProjectMember { id: number; display_name: string; department: string; role: string; account: Account | null; }
interface Shot { id: number; name: string; status: string; }
interface Asset { id: number; name: string; asset_type: string; status: string; }
interface Task { id: number; name: string; status: string; assigned_to: ProjectMember; }
interface ProjectDetails { id: number; name: string; status: string; members: ProjectMember[]; shots: Shot[]; assets: Asset[]; }

// --- フォームコンポーネント ---
// (再利用のため、変更なし)
interface FormField { name: string; label: string; placeholder: string; required?: boolean; }
const CreationForm = ({ title, fields, onSubmit, children }: { title: string, fields: FormField[], onSubmit: (data: any) => void, children?: React.ReactNode }) => {
    const [formData, setFormData] = useState<any>({});
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setFormData({});
    };
    return (
        <form onSubmit={handleSubmit} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>{title}</h3>
            {fields.map(field => (
                <div key={field.name} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>{field.label}</label>
                    <input type="text" value={formData[field.name] || ''} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder} required={field.required} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>
            ))}
            {children}
            <button type="submit">Create</button>
        </form>
    );
};

// --- メインコンポーネント ---
const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]); // タスク用のStateを追加
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- タスク作成フォーム用のState ---
    const [taskFormData, setTaskFormData] = useState({
        name: '',
        link_type: 'shot', // 'shot' or 'asset'
        link_id: '',
        assigned_to_id: ''
    });

    const fetchProjectData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            // プロジェクト詳細とタスク一覧を並行して取得
            const [detailsRes, tasksRes] = await Promise.all([
                apiClient.get<ProjectDetails>(`/projects/${projectId}`),
                apiClient.get<Task[]>(`/tasks/project/${projectId}`)
            ]);
            setProject(detailsRes.data);
            setTasks(tasksRes.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch project data.');
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    const handleCreateShot = async (data: { name: string }) => {
        try { await apiClient.post(`/projects/${projectId}/shots`, data); fetchProjectData(); } 
        catch (err) { alert('Failed to create shot.'); }
    };
    
    const handleCreateAsset = async (data: { name: string; asset_type: string }) => {
        try { await apiClient.post(`/projects/${projectId}/assets`, data); fetchProjectData(); }
        catch (err) { alert('Failed to create asset.'); }
    };

    const handleCreateTask = async (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            name: taskFormData.name,
            assigned_to_id: parseInt(taskFormData.assigned_to_id),
            shot_id: taskFormData.link_type === 'shot' ? parseInt(taskFormData.link_id) : null,
            asset_id: taskFormData.link_type === 'asset' ? parseInt(taskFormData.link_id) : null,
        };
        try {
            await apiClient.post('/tasks/', payload);
            fetchProjectData(); // データ再取得
            setTaskFormData({ name: '', link_type: 'shot', link_id: '', assigned_to_id: '' }); // フォームリセット
        } catch (err) {
            alert('Failed to create task. Check if all fields are correct.');
        }
    };

    if (isLoading) return <p>Loading project details...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!project) return <p>Project not found.</p>;

    const linkableItems = taskFormData.link_type === 'shot' ? project.shots : project.assets;

    return (
        <div>
            <h1>Project: {project.name}</h1>
            <p>Status: {project.status}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
                <CreationForm title="Create Shot" fields={[{ name: 'name', label: 'Shot Name', placeholder: 'e.g., sc010_0010', required: true }]} onSubmit={handleCreateShot} />
                <CreationForm title="Create Asset" fields={[{ name: 'name', label: 'Asset Name', placeholder: 'e.g., Hero_Sword', required: true }, { name: 'asset_type', label: 'Asset Type', placeholder: 'e.g., Prop', required: true }]} onSubmit={handleCreateAsset} />
                
                {/* Task作成フォーム */}
                <form onSubmit={handleCreateTask} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0 }}>Create New Task</h3>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Task Name</label>
                        <input type="text" value={taskFormData.name} onChange={e => setTaskFormData({...taskFormData, name: e.target.value})} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Link To</label>
                        <select value={taskFormData.link_type} onChange={e => setTaskFormData({...taskFormData, link_type: e.target.value, link_id: ''})} style={{ width: '100%', padding: '8px' }}>
                            <option value="shot">Shot</option>
                            <option value="asset">Asset</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>{taskFormData.link_type === 'shot' ? 'Select Shot' : 'Select Asset'}</label>
                        <select value={taskFormData.link_id} onChange={e => setTaskFormData({...taskFormData, link_id: e.target.value})} required style={{ width: '100%', padding: '8px' }}>
                            <option value="">-- Select --</option>
                            {linkableItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Assign To</label>
                        <select value={taskFormData.assigned_to_id} onChange={e => setTaskFormData({...taskFormData, assigned_to_id: e.target.value})} required style={{ width: '100%', padding: '8px' }}>
                            <option value="">-- Select Member --</option>
                            {project.members.map(member => <option key={member.id} value={member.id}>{member.display_name} ({member.role})</option>)}
                        </select>
                    </div>
                    <button type="submit">Create Task</button>
                </form>
            </div>

            <hr style={{ margin: '20px 0' }} />
            
            <h2>Tasks ({tasks.length})</h2>
            <table style={{ width: '100%' }}>
                <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Assigned To</th></tr></thead>
                <tbody>{tasks.map(t => <tr key={t.id}><td>{t.id}</td><td>{t.name}</td><td>{t.status}</td><td>{t.assigned_to.display_name}</td></tr>)}</tbody>
            </table>

            <hr style={{ margin: '20px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                    <h2>Shots ({project.shots.length})</h2>
                    <table style={{ width: '100%' }}>
                        <thead><tr><th>ID</th><th>Name</th><th>Status</th></tr></thead>
                        <tbody>{project.shots.map(s => <tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.status}</td></tr>)}</tbody>
                    </table>
                </div>
                <div>
                    <h2>Assets ({project.assets.length})</h2>
                     <table style={{ width: '100%' }}>
                        <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th></tr></thead>
                        <tbody>{project.assets.map(a => <tr key={a.id}><td>{a.id}</td><td>{a.name}</td><td>{a.asset_type}</td><td>{a.status}</td></tr>)}</tbody>
                    </table>
                </div>
            </div>

            <hr style={{ margin: '20px 0' }} />
            
            <h2>Members ({project.members.length})</h2>
            <table style={{ width: '100%' }}>
                <thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Linked Account</th></tr></thead>
                <tbody>{project.members.map(m => <tr key={m.id}><td>{m.display_name}</td><td>{m.department}</td><td>{m.role}</td><td>{m.account ? m.account.display_name : 'N/A'}</td></tr>)}</tbody>
            </table>
        </div>
    );
};

export default ProjectDetailPage;
