import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import apiClient from './api';

interface Account {
    id: number;
    account_name: string;
    display_name: string;
    account_type: 'admin' | 'manager' | 'artist' | 'client';
}

interface AuthContextType {
    isAuthenticated: boolean;
    account: Account | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [account, setAccount] = useState<Account | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        setAccount(null);
        setIsAuthenticated(false);
    }, []);

    const login = useCallback(async (token: string) => {
        localStorage.setItem('accessToken', token);
        try {
            const response = await apiClient.get<Account>('/accounts/me');
            setAccount(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Failed to fetch user account during login:', error);
            logout(); // エラー時はログアウト処理を呼ぶ
        }
    }, [logout]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    await login(token);
                }
            } catch (error) {
                // ここでエラーが起きても、アプリが停止しないように握りつぶす
                console.error("Error during initial auth check:", error);
            } finally {
                // 成功しようが失敗しようが、必ずローディングを解除する
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [login]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, account, login, logout, isLoading }}>
            {/* ローディングが解除されたら、子コンポーネント（＝アプリケーション本体）を描画する */}
            {!isLoading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
