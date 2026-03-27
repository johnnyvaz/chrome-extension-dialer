import React, { useState } from 'react';
import { Box, Center, Container, Button, useToast } from '@chakra-ui/react';
import RegisterForm from './RegisterForm';
import EmailConfirmation from './EmailConfirmation';
import { LoginForm } from './LoginForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { useAuth } from './AuthContext';
import * as authStorage from '../../storage/authStorage';

type AuthScreenType = 'login' | 'register' | 'confirm-email' | 'forgot-password' | 'reset-password';

/**
 * Componente principal de autenticação
 * Gerencia navegação entre telas de auth
 */
export const AuthScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>('login');
  const { checkAuth } = useAuth();
  const toast = useToast();

  const handleLoginSuccess = async () => {
    await checkAuth();
  };

  const handleClearStorage = async () => {
    try {
      await authStorage.clearAuthSession();
      await authStorage.clearAllLocalData();

      toast({
        title: 'Dados limpos',
        description: 'Todos os dados de autenticação foram removidos',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Recarrega a página para resetar estado
      window.location.reload();
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao limpar dados',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setCurrentScreen('register')}
            onSwitchToForgotPassword={() => setCurrentScreen('forgot-password')}
          />
        );

      case 'register':
        return <RegisterForm onSuccess={() => setCurrentScreen('login')} onNavigateToLogin={() => setCurrentScreen('login')} />;

      case 'confirm-email':
        return <EmailConfirmation onSuccess={() => setCurrentScreen('login')} onNavigateToLogin={() => setCurrentScreen('login')} />;

      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToReset={() => setCurrentScreen('reset-password')}
          />
        );

      case 'reset-password':
        return (
          <ResetPasswordForm
            onSuccess={() => setCurrentScreen('login')}
            onNavigateToLogin={() => setCurrentScreen('login')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Container maxW="container.sm" h="100vh">
      <Center h="100%" flexDirection="column">
        <Box w="100%" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
          {renderScreen()}
        </Box>

        {/* Footer com botão de limpar storage */}
        {/* <Box mt={4} textAlign="center">
          <Button
            size="xs"
            variant="ghost"
            colorScheme="red"
            onClick={handleClearStorage}
            fontSize="xs"
          >
            Limpar dados locais
          </Button>
        </Box> */}
      </Center>
    </Container>
  );
};

export default AuthScreen;
