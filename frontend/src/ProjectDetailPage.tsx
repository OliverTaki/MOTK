import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from './api';

// --- AG Gridのインポート ---
// モジュール登録はagGridSetup.tsで行うので、ここでは不要
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';

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
        padding: '10px 15px', border: 'none', borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent',
        background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: isActive ? 'bold' : 'normal',
        color: isActive ? '#000' : '#555', transition: 'all 0.2s'
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

    // --- AG Gridの列定義 ---
    const defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        floatingFilter: true,
    };
    const [shotColDefs] = useState<ColDef[]>([
        { field: 'id', width: 100 }, { field: 'name', flex: 1 }, { field: 'status', width: 150 }
    ]);
    const [assetColDefs] = useState<ColDef[]>([
        { field: 'id', width: 100 }, { field: 'name', flex: 1 }, { field: 'asset_type', width: 180 }, { field: 'status', width: 150 }
    ]);
    const [taskColDefs] = useState<ColDef[]>([
        { field: 'id', width: 100 }, { field: 'name', flex: 1 }, { field: 'status', width: 150 }, { field: 'assigned_to.display_name', headerName: 'Assigned To', flex: 1 }
    ]);
    const [memberColDefs] = useState<ColDef[]>([
        { field: 'display_name', headerName: 'Name', flex: 1 }, { field: 'department', width: 180 }, { field: 'role', width: 180 }, { field: 'account.display_name', headerName: 'Linked Account', flex: 1, valueFormatter: p => p.value || 'N/A' }
    ]);

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

    const renderGrid = (rowData: any[], columnDefs: ColDef[]) => (
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
            <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
            />
        </div>
    );

    if (isLoading) return <p>Loading project details...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
    if (!project) return <p>Project not found.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h1>Project: {project.name}</h1>
            
            <div style={{ borderBottom: '1px solid #ddd' }}>
                <TabButton onClick={() => setActiveTab('shots')} isActive={activeTab === 'shots'}>Shots ({project.shots.length})</TabButton>
                <TabButton onClick={() => setActiveTab('assets')} isActive={activeTab === 'assets'}>Assets ({project.assets.length})</TabButton>
                <TabButton onClick={() => setActiveTab('tasks')} isActive={activeTab === 'tasks'}>Tasks ({tasks.length})</TabButton>
                <TabButton onClick={() => setActiveTab('members')} isActive={activeTab === 'members'}>Members ({project.members.length})</TabButton>
            </div>

            <div style={{ flex: 1, paddingTop: '20px' }}>
                {activeTab === 'shots' && renderGrid(project.shots, shotColDefs)}
                {activeTab === 'assets' && renderGrid(project.assets, assetColDefs)}
                {activeTab === 'tasks' && renderGrid(tasks, taskColDefs)}
                {activeTab === 'members' && renderGrid(project.members, memberColDefs)}
            </div>
        </div>
    );
};

export default ProjectDetailPage;
