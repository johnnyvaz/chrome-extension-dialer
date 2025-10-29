import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { confirmEmail, resendConfirmation } from '../../api/authApi';
import { ApiError } from '../../common/auth-types';

interface EmailConfirmationProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const EmailConfirmation: React.FC<EmailConfirmationProps> = ({ onSuccess, onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    const confirmEmailToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('access_token');

      if (!token) {
        setIsLoading(false);
        setErrorMessage('Token de confirmação não encontrado na URL.');
        setShowResendForm(true);
        return;
      }

      try {
        await confirmEmail({ access_token: token });
        setSuccessMessage('Email confirmado com sucesso! Você já pode fazer login.');

        setTimeout(() => {
          onSuccess();
          onNavigateToLogin();
        }, 3000);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);

          if (error.status === 404 || error.status === 400) {
            setShowResendForm(true);
          }
        } else {
          setErrorMessage('Erro ao confirmar email. Tente novamente.');
          setShowResendForm(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmailToken();
  }, [onSuccess, onNavigateToLogin]);

  const handleResendConfirmation = async () => {
    if (!resendEmail) {
      setErrorMessage('Por favor, insira seu email.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resendConfirmation({ email: resendEmail });
      setSuccessMessage('Email de confirmação reenviado! Verifique sua caixa de entrada.');
      setShowResendForm(false);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          setErrorMessage('Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Erro ao reenviar email. Tente novamente.');
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <Box w="100%" maxW="500px" mx="auto">
        <Center h="300px" flexDirection="column">
          <Spinner size="xl" color="jambonz.500" mb={4} />
          <Text>Confirmando seu email...</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box w="100%" maxW="500px" mx="auto">
      <Heading size="lg" mb={6} textAlign="center">
        Confirmação de Email
      </Heading>

      {successMessage && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Sucesso!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Box>
        </Alert>
      )}

      {errorMessage && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Box>
        </Alert>
      )}

      {showResendForm && (
        <VStack spacing={4} align="stretch">
          <Text fontSize="sm" color="gray.600">
            Seu token de confirmação pode ter expirado ou é inválido. Insira seu email abaixo para receber um novo link de confirmação.
          </Text>

          <FormControl>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </FormControl>

          <Button
            colorScheme="jambonz"
            size="lg"
            width="100%"
            onClick={handleResendConfirmation}
            isLoading={isResending}
            loadingText="Reenviando..."
          >
            Reenviar Email de Confirmação
          </Button>

          <Button variant="ghost" width="100%" onClick={onNavigateToLogin}>
            Voltar para login
          </Button>
        </VStack>
      )}

      {successMessage && !showResendForm && (
        <Button variant="ghost" width="100%" onClick={onNavigateToLogin} mt={4}>
          Ir para login
        </Button>
      )}
    </Box>
  );
};

export default EmailConfirmation;
