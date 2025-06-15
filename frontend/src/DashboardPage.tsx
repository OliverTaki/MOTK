import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import apiClient from './api';
import { Link } from 'react-router-dom'; // Linkコンポーネントをインポート

// APIから返ってくるプロジェクトの型を定義
interface Project {
    id: number;
    name: string;
}

const DashboardPage = () => {
    const { account } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            if (!account) return;

            setIsLoading(true);
            setError('');
            try {
                const response = await apiClient.get<Project[]>('/projects/');
                setProjects(response.data);
            } catch (err) {
                setError('Failed to fetch projects. You may not be a member of any projects yet.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjects();
    }, [account]);

    if (!account) {
        return <p>Loading account details...</p>;
    }

    return (
        <div>
            <h1>Projects</h1>
            <p>Welcome, {account.display_name}! Here are the projects you have access to.</p>
            
            <hr style={{ margin: '20px 0' }} />
            
            {isLoading && <p>Loading projects...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!isLoading && !error && (
                projects.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>ID</th>
                                <th style={{ padding: '8px' }}>Project Name</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((project) => (
                                <tr key={project.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px' }}>{project.id}</td>
                                    <td style={{ padding: '8px' }}>
                                        {/* プロジェクト名をクリック可能なリンクに変更 */}
                                        <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: '#007bff' }}>
                                            {project.name}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>You are not assigned to any projects yet.</p>
                )
            )}
        </div>
    );
};

export default DashboardPage;
