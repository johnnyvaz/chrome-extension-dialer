import React, { useEffect, useState } from 'react';
import { Box, Text, Badge, Button, HStack, VStack, Icon, Tooltip } from '@chakra-ui/react';
import { RepeatIcon, WarningIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { uploadService } from '../../services/uploadService';

interface UploadStatusIndicatorProps {
  compact?: boolean;
}

export const UploadStatusIndicator: React.FC<UploadStatusIndicatorProps> = ({ compact = false }) => {
  const [stats, setStats] = useState({
    pending: 0,
    retrying: 0,
    failed: 0,
    total: 0,
  });
  const [isRetrying, setIsRetrying] = useState(false);

  const loadStats = async () => {
    try {
      const newStats = await uploadService.getQueueStats();
      setStats(newStats);
    } catch (error) {
      console.error('Erro ao carregar stats de upload:', error);
    }
  };

  useEffect(() => {
    loadStats();

    // Atualiza stats a cada 10 segundos
    const interval = setInterval(loadStats, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    try {
      await uploadService.retryFailed();
      await loadStats();
    } catch (error) {
      console.error('Erro ao retentar uploads:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Se não há nada na fila, não mostra nada
  if (stats.total === 0) {
    return null;
  }

  // Modo compacto (apenas badges)
  if (compact) {
    return (
      <HStack spacing={2}>
        {stats.pending > 0 && (
          <Tooltip label={`${stats.pending} uploads pendentes`}>
            <Badge colorScheme="blue" fontSize="xs">
              <Icon as={RepeatIcon} mr={1} />
              {stats.pending}
            </Badge>
          </Tooltip>
        )}
        {stats.retrying > 0 && (
          <Tooltip label={`${stats.retrying} uploads em andamento`}>
            <Badge colorScheme="yellow" fontSize="xs">
              <Icon as={RepeatIcon} mr={1} />
              {stats.retrying}
            </Badge>
          </Tooltip>
        )}
        {stats.failed > 0 && (
          <Tooltip label={`${stats.failed} uploads falharam`}>
            <Badge colorScheme="red" fontSize="xs" cursor="pointer" onClick={handleRetryFailed}>
              <Icon as={WarningIcon} mr={1} />
              {stats.failed}
            </Badge>
          </Tooltip>
        )}
      </HStack>
    );
  }

  // Modo completo
  return (
    <Box p={3} bg="gray.50" borderRadius="md" fontSize="sm">
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="xs" color="gray.600">
            Status de Upload
          </Text>
          {stats.pending + stats.retrying === 0 && stats.failed === 0 && (
            <Badge colorScheme="green" fontSize="xs">
              <Icon as={CheckCircleIcon} mr={1} />
              Tudo sincronizado
            </Badge>
          )}
        </HStack>

        {stats.pending > 0 && (
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.600">
              Pendentes:
            </Text>
            <Badge colorScheme="blue">{stats.pending}</Badge>
          </HStack>
        )}

        {stats.retrying > 0 && (
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.600">
              Enviando:
            </Text>
            <Badge colorScheme="yellow">{stats.retrying}</Badge>
          </HStack>
        )}

        {stats.failed > 0 && (
          <>
            <HStack justify="space-between">
              <Text fontSize="xs" color="gray.600">
                Falharam:
              </Text>
              <Badge colorScheme="red">{stats.failed}</Badge>
            </HStack>
            <Button
              size="xs"
              colorScheme="red"
              variant="outline"
              onClick={handleRetryFailed}
              isLoading={isRetrying}
              loadingText="Retentando..."
              leftIcon={<RepeatIcon />}
            >
              Retentar uploads
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
};
