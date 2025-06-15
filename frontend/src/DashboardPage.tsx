import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import apiClient from './api';

const DashboardPage = () => {
    const { account, logout } = useAuth();
    const [projects, setProjects] = useState<any[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await apiClient.get('/projects/');
                setProjects(response.data);
            } catch (err) {
                setError('Failed to fetch projects.');
            }
        };

        if (account) {
            fetchProjects();
        }
    }, [account]);

    if (!account) {
        return <p>Loading account details...</p>;
    }

    return (
        <div>
            <h1>Welcome, {account.display_name}!</h1>
            <p>Your Account Type: <strong>{account.account_type}</strong></p>
            <button onClick={logout}>Logout</button>
            <hr style={{ margin: '20px 0' }} />
            
            <h2>Your Projects</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {projects.length > 0 ? (
                <ul>
                    {projects.map((project) => (
                        <li key={project.id}>{project.name} (ID: {project.id})</li>
                    ))}
                </ul>
            ) : (
                <p>You are not a member of any projects yet.</p>
            )}
        </div>
    );
};

export default DashboardPage;
