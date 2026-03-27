import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  Alert,
  AlertIcon,
  Link,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import * as authApi from '../../api/authApi';
import { ApiError } from '../../common/auth-types';
import { validateEmail } from '../../utils/validation';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormProps {
  onNavigateToLogin: () => void;
  onNavigateToReset?: () => void;
}

/**
 * Componente para solicitar reset de senha
 * Envia email com link para redefinir senha
 */
export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onNavigateToLogin,
  onNavigateToReset,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetTime: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setErrorMessage('');
    setSuccessMessage('');
    setRateLimitInfo(null);
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword({
        email: data.email,
      });

      setSuccessMessage(
        response.message || 'Email de recuperação enviado! Verifique sua caixa de entrada.'
      );
    } catch (error) {
      console.error('Erro ao solicitar reset de senha:', error);

      if (error instanceof ApiError) {
        setErrorMessage(error.message);

        // Rate limiting
        if (error.status === 429) {
          const details = error.details;
          if (details?.remaining !== undefined && details?.resetTime) {
            setRateLimitInfo({
              remaining: details.remaining,
              resetTime: new Date(details.resetTime).toLocaleTimeString('pt-BR'),
            });
          }
        }
      } else {
        setErrorMessage('Erro ao solicitar recuperação de senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box width="100%">
      <Text fontSize="2xl" fontWeight="bold" mb={2} textAlign="center">
        Esqueci minha senha
      </Text>
      <Text fontSize="sm" color="gray.600" mb={6} textAlign="center">
        Informe seu email para receber instruções de recuperação
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          {errorMessage && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {errorMessage}
            </Alert>
          )}

          {successMessage && (
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              {successMessage}
            </Alert>
          )}

          {rateLimitInfo && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Limite de tentativas atingido</Text>
                <Text fontSize="sm">
                  Tentativas restantes: {rateLimitInfo.remaining}
                </Text>
                <Text fontSize="sm">
                  Aguarde até: {rateLimitInfo.resetTime}
                </Text>
              </Box>
            </Alert>
          )}

          <FormControl isInvalid={!!errors.email} isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              {...register('email', {
                required: 'Email é obrigatório',
                validate: (value) => validateEmail(value) || 'Email inválido',
              })}
            />
            {errors.email && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.email.message}
              </Text>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="jambonz"
            width="100%"
            isLoading={isLoading}
            loadingText="Enviando..."
            isDisabled={!!successMessage}
          >
            Enviar email de recuperação
          </Button>

          <Box textAlign="center" pt={2}>
            <Text fontSize="sm" color="gray.600">
              Lembrou sua senha?{' '}
              <Link
                color="jambonz.500"
                fontWeight="bold"
                onClick={onNavigateToLogin}
                cursor="pointer"
              >
                Voltar para login
              </Link>
            </Text>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};

export default ForgotPasswordForm;
