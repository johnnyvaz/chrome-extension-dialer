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
import { authService } from '../../services/authService';
import { ApiError } from '../../common/auth-types';
import * as authStorage from '../../storage/authStorage';
import { validateEmail, validateCPForCNPJ } from '../../utils/validation';
import { formatDocument } from '../../utils';

interface LoginFormData {
  email: string;
  password: string;
  cnpj: string;
}

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining: number;
    resetTime: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<LoginFormData>();

  // Pré-preenche último email/CNPJ usado
  useEffect(() => {
    const loadLastLogin = async () => {
      const lastLogin = await authStorage.getLastLoginInfo();
      if (lastLogin) {
        setValue('email', lastLogin.email);
        setValue('cnpj', formatDocument(lastLogin.cnpj));
      }
    };
    loadLastLogin();
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage('');
    setRateLimitInfo(null);
    setIsLoading(true);

    try {
      // Remove formatação do CNPJ
      const cnpj = data.cnpj.replace(/\D/g, '');

      await authService.login({
        email: data.email,
        password: data.password,
        cnpj,
      });

      // Salva último login para próxima vez
      await authStorage.saveLastLoginInfo(data.email, cnpj);

      onSuccess();
    } catch (error) {
      console.error('Erro no login:', error);

      if (error instanceof ApiError) {
        setErrorMessage(error.message);

        // Rate limiting (5 tentativas a cada 15 min)
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
        setErrorMessage('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box width="100%">
      <Text fontSize="2xl" fontWeight="bold" mb={6} textAlign="center">
        Login
      </Text>

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          {errorMessage && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {errorMessage}
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

          <FormControl isInvalid={!!errors.password} isRequired>
            <FormLabel>Senha</FormLabel>
            <InputGroup>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Senha é obrigatória',
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
            {errors.password && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.password.message}
              </Text>
            )}
          </FormControl>

          <FormControl isInvalid={!!errors.cnpj} isRequired>
            <FormLabel>CPF/CNPJ</FormLabel>
            <Input
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
              {...register('cnpj', {
                required: 'CPF/CNPJ é obrigatório',
                // Validação comentada temporariamente para testes
                // validate: (value) => {
                //   const unformatted = value.replace(/\D/g, '');
                //   return validateCPForCNPJ(unformatted) || 'CPF/CNPJ inválido';
                // },
                onChange: (e) => {
                  const formatted = formatDocument(e.target.value);
                  setValue('cnpj', formatted);
                },
              })}
            />
            {errors.cnpj && (
              <Text color="red.500" fontSize="sm" mt={1}>
                {errors.cnpj.message}
              </Text>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="jambonz"
            width="100%"
            isLoading={isLoading}
            loadingText="Entrando..."
          >
            Entrar
          </Button>

          <Box textAlign="center">
            <Link
              color="jambonz.500"
              fontSize="sm"
              onClick={onSwitchToForgotPassword}
              cursor="pointer"
            >
              Esqueci minha senha
            </Link>
          </Box>

          <Box textAlign="center" pt={2}>
            <Text fontSize="sm" color="gray.600">
              Não tem uma conta?{' '}
              <Link
                color="jambonz.500"
                fontWeight="bold"
                onClick={onSwitchToRegister}
                cursor="pointer"
              >
                Cadastre-se
              </Link>
            </Text>
          </Box>
        </VStack>
      </form>
    </Box>
  );
};
