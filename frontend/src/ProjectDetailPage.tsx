import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from './api';

// AG Gridのインポート
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ColDef, CellValueChangedEvent, ICellRendererParams } from 'ag-grid-community';

// モジュール登録
ModuleRegistry.registerModules([ClientSideRowModelModule]);

// --- 型定義 ---
interface Account { id: number; display_name: string; }
interface ProjectMember { id: number; display_name: string; department: string; role: string; account: Account | null; }
interface Shot { id: number; name: string; status: string; }
interface Asset { id: number; name: string; asset_type: string; status: string; }
interface Task { id: number; name: string; status: string; assigned_to: ProjectMember; }
interface ProjectDetails { id: number; name: string; status: string; members: ProjectMember[]; shots: Shot[]; assets: Asset[]; }

// --- タブコンポーネント (変更なし) ---
const TabButton = ({ children, onClick, isActive }: { children: ReactNode, onClick: () => void, isActive: boolean }) => (
    <button onClick={onClick} style={{ padding: '10px 15px', border: 'none', borderBottom: isActive ? '3px solid #007bff' : '3px solid transparent', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#000' : '#555', transition: 'all 0.2s' }}>
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

    // --- データ取得ロジック ---
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

    // --- ★★★ 削除ボタンコンポーネント ★★★ ---
    const DeleteButtonRenderer = (props: ICellRendererParams & { onDelete: (id: number) => void }) => {
        const handleClick = () => {
            // TODO: Add a confirmation dialog for better UX
            props.onDelete(props.data.id);
        };
        return <button onClick={handleClick} style={{color: 'red', background: 'transparent', border: 'none', cursor: 'pointer'}}>Delete</button>;
    };

    // --- 削除ハンドラ ---
    const handleDeleteShot = useCallback(async (shotId: number) => {
        try {
            await apiClient.delete(`/shots/${shotId}`);
            fetchProjectData(); // データを再取得してグリッドを更新
        } catch (error) {
            alert('Failed to delete shot.');
            console.error(error);
        }
    }, [fetchProjectData]);

    // --- AG Gridの列定義 (修正！) ---
    const defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, floatingFilter: true };
    const [shotColDefs] = useState<ColDef[]>([
        { field: 'id', width: 80, editable: false },
        { field: 'name', flex: 1, editable: true },
        { field: 'status', width: 150, editable: true },
        { 
            headerName: 'Actions', 
            width: 100, 
            cellRenderer: (props: ICellRendererParams) => <DeleteButtonRenderer {...props} onDelete={handleDeleteShot} />,
            editable: false,
            sortable: false,
            filter: false,
        }
    ]);
    // (他のColDefsは変更なし)
    const [assetColDefs] = useState<ColDef[]>([ { field: 'id', width: 100 }, { field: 'name', flex: 1 }, { field: 'asset_type', width: 180 }, { field: 'status', width: 150 } ]);
    const [taskColDefs] = useState<ColDef[]>([ { field: 'id', width: 100 }, { field: 'name', flex: 1 }, { field: 'status', width: 150 }, { field: 'assigned_to.display_name', headerName: 'Assigned To', flex: 1 } ]);
    const [memberColDefs] = useState<ColDef[]>([ { field: 'display_name', headerName: 'Name', flex: 1 }, { field: 'department', width: 180 }, { field: 'role', width: 180 }, { field: 'account.display_name', headerName: 'Linked Account', flex: 1, valueFormatter: p => p.value || 'N/A' } ]);

    // --- インライン編集のハンドラ (変更なし) ---
    const onShotCellValueChanged = useCallback(async (event: CellValueChangedEvent) => {
        const { id, ...updatedData } = event.data;
        try { await apiClient.put(`/shots/${id}`, updatedData); } 
        catch (error) { alert('Failed to update shot.'); console.error(error); fetchProjectData(); }
    }, [fetchProjectData]);

    const renderGrid = (rowData: any[], columnDefs: ColDef[], onCellValueChanged?: (event: CellValueChangedEvent) => void) => (
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
            <AgGridReact rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} onCellValueChanged={onCellValueChanged} />
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
                {activeTab === 'shots' && renderGrid(project.shots, shotColDefs, onShotCellValueChanged)}
                {activeTab === 'assets' && renderGrid(project.assets, assetColDefs)}
                {activeTab === 'tasks' && renderGrid(tasks, taskColDefs)}
                {activeTab === 'members' && renderGrid(project.members, memberColDefs)}
            </div>
        </div>
    );
};

export default ProjectDetailPage;
