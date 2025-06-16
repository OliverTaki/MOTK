import React, { useState, useEffect, useCallback, FormEvent, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from './api';

// --- 型定義 ---
interface Account { id: number; display_name: string; }
interface ProjectMember { id: number; display_name: string; department: string; role: string; account: Account | null; }
interface Shot { id: number; name: string; status: string; }
interface Asset { id: number; name: string; asset_type: string; status: string; }
interface Task { id: number; name: string; status: string; assigned_to: ProjectMember; }
interface ProjectDetails { id: number; name: string; status: string; members: ProjectMember[]; shots: Shot[]; assets: Asset[]; }

// --- タブコンポーネント ---
const TabButton = ({ children, onClick, isActive }: { children: ReactNode, onClick: () => void, isActive: boolean }) => (
    <button onClick={onClick} style={{
        padding: '10px 15px',
        border: 'none',
        borderBottom: isActive ? '2px solid #007bff' : '2px solid transparent',
        background: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: isActive ? 'bold' : 'normal',
        color: isActive ? '#007bff' : '#333'
    }}>
        {children}
    </button>
);

// --- メインコンポーネント ---
const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'shots' | 'assets' | 'tasks' | 'members'>('shots');

    // フォーム用のState
    const [taskFormData, setTaskFormData] = useState({ name: '', link_type: 'shot', link_id: '', assigned_to_id: '' });
    const [shotFormData, setShotFormData] = useState({ name: '' });
    const [assetFormData, setAssetFormData] = useState({ name: '', asset_type: '' });

    const fetchProjectData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
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

    const handleCreateGeneric = async (endpoint: string, data: any, resetForm: () => void) => {
        try {
            await apiClient.post(`/projects/${projectId}/${endpoint}`, data);
            fetchProjectData();
            resetForm();
        } catch (err) { alert(`Failed to create ${endpoint}.`); }
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
            fetchProjectData();
            setTaskFormData({ name: '', link_type: 'shot', link_id: '', assigned_to_id: '' });
        } catch (err) { alert('Failed to create task.'); }
    };

    if (isLoading) return <p>Loading project details...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!project) return <p>Project not found.</p>;

    const linkableItems = taskFormData.link_type === 'shot' ? project.shots : project.assets;

    return (
        <div>
            <h1>Project: {project.name}</h1>
            <p>Status: {project.status}</p>

            {/* --- タブナビゲーション --- */}
            <div style={{ borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
                <TabButton onClick={() => setActiveTab('shots')} isActive={activeTab === 'shots'}>Shots ({project.shots.length})</TabButton>
                <TabButton onClick={() => setActiveTab('assets')} isActive={activeTab === 'assets'}>Assets ({project.assets.length})</TabButton>
                <TabButton onClick={() => setActiveTab('tasks')} isActive={activeTab === 'tasks'}>Tasks ({tasks.length})</TabButton>
                <TabButton onClick={() => setActiveTab('members')} isActive={activeTab === 'members'}>Members ({project.members.length})</TabButton>
            </div>

            {/* --- タブコンテンツ --- */}
            <div>
                {activeTab === 'shots' && (
                    <div>
                        <form onSubmit={(e) => { e.preventDefault(); handleCreateGeneric('shots', shotFormData, () => setShotFormData({ name: '' })) }}>
                            <h3>Create New Shot</h3>
                            <input type="text" value={shotFormData.name} onChange={e => setShotFormData({name: e.target.value})} placeholder="Shot Name" required />
                            <button type="submit">Create</button>
                        </form>
                        <table style={{ width: '100%', marginTop: '20px' }}>
                            <thead><tr><th>ID</th><th>Name</th><th>Status</th></tr></thead>
                            <tbody>{project.shots.map(s => <tr key={s.id}><td>{s.id}</td><td>{s.name}</td><td>{s.status}</td></tr>)}</tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'assets' && (
                    <div>
                         <form onSubmit={(e) => { e.preventDefault(); handleCreateGeneric('assets', assetFormData, () => setAssetFormData({ name: '', asset_type: '' })) }}>
                            <h3>Create New Asset</h3>
                            <input type="text" value={assetFormData.name} onChange={e => setAssetFormData({...assetFormData, name: e.target.value})} placeholder="Asset Name" required />
                            <input type="text" value={assetFormData.asset_type} onChange={e => setAssetFormData({...assetFormData, asset_type: e.target.value})} placeholder="Asset Type" required />
                            <button type="submit">Create</button>
                        </form>
                         <table style={{ width: '100%', marginTop: '20px' }}>
                            <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th></tr></thead>
                            <tbody>{project.assets.map(a => <tr key={a.id}><td>{a.id}</td><td>{a.name}</td><td>{a.asset_type}</td><td>{a.status}</td></tr>)}</tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'tasks' && (
                    <div>
                        <form onSubmit={handleCreateTask}>
                            <h3>Create New Task</h3>
                             <input type="text" value={taskFormData.name} onChange={e => setTaskFormData({...taskFormData, name: e.target.value})} placeholder="Task Name" required />
                             <select value={taskFormData.link_type} onChange={e => setTaskFormData({...taskFormData, link_type: e.target.value, link_id: ''})}>
                                <option value="shot">Link to Shot</option>
                                <option value="asset">Link to Asset</option>
                            </select>
                            <select value={taskFormData.link_id} onChange={e => setTaskFormData({...taskFormData, link_id: e.target.value})} required>
                                <option value="">-- Select {taskFormData.link_type} --</option>
                                {linkableItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <select value={taskFormData.assigned_to_id} onChange={e => setTaskFormData({...taskFormData, assigned_to_id: e.target.value})} required>
                                <option value="">-- Assign To Member --</option>
                                {project.members.map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}
                            </select>
                            <button type="submit">Create</button>
                        </form>
                        <table style={{ width: '100%', marginTop: '20px' }}>
                            <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Assigned To</th></tr></thead>
                            <tbody>{tasks.map(t => <tr key={t.id}><td>{t.id}</td><td>{t.name}</td><td>{t.status}</td><td>{t.assigned_to.display_name}</td></tr>)}</tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'members' && (
                     <table style={{ width: '100%' }}>
                        <thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Linked Account</th></tr></thead>
                        <tbody>{project.members.map(m => <tr key={m.id}><td>{m.display_name}</td><td>{m.department}</td><td>{m.role}</td><td>{m.account ? m.account.display_name : 'N/A'}</td></tr>)}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailPage;
