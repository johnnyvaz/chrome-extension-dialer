import React, { useState, useEffect } from 'react';
import { auditoriaService, AuditoriaConfig } from '../../services/auditoriaService';
import { getSettings } from '../../storage';

const AuditoriaConfigComponent: React.FC = () => {
  const [config, setConfig] = useState<AuditoriaConfig>({
    backendUrl: '',
    projetoId: '',
    authToken: '',
    enabled: false,
    asteriskConfig: {
      url: '',
      username: '',
      password: '',
      timeout: 30000
    }
  });
  const [showAsteriskPassword, setShowAsteriskPassword] = useState(false);
  const [currentSipDomain, setCurrentSipDomain] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    loadSipDomain();
  }, []);

  const loadConfig = () => {
    const currentConfig = auditoriaService.getConfig();
    setConfig(currentConfig);
  };

  const loadSipDomain = () => {
    const allSettings = getSettings();
    const activeAccount = allSettings.find(setting => setting.active);
    if (activeAccount?.decoded.sipDomain) {
      setCurrentSipDomain(activeAccount.decoded.sipDomain);
      // Auto-preencher URL do Asterisk baseado no SIP domain se não estiver configurado
      if (!config.asteriskConfig?.url && activeAccount.decoded.sipDomain) {
        setConfig(prev => ({
          ...prev,
          asteriskConfig: {
            ...prev.asteriskConfig!,
            url: `http://${activeAccount.decoded.sipDomain}:8088`
          }
        }));
      }
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await auditoriaService.updateConfig(config);
      setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.backendUrl) {
      setMessage({ type: 'error', text: 'URL do backend é obrigatória' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const testUrl = `${config.backendUrl}/admin/auditorias`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          ...(config.authToken && { 'Authorization': `Bearer ${config.authToken}` })
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Conexão com backend testada com sucesso!' });
      } else {
        setMessage({ type: 'error', text: `Erro na conexão: ${response.statusText}` });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setMessage({ type: 'error', text: 'Erro ao conectar com o backend' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAsteriskConnection = async () => {
    if (!config.asteriskConfig?.url || !config.asteriskConfig?.username || !config.asteriskConfig?.password) {
      setMessage({ type: 'error', text: 'Preencha todos os campos do Asterisk' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const testUrl = `${config.asteriskConfig.url}/ari/asterisk/info`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${config.asteriskConfig.username}:${config.asteriskConfig.password}`)}`
        },
        signal: AbortSignal.timeout(config.asteriskConfig.timeout || 30000)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Conexão com Asterisk testada com sucesso!' });
      } else {
        setMessage({ type: 'error', text: `Erro na conexão Asterisk: ${response.statusText}` });
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão Asterisk:', error);
      setMessage({ type: 'error', text: `Erro ao conectar com Asterisk: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Configuração de Auditoria</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Habilitar Auditoria:
        </label>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          style={{ marginRight: '8px' }}
        />
        <span>Ativar captura automática de dados de ligação</span>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          URL do Backend:
        </label>
        <input
          type="text"
          value={config.backendUrl}
          onChange={(e) => setConfig({ ...config, backendUrl: e.target.value })}
          placeholder="http://localhost:3001/api"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          ID do Projeto:
        </label>
        <input
          type="text"
          value={config.projetoId}
          onChange={(e) => setConfig({ ...config, projetoId: e.target.value })}
          placeholder="uuid-do-projeto"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Token de Autenticação (opcional):
        </label>
        <input
          type="password"
          value={config.authToken || ''}
          onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
          placeholder="Bearer token ou JWT"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <hr style={{ margin: '20px 0', border: '1px solid #eee' }} />
      
      <h4>Configuração do Asterisk</h4>
      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px', fontSize: '12px' }}>
        <strong>SIP Domain Atual:</strong> {currentSipDomain || 'Nenhum domínio SIP configurado'}
        <br />
        <em>A URL do Asterisk será preenchida automaticamente baseada no seu domínio SIP</em>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          URL do Asterisk:
        </label>
        <input
          type="text"
          value={config.asteriskConfig?.url || ''}
          onChange={(e) => setConfig({ 
            ...config, 
            asteriskConfig: { ...config.asteriskConfig!, url: e.target.value }
          })}
          placeholder={currentSipDomain ? `http://${currentSipDomain}:8088` : 'http://seu-asterisk:8088'}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Usuário Asterisk:
        </label>
        <input
          type="text"
          value={config.asteriskConfig?.username || ''}
          onChange={(e) => setConfig({ 
            ...config, 
            asteriskConfig: { ...config.asteriskConfig!, username: e.target.value }
          })}
          placeholder="admin"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Senha Asterisk:
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type={showAsteriskPassword ? 'text' : 'password'}
            value={config.asteriskConfig?.password || ''}
            onChange={(e) => setConfig({ 
              ...config, 
              asteriskConfig: { ...config.asteriskConfig!, password: e.target.value }
            })}
            placeholder="senha do asterisk"
            style={{
              width: '100%',
              padding: '8px',
              paddingRight: '40px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            type="button"
            onClick={() => setShowAsteriskPassword(!showAsteriskPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {showAsteriskPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Timeout (ms):
        </label>
        <input
          type="number"
          value={config.asteriskConfig?.timeout || 30000}
          onChange={(e) => setConfig({ 
            ...config, 
            asteriskConfig: { ...config.asteriskConfig!, timeout: parseInt(e.target.value) }
          })}
          min="1000"
          max="120000"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleTestConnection}
          disabled={isLoading || !config.backendUrl}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? 'Testando...' : 'Testar Backend'}
        </button>

        <button
          onClick={handleTestAsteriskConnection}
          disabled={isLoading || !config.asteriskConfig?.url || !config.asteriskConfig?.username || !config.asteriskConfig?.password}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !config.asteriskConfig?.url || !config.asteriskConfig?.username || !config.asteriskConfig?.password) ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? 'Testando...' : 'Testar Asterisk'}
        </button>

        <button
          onClick={handleSaveConfig}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {isLoading ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px',
            borderRadius: '4px',
            marginTop: '10px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Status:</h4>
        <p><strong>Auditoria:</strong> {config.enabled ? '✅ Ativada' : '❌ Desativada'}</p>
        <p><strong>Ligações Ativas:</strong> {auditoriaService.getActiveCallsCount()}</p>
        <p><strong>Configuração Backend:</strong> {config.projetoId ? '✅ Completa' : '⚠️ Incompleta'}</p>
        <p><strong>Configuração Asterisk:</strong> {
          config.asteriskConfig?.url && config.asteriskConfig?.username && config.asteriskConfig?.password 
            ? '✅ Configurado' 
            : '⚠️ Incompleto'
        }</p>
        <p><strong>SIP Domain:</strong> {currentSipDomain || '❌ Não configurado'}</p>
      </div>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Como funciona:</strong>
        <ol style={{ margin: '5px 0', paddingLeft: '15px' }}>
          <li>Configure sua conta SIP na aba "Accounts"</li>
          <li>A URL do Asterisk será preenchida automaticamente baseada no SIP Domain</li>
          <li>Configure usuário e senha do Asterisk ARI</li>
          <li>Após uma ligação, a extensão aguarda 4 segundos e busca automaticamente a gravação</li>
          <li>Se encontrar, envia para o backend para processamento</li>
        </ol>
      </div>
    </div>
  );
};

export default AuditoriaConfigComponent;