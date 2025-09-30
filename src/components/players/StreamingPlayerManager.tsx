import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import IFrameVideoPlayer from '../IFrameVideoPlayer';
import { Play, Settings, Eye, Share2, Download, Zap, Monitor, Activity, Radio, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw, ExternalLink, Square } from 'lucide-react';

interface StreamingPlayerManagerProps {
  className?: string;
  showPlayerSelector?: boolean;
  enableSocialSharing?: boolean;
  enableViewerCounter?: boolean;
  enableWatermark?: boolean;
  autoDetectStream?: boolean;
}

interface StreamStatus {
  is_live: boolean;
  stream_type?: 'playlist' | 'obs';
  transmission?: {
    id: number;
    titulo: string;
    codigo_playlist: number;
    playlist_nome?: string;
    stats: {
      viewers: number;
      bitrate: number;
      uptime: string;
      isActive: boolean;
    };
  };
  obs_stream?: {
    is_live: boolean;
    viewers: number;
    bitrate: number;
    uptime: string;
    recording: boolean;
    streamName?: string;
  };
}

interface Logo {
  id: number;
  nome: string;
  url: string;
}

const StreamingPlayerManager: React.FC<StreamingPlayerManagerProps> = ({
  className = '',
  showPlayerSelector = true,
  enableSocialSharing = true,
  enableViewerCounter = true,
  enableWatermark = true,
  autoDetectStream = true
}) => {
  const { user, getToken } = useAuth();
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string>('');
  const [streamTitle, setStreamTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [watermarkConfig, setWatermarkConfig] = useState({
    enabled: enableWatermark,
    position: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
    opacity: 80,
    logo_url: ''
  });
  const [lastStreamCheck, setLastStreamCheck] = useState<number>(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [noSignal, setNoSignal] = useState(false);

  const userLogin = user?.usuario || (user?.email ? user.email.split('@')[0] : `user_${user?.id || 'usuario'}`);

  useEffect(() => {
    if (autoDetectStream) {
      loadStreamStatus();
      loadLogos();
      
      // Atualizar status a cada 30 segundos
      const interval = setInterval(loadStreamStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [autoDetectStream]);

  const loadStreamStatus = async () => {
    try {
      setConnectionError(null);
      const token = await getToken();
      const response = await fetch('/api/streaming/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStreamStatus(data);
        setLastStreamCheck(Date.now());
        
        // Construir URL do stream baseado no status
        if (data.is_live) {
          let streamUrl = '';
          let title = '';
          
          if (data.stream_type === 'playlist' && data.transmission) {
            // Para playlist, usar URL fixa conforme especificado
            const wowzaHost = 'stmv1.udicast.com';
            streamUrl = `https://${wowzaHost}/${userLogin}/${userLogin}/playlist.m3u8`;
            title = `📺 Playlist: ${data.transmission.playlist_nome || data.transmission.titulo}`;
            console.log('🎵 Stream de playlist detectado:', streamUrl);
          } else if (data.stream_type === 'obs' && data.obs_stream?.is_live) {
            // Para OBS, usar URL específica
            const wowzaHost = 'stmv1.udicast.com';
            streamUrl = `https://${wowzaHost}/${userLogin}/${userLogin}_live/playlist.m3u8`;
            title = `📡 OBS: ${data.obs_stream.streamName || `${userLogin}_live`}`;
            console.log('📡 Stream OBS detectado:', streamUrl);
          }
          
          if (streamUrl) {
            setCurrentStreamUrl(streamUrl);
            setStreamTitle(title);
            setNoSignal(false);
          } else {
            setNoSignal(true);
            setCurrentStreamUrl('');
            setStreamTitle('');
          }
        } else {
          // Sem transmissão ativa
          setCurrentStreamUrl('');
          setStreamTitle('');
          setNoSignal(false);
          console.log('📴 Nenhuma transmissão ativa detectada');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao verificar status de transmissão:', error);
      setConnectionError(error instanceof Error ? error.message : 'Erro de conexão');
      setStreamStatus(null);
      setCurrentStreamUrl('');
      setStreamTitle('');
      setNoSignal(false);
    }
  };

  const loadLogos = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/logos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setLogos(data);

      if (data.length > 0 && !watermarkConfig.logo_url) {
        setWatermarkConfig(prev => ({
          ...prev,
          logo_url: data[0].url
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar logos:', error);
    }
  };

  const stopTransmission = async () => {
    if (!confirm('Deseja finalizar a transmissão atual?')) return;
    
    try {
      const token = await getToken();
      const response = await fetch('/api/streaming/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transmission_id: streamStatus?.transmission?.id,
          stream_type: streamStatus?.stream_type || 'playlist'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('Transmissão finalizada');
        loadStreamStatus();
      } else {
        toast.error(result.error || 'Erro ao finalizar transmissão');
      }
    } catch (error) {
      console.error('Erro ao finalizar transmissão:', error);
      toast.error('Erro ao finalizar transmissão');
    }
  };

  const renderPlayer = () => {
    if (noSignal) {
      // Tela de "sem sinal"
      return (
        <div className="w-full h-full flex items-center justify-center text-white bg-black">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-8 bg-gray-600 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">SEM SINAL</h2>
            <p className="text-gray-400 mb-4">No Signal</p>
            <p className="text-sm text-gray-500">
              Usuário: {userLogin}
            </p>
            <p className="text-xs text-gray-600 mt-4">
              Recarregando automaticamente em 30 segundos...
            </p>
          </div>
        </div>
      );
    }

    if (currentStreamUrl) {
      // Construir URL do player na porta do sistema
      const baseUrl = window.location.protocol === 'https:' 
        ? `https://${window.location.hostname}:3001`
        : `http://${window.location.hostname}:3001`;
      
      const contador = enableViewerCounter ? 'true' : 'false';
      const compartilhamento = enableSocialSharing ? 'true' : 'false';
      
      let iframeUrl = '';
      
      if (streamStatus?.stream_type === 'playlist') {
        // Para playlist, usar parâmetro específico
        iframeUrl = `${baseUrl}/api/player-port/iframe?login=${userLogin}&playlist=${streamStatus.transmission?.codigo_playlist}&player=1&contador=${contador}&compartilhamento=${compartilhamento}`;
      } else {
        // Para OBS ou outros
        iframeUrl = `${baseUrl}/api/player-port/iframe?login=${userLogin}&stream=${userLogin}_live&player=1&contador=${contador}&compartilhamento=${compartilhamento}`;
      }
      
      return (
        <IFrameVideoPlayer
          src={iframeUrl}
          title={streamTitle}
          isLive={streamStatus?.is_live || false}
          autoplay={false}
          controls={true}
          className="w-full h-full"
          streamStats={streamStatus?.is_live ? {
            viewers: streamStatus.transmission?.stats.viewers || streamStatus.obs_stream?.viewers || 0,
            bitrate: streamStatus.transmission?.stats.bitrate || streamStatus.obs_stream?.bitrate || 0,
            uptime: streamStatus.transmission?.stats.uptime || streamStatus.obs_stream?.uptime || '00:00:00',
            quality: '1080p',
            isRecording: streamStatus.obs_stream?.recording || false
          } : undefined}
          onReady={() => console.log('Player pronto para transmissão')}
          onError={(error: any) => {
            console.error('Erro no player:', error);
            setNoSignal(true);
            // Auto-reload após 10 segundos
            setTimeout(() => {
              loadStreamStatus();
            }, 10000);
          }}
        />
      );
    }
    
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        <div className="text-center">
          <WifiOff className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma Transmissão Ativa</h3>
          <p className="text-gray-400 mb-4">
            {connectionError ? 'Erro de conexão com o servidor' : 'Inicie uma transmissão para visualizar aqui'}
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Domínio: stmv1.udicast.com</p>
            <p>Usuário: {userLogin}</p>
            <p>Verificando streams automaticamente...</p>
          </div>
        </div>
      </div>
    );
  };

  const getStreamStatusInfo = () => {
    if (noSignal) {
      return {
        status: 'Sem Sinal',
        color: 'text-red-600',
        icon: <WifiOff className="h-4 w-4" />
      };
    }

    if (connectionError) {
      return {
        status: 'Erro de Conexão',
        color: 'text-red-600',
        icon: <WifiOff className="h-4 w-4" />
      };
    }

    if (!streamStatus) {
      return {
        status: 'Verificando...',
        color: 'text-gray-600',
        icon: <Activity className="h-4 w-4 animate-pulse" />
      };
    }

    if (streamStatus.is_live) {
      if (streamStatus.stream_type === 'playlist') {
        return {
          status: 'Playlist ao Vivo',
          color: 'text-blue-600',
          icon: <Radio className="h-4 w-4" />
        };
      } else if (streamStatus.stream_type === 'obs') {
        return {
          status: 'OBS ao Vivo',
          color: 'text-red-600',
          icon: <Wifi className="h-4 w-4" />
        };
      }
      return {
        status: 'Ao Vivo',
        color: 'text-green-600',
        icon: <Wifi className="h-4 w-4" />
      };
    }

    return {
      status: 'Offline',
      color: 'text-gray-600',
      icon: <WifiOff className="h-4 w-4" />
    };
  };

  const statusInfo = getStreamStatusInfo();

  // Auto-reload quando há "sem sinal"
  useEffect(() => {
    if (noSignal) {
      const timeout = setTimeout(() => {
        console.log('🔄 Auto-reload devido a sem sinal...');
        loadStreamStatus();
        setNoSignal(false);
      }, 30000); // 30 segundos

      return () => clearTimeout(timeout);
    }
  }, [noSignal]);

  const generatePlayerCode = () => {
    const baseUrl = window.location.protocol === 'https:' 
      ? `https://${window.location.hostname}:3001`
      : `http://${window.location.hostname}:3001`;
    
    const contador = enableViewerCounter ? 'true' : 'false';
    const compartilhamento = enableSocialSharing ? 'true' : 'false';
    
    let playerUrl = '';
    
    if (streamStatus?.stream_type === 'playlist') {
      playerUrl = `${baseUrl}/api/player-port/iframe?login=${userLogin}&playlist=${streamStatus.transmission?.codigo_playlist}&player=1&contador=${contador}&compartilhamento=${compartilhamento}`;
    } else {
      playerUrl = `${baseUrl}/api/player-port/iframe?login=${userLogin}&stream=${userLogin}_live&player=1&contador=${contador}&compartilhamento=${compartilhamento}`;
    }

    return `<!-- Player iFrame Universal -->
<iframe 
  src="${playerUrl}" 
  width="640" 
  height="360" 
  frameborder="0" 
  allowfullscreen
  allow="autoplay; fullscreen; picture-in-picture">
</iframe>

<!-- URL HLS Direta -->
<!-- ${currentStreamUrl} -->`;
  };

  const copyPlayerCode = () => {
    const code = generatePlayerCode();
    navigator.clipboard.writeText(code);
    toast.success('Código do player copiado!');
  };

  return (
    <div className={`streaming-player-manager space-y-6 ${className}`}>
      {/* Header com Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Player de Transmissão</h2>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${statusInfo.color}`}>
              {statusInfo.icon}
              <span className="font-medium">{statusInfo.status}</span>
            </div>
            <button
              onClick={loadStreamStatus}
              disabled={loading}
              className="text-primary-600 hover:text-primary-800 flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Informações do Stream Ativo */}
        {streamStatus?.is_live && currentStreamUrl && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">
                  {streamStatus.stream_type === 'playlist' ? '📺 Transmissão de Playlist' : '📡 Transmissão OBS'}
                </h3>
                <p className="text-green-700 text-sm">
                  {streamTitle}
                </p>
                <p className="text-green-600 text-xs mt-1 font-mono">
                  {currentStreamUrl}
                </p>
              </div>
              <div className="text-right text-sm text-green-700 space-y-1">
                <div>👥 {streamStatus.transmission?.stats.viewers || streamStatus.obs_stream?.viewers || 0} espectadores</div>
                <div>⚡ {streamStatus.transmission?.stats.bitrate || streamStatus.obs_stream?.bitrate || 0} kbps</div>
                <div>⏱️ {streamStatus.transmission?.stats.uptime || streamStatus.obs_stream?.uptime || '00:00:00'}</div>
                <button
                  onClick={stopTransmission}
                  className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 flex items-center"
                >
                  <Square className="h-3 w-3 mr-1" />
                  Parar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableViewerCounter}
                onChange={(e) => setEnableViewerCounter(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Contador de visualizações</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableSocialSharing}
                onChange={(e) => setEnableSocialSharing(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Compartilhamento social</span>
            </label>
          </div>
          
          {currentStreamUrl && (
            <div className="flex items-center space-x-2">
              <button
                onClick={copyPlayerCode}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center text-sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copiar Código
              </button>
              <a
                href={currentStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir HLS
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {renderPlayer()}
      </div>

      {/* Debug Info (apenas em desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 p-4 rounded-lg text-xs">
          <h4 className="font-semibold mb-2">Debug Info:</h4>
          <pre className="text-gray-600 overflow-auto">
            {JSON.stringify({
              userLogin,
              streamStatus,
              currentStreamUrl,
              lastCheck: new Date(lastStreamCheck).toLocaleTimeString(),
              connectionError,
              noSignal
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default StreamingPlayerManager;