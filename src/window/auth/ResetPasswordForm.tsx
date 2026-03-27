import React, { useState, useEffect } from 'react';
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
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useForm } from 'react-hook-form';
import * as authApi from '../../api/authApi';
import { ApiError } from '../../common/auth-types';

interface ResetPasswordFormData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

/**
 * Componente para redefinir senha com token
 * Usado após o usuário clicar no link do email
 */
export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onNavigateToLogin,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ResetPasswordFormData>();

  const newPassword = watch('newPassword');

  // Extrai token da URL se disponível
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token') || params.get('access_token');

    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        access_token: data.token,
        newPassword: data.newPassword,
      });

      setSuccessMessage(
        response.message || 'Senha redefinida com sucesso! Redirecionando para login...'
      );

      // Aguarda 2 segundos e redireciona para login
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);

      if (error instanceof ApiError) {
        if (error.status === 404 || error.status === 400) {
          setErrorMessage('Token inválido ou expirado. Solicite um novo reset de senha.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage('Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box width="100%">
      <Text fontSize="2xl" fontWeight="bold" mb={2} textAlign="center">
        Redefinir senha
      </Text>
      <Text fontSize="sm" color="gray.600" mb={6} textAlign="center">
        Informe o token recebido por email e sua nova senha
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

          <FormControl isInvalid={!!errors.token} isRequired>
            <FormLabel>Token de recuperação</FormLabel>
            <Input
              type="text"
              placeholder="Token recebido por email"
              {...register('token', {
                required: 'Token é obrigatório',
                minLength: {
                  value: 10,
                  message: 'Token inválido',
                },
              })}
            />
            {errors.token && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.token.message}
              </Text>
            )}
            <Text fontSize="xs" color="gray.500" mt={1}>
              Cole o token completo recebido no email
            </Text>
          </FormControl>

          <FormControl isInvalid={!!errors.newPassword} isRequired>
            <FormLabel>Nova senha</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                {...register('newPassword', {
                  required: 'Nova senha é obrigatória',
                  minLength: {
                    value: 8,
                    message: 'Senha deve ter no mínimo 8 caracteres',
                  },
                })}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
            {errors.newPassword && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.newPassword.message}
              </Text>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.confirmPassword} isRequired>
            <FormLabel>Confirmar nova senha</FormLabel>
            <InputGroup>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite a senha novamente"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Confirmação de senha é obrigatória',
                  validate: (value) =>
                    value === newPassword || 'As senhas não coincidem',
                })}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
            {errors.confirmPassword && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.confirmPassword.message}
              </Text>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="jambonz"
            width="100%"
            isLoading={isLoading}
            loadingText="Redefinindo..."
            isDisabled={!!successMessage}
          >
            Redefinir senha
          </Button>

          <Box textAlign="center" pt={2}>
            <Text fontSize="sm" color="gray.600">
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

export default ResetPasswordForm;
