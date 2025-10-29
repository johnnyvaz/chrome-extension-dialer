import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Collapse,
  Link,
  InputGroup,
  InputRightElement,
  IconButton,
  Select,
  useToast,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useForm } from 'react-hook-form';
import { register as registerApi } from '../../api/authApi';
import { RegisterRequest } from '../../common/auth-types';
import { validateCNPJ, validateEmail } from '../../utils/validation';
import { ApiError } from '../../common/auth-types';

interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  companyName: string;
  document: string;
  documentType: string;
  extensionNumber?: string;
  sipServer?: string;
  sipPort?: number;
  sipPassword?: string;
}

interface RegisterFormProps {
  onSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onNavigateToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSipPassword, setShowSipPassword] = useState(false);
  const [showExtensionFields, setShowExtensionFields] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>();

  const formatDocument = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    const documentType = watch('documentType');

    if (documentType === 'CNPJ') {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    } else {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1-$2')
        .slice(0, 14);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: RegisterRequest = {
        email: data.email,
        password: data.password,
        nome: data.name,                                    // Backend usa 'nome'
        empresa: data.companyName,                          // Backend usa 'empresa'
        cnpj: data.document.replace(/[^\d]/g, ''),          // Backend usa 'cnpj' (aceita CPF também)
      };

      // Campos opcionais de ramal SIP
      if (showExtensionFields && data.extensionNumber && data.sipServer && data.sipPort && data.sipPassword) {
        payload.ramalNumero = data.extensionNumber;
        payload.ramalServidorSip = data.sipServer;
        payload.ramalPortaSip = data.sipPort;
        payload.ramalSenhaSip = data.sipPassword;
      }

      await registerApi(payload);

      // Mostrar toast de sucesso com instruções
      toast({
        title: '🎉 Conta criada com sucesso!',
        description: '📧 Verifique seu email e clique no link de confirmação para ativar sua conta.',
        status: 'success',
        duration: 8000,
        isClosable: true,
        position: 'top',
      });

      setSuccessMessage(
        'Conta criada! Um email de confirmação foi enviado para você. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.'
      );

      // Redirecionar após 5 segundos
      setTimeout(() => {
        onSuccess();
      }, 5000);
    } catch (error) {
      let errorMsg = 'Erro ao criar conta. Tente novamente.';

      if (error instanceof ApiError) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);

      // Mostrar toast de erro
      toast({
        title: '❌ Erro no registro',
        description: errorMsg,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box w="100%" maxW="500px" mx="auto">
      <Heading size="lg" mb={6} textAlign="center">
        Criar Conta
      </Heading>

      {successMessage && (
        <Alert
          status="success"
          mb={4}
          borderRadius="md"
          variant="solid"
          flexDirection="column"
          alignItems="center"
          textAlign="center"
          py={6}
        >
          <AlertIcon boxSize="40px" mr={0} mb={2} />
          <AlertTitle mt={2} mb={2} fontSize="lg">
            ✅ Conta criada com sucesso!
          </AlertTitle>
          <AlertDescription maxW="sm" fontSize="sm">
            {successMessage}
          </AlertDescription>
          <Text fontSize="xs" mt={3} opacity={0.9}>
            Redirecionando em alguns segundos...
          </Text>
        </Alert>
      )}

      {errorMessage && (
        <Alert
          status="error"
          mb={4}
          borderRadius="md"
          variant="left-accent"
        >
          <AlertIcon />
          <Box>
            <AlertTitle>Erro no Registro</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Box>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl isInvalid={!!errors.email}>
            <FormLabel>Email</FormLabel>
            <Input
              {...register('email', {
                required: 'Email é obrigatório',
                validate: (value) => validateEmail(value) || 'Email inválido',
              })}
              type="email"
              placeholder="seu@email.com"
            />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.password}>
            <FormLabel>Senha</FormLabel>
            <InputGroup>
              <Input
                {...register('password', {
                  required: 'Senha é obrigatória',
                  minLength: { value: 8, message: 'Senha deve ter no mínimo 8 caracteres' },
                  pattern: {
                    value: /^(?=.*[A-Z])(?=.*[0-9])/,
                    message: 'Senha deve conter uma maiúscula e um número',
                  },
                })}
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
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
            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Mínimo 8 caracteres, uma maiúscula e um número
            </Text>
          </FormControl>

          <FormControl isInvalid={!!errors.name}>
            <FormLabel>Nome Completo</FormLabel>
            <Input
              {...register('name', {
                required: 'Nome é obrigatório',
                minLength: { value: 2, message: 'Nome deve ter no mínimo 2 caracteres' },
              })}
              placeholder="João Silva"
            />
            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.companyName}>
            <FormLabel>Nome da Empresa</FormLabel>
            <Input
              {...register('companyName', {
                required: 'Nome da empresa é obrigatório',
                minLength: { value: 2, message: 'Nome da empresa deve ter no mínimo 2 caracteres' },
              })}
              placeholder="Minha Empresa Ltda"
            />
            <FormErrorMessage>{errors.companyName?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.documentType}>
            <FormLabel>Tipo de Documento</FormLabel>
            <Select {...register('documentType', { required: 'Tipo de documento é obrigatório' })} defaultValue="CNPJ">
              <option value="CNPJ">CNPJ</option>
              <option value="CPF">CPF</option>
            </Select>
            <FormErrorMessage>{errors.documentType?.message}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.document}>
            <FormLabel>{watch('documentType') === 'CNPJ' ? 'CNPJ' : 'CPF'}</FormLabel>
            <Input
              {...register('document', {
                required: 'CNPJ/CPF é obrigatório',
                // Validação comentada temporariamente para testes
                // validate: (value) => {
                //   const cleanValue = value.replace(/[^\d]/g, '');
                //   return validateCNPJ(cleanValue) || 'CNPJ/CPF inválido';
                // },
              })}
              placeholder={watch('documentType') === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
              onChange={(e) => {
                e.target.value = formatDocument(e.target.value);
              }}
            />
            <FormErrorMessage>{errors.document?.message}</FormErrorMessage>
          </FormControl>

          <Box>
            <Button
              variant="ghost"
              width="100%"
              onClick={() => setShowExtensionFields(!showExtensionFields)}
              rightIcon={showExtensionFields ? <ChevronUpIcon /> : <ChevronDownIcon />}
            >
              {showExtensionFields ? 'Ocultar' : 'Adicionar'} Extensão SIP (Opcional)
            </Button>

            <Collapse in={showExtensionFields} animateOpacity>
              <VStack spacing={4} mt={4} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
                <FormControl isInvalid={!!errors.extensionNumber}>
                  <FormLabel>Número da Extensão</FormLabel>
                  <Input {...register('extensionNumber')} placeholder="1001" />
                  <FormErrorMessage>{errors.extensionNumber?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.sipServer}>
                  <FormLabel>Servidor SIP</FormLabel>
                  <Input {...register('sipServer')} placeholder="sip.exemplo.com" />
                  <FormErrorMessage>{errors.sipServer?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.sipPort}>
                  <FormLabel>Porta SIP</FormLabel>
                  <Input {...register('sipPort')} type="number" placeholder="5060" defaultValue={5060} />
                  <FormErrorMessage>{errors.sipPort?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.sipPassword}>
                  <FormLabel>Senha SIP</FormLabel>
                  <InputGroup>
                    <Input
                      {...register('sipPassword')}
                      type={showSipPassword ? 'text' : 'password'}
                      placeholder="********"
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showSipPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        icon={showSipPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowSipPassword(!showSipPassword)}
                        variant="ghost"
                        size="sm"
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{errors.sipPassword?.message}</FormErrorMessage>
                </FormControl>
              </VStack>
            </Collapse>
          </Box>

          <Button
            type="submit"
            colorScheme="jambonz"
            size="lg"
            width="100%"
            isLoading={isLoading}
            loadingText="Criando conta..."
            isDisabled={isLoading || !!successMessage}
          >
            Criar Conta
          </Button>

          <Text textAlign="center" fontSize="sm">
            Já tem uma conta?{' '}
            <Link color="jambonz.500" onClick={onNavigateToLogin}>
              Fazer login
            </Link>
          </Text>
        </VStack>
      </form>
    </Box>
  );
};

export default RegisterForm;
