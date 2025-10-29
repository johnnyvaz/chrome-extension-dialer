import React, { useState } from 'react';
import { Box, Center, Container } from '@chakra-ui/react';
import RegisterForm from './RegisterForm';
import EmailConfirmation from './EmailConfirmation';
import { LoginForm } from './LoginForm';
import { useAuth } from './AuthContext';

type AuthScreenType = 'login' | 'register' | 'confirm-email' | 'forgot-password' | 'reset-password';

/**
 * Componente principal de autenticação
 * Gerencia navegação entre telas de auth
 */
export const AuthScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreenType>('login');
  const { checkAuth } = useAuth();

  const handleLoginSuccess = async () => {
    await checkAuth();
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
          <Box>
            <Center fontSize="xl" fontWeight="bold">
              Forgot Password Screen (Coming Soon)
            </Center>
            <Center mt={4}>
              <button onClick={() => setCurrentScreen('login')}>Voltar para login</button>
            </Center>
          </Box>
        );

      case 'reset-password':
        return (
          <Box>
            <Center fontSize="xl" fontWeight="bold">
              Reset Password Screen (Coming Soon)
            </Center>
            <Center mt={4}>
              <button onClick={() => setCurrentScreen('login')}>Voltar para login</button>
            </Center>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxW="container.sm" h="100vh">
      <Center h="100%">
        <Box w="100%" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg">
          {renderScreen()}
        </Box>
      </Center>
    </Container>
  );
};

export default AuthScreen;
