import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Operator, UploadConfig } from '../../common/auth-types';
import { getAuthSession, clearAuthSession, getUploadConfig, getUserData } from '../../storage/authStorage';
import { authService } from '../../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: Operator | null;
  uploadConfig: UploadConfig | null;
  loading: boolean;
  login: (user: Operator, uploadConfig: UploadConfig) => void;
  logout: () => Promise<void>;
  updateUser: (user: Operator) => void;
  updateUploadConfig: (config: UploadConfig) => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Operator | null>(null);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Inicializa estado de autenticação ao montar componente
   * Usa AuthService.init() para validar sessão
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await authService.init();

        if (result.isAuthenticated && result.user) {
          setIsAuthenticated(true);
          setUser(result.user);
        }

        const config = await getUploadConfig();
        if (config) {
          setUploadConfig(config);
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listener para 401 unauthorized
    const handleUnauthorized = async () => {
      console.warn('Token expirado/inválido - fazendo logout silencioso');
      await authService.handle401();
      setIsAuthenticated(false);
      setUser(null);
      setUploadConfig(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Login: Atualiza estado após autenticação bem-sucedida
   * Pattern: State update + Side effect
   */
  const login = useCallback((newUser: Operator, newUploadConfig: UploadConfig) => {
    setIsAuthenticated(true);
    setUser(newUser);
    setUploadConfig(newUploadConfig);
  }, []);

  /**
   * Logout: Limpa estado e storage
   * Pattern: Cleanup + State reset
   */
  const logout = useCallback(async () => {
    try {
      await clearAuthSession();
      setIsAuthenticated(false);
      setUser(null);
      setUploadConfig(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }, []);

  /**
   * Atualiza dados do usuário
   * Pattern: Partial state update
   */
  const updateUser = useCallback((newUser: Operator) => {
    setUser(newUser);
  }, []);

  /**
   * Atualiza configuração de upload
   * Pattern: Partial state update
   */
  const updateUploadConfig = useCallback((newConfig: UploadConfig) => {
    setUploadConfig(newConfig);
  }, []);

  /**
   * Re-verifica autenticação (após login)
   */
  const checkAuth = useCallback(async () => {
    try {
      const session = await getAuthSession();
      const config = await getUploadConfig();

      if (session && session.token) {
        setIsAuthenticated(true);
      }

      if (config) {
        setUploadConfig(config);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    }
  }, []);

  /**
   * Memoiza value para evitar re-renders desnecessários
   * Pattern: Performance optimization
   */
  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      uploadConfig,
      loading,
      login,
      logout,
      updateUser,
      updateUploadConfig,
      checkAuth,
    }),
    [isAuthenticated, user, uploadConfig, loading, login, logout, updateUser, updateUploadConfig, checkAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
