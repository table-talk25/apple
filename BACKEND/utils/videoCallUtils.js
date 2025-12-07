/**
 * Utility per la gestione delle videochiamate
 */

const ErrorResponse = require('./errorResponse');
const twilio = require('twilio');
const crypto = require('crypto');

/**
 * Classe per la gestione delle videochiamate
 */
class VideoCallService {
  /**
   * @param {Object} config - Configurazione del servizio
   */
  constructor(config = {}) {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      apiKey: process.env.TWILIO_API_KEY,
      apiSecret: process.env.TWILIO_API_SECRET,
      ...config
    };

    this.client = null;
    this.activeCalls = new Map();
    this.initialize();
  }

  /**
   * Inizializza il client Twilio
   */
  initialize() {
    try {
      this.client = twilio(
        this.config.accountSid,
        this.config.authToken
      );
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'inizializzazione del servizio videochiamate',
        500,
        'VIDEO_SERVICE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Genera un token per la videochiamata
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @param {string} [role='participant'] - Ruolo dell'utente
   * @returns {string} Token per la videochiamata
   */
  generateVideoToken(roomId, userId, role = 'participant') {
    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      // Crea un token di accesso
      const token = new AccessToken(
        this.config.accountSid,
        this.config.apiKey,
        this.config.apiSecret,
        { identity: userId }
      );

      // Aggiungi il grant per la videochiamata
      const videoGrant = new VideoGrant({
        room: roomId
      });
      token.addGrant(videoGrant);

      return token.toJwt();
    } catch (error) {
      throw new ErrorResponse(
        'Errore nella generazione del token video',
        500,
        'TOKEN_GENERATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Verifica se una videochiamata è attiva
   * @param {string} roomId - ID della stanza
   * @returns {Promise<boolean>} true se la chiamata è attiva
   */
  async isVideoCallActive(roomId) {
    try {
      if (this.activeCalls.has(roomId)) {
        const call = this.activeCalls.get(roomId);
        return call.status === 'in-progress';
      }
      return false;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nella verifica dello stato della videochiamata',
        500,
        'VIDEO_STATUS_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Inizializza una nuova videochiamata
   * @param {string} roomId - ID della stanza
   * @param {string} hostId - ID dell'host
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} Informazioni sulla videochiamata
   */
  async initializeVideoCall(roomId, hostId, options = {}) {
    try {
      // Verifica se esiste già una chiamata attiva
      if (await this.isVideoCallActive(roomId)) {
        throw new ErrorResponse(
          'Una videochiamata è già attiva in questa stanza',
          409,
          'ROOM_IN_USE'
        );
      }

      // Crea la stanza su Twilio
      const room = await this.client.video.rooms.create({
        uniqueName: roomId,
        type: 'group',
        maxParticipants: options.maxParticipants || 10,
        recordParticipantsOnConnect: options.recordParticipantsOnConnect || false,
        statusCallback: options.statusCallback,
        statusCallbackMethod: 'POST'
      });

      // Crea il token per l'host
      const hostToken = this.generateVideoToken(roomId, hostId, 'host');

      // Salva le informazioni della chiamata
      const callInfo = {
        roomId,
        hostId,
        status: 'initialized',
        startTime: new Date(),
        participants: [hostId],
        room: room,
        maxParticipants: options.maxParticipants || 10,
        recordingEnabled: options.recordParticipantsOnConnect || false
      };

      this.activeCalls.set(roomId, callInfo);

      return {
        ...callInfo,
        token: hostToken
      };
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(
        'Errore nell\'inizializzazione della videochiamata',
        500,
        'VIDEO_INIT_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Aggiunge un partecipante alla videochiamata
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @returns {Promise<Object>} Informazioni per il partecipante
   */
  async addParticipant(roomId, userId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      if (call.participants.length >= call.maxParticipants) {
        throw new ErrorResponse(
          'Numero massimo di partecipanti raggiunto',
          403,
          'MAX_PARTICIPANTS_REACHED'
        );
      }

      // Genera il token per il partecipante
      const token = this.generateVideoToken(roomId, userId);

      // Aggiorna la lista dei partecipanti
      call.participants.push(userId);
      this.activeCalls.set(roomId, call);

      return {
        token,
        roomId,
        status: 'joined'
      };
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(
        'Errore nell\'aggiunta del partecipante',
        500,
        'PARTICIPANT_ADD_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Rimuove un partecipante dalla videochiamata
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @returns {Promise<Object>} Informazioni aggiornate sulla chiamata
   */
  async removeParticipant(roomId, userId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      // Rimuovi il partecipante
      call.participants = call.participants.filter(id => id !== userId);
      this.activeCalls.set(roomId, call);

      // Se non ci sono più partecipanti, termina la chiamata
      if (call.participants.length === 0) {
        await this.endVideoCall(roomId);
      }

      return {
        roomId,
        status: 'participant-removed',
        remainingParticipants: call.participants.length
      };
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(
        'Errore nella rimozione del partecipante',
        500,
        'PARTICIPANT_REMOVE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Termina una videochiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Object>} Informazioni sulla videochiamata terminata
   */
  async endVideoCall(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      // Termina la stanza su Twilio
      await this.client.video.rooms(call.room.sid).update({ status: 'completed' });

      // Rimuovi la chiamata dalla lista delle chiamate attive
      this.activeCalls.delete(roomId);

      return {
        roomId,
        status: 'ended',
        endTime: new Date(),
        duration: new Date() - call.startTime,
        participants: call.participants
      };
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(
        'Errore nella terminazione della videochiamata',
        500,
        'VIDEO_END_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Ottiene le informazioni di una videochiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Object>} Informazioni sulla videochiamata
   */
  async getVideoCallInfo(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      return {
        ...call,
        duration: new Date() - call.startTime,
        isActive: call.status === 'in-progress'
      };
    } catch (error) {
      if (error instanceof ErrorResponse) {
        throw error;
      }
      throw new ErrorResponse(
        'Errore nel recupero delle informazioni della videochiamata',
        500,
        'VIDEO_INFO_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Inizia la registrazione di una videochiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Object>} Informazioni sulla registrazione
   */
  async startRecording(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      const recording = await this.client.video.recordings.create({
        roomSid: call.room.sid,
        type: 'video',
        statusCallback: `${process.env.API_URL}/api/video/recording-status`,
        statusCallbackMethod: 'POST'
      });

      call.recording = recording;
      this.activeCalls.set(roomId, call);

      return {
        roomId,
        recordingSid: recording.sid,
        status: recording.status
      };
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'avvio della registrazione',
        500,
        'RECORDING_START_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Ferma la registrazione di una videochiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Object>} Informazioni sulla registrazione
   */
  async stopRecording(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call || !call.recording) {
        throw new ErrorResponse(
          'Registrazione non trovata',
          404,
          'RECORDING_NOT_FOUND'
        );
      }

      const recording = await this.client.video.recordings(call.recording.sid)
        .update({ status: 'stopped' });

      return {
        roomId,
        recordingSid: recording.sid,
        status: recording.status,
        duration: recording.duration
      };
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'arresto della registrazione',
        500,
        'RECORDING_STOP_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Ottiene l'URL di una registrazione
   * @param {string} recordingSid - ID della registrazione
   * @returns {Promise<string>} URL della registrazione
   */
  async getRecordingUrl(recordingSid) {
    try {
      const recording = await this.client.video.recordings(recordingSid).fetch();
      return recording.links.media;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nel recupero dell\'URL della registrazione',
        500,
        'RECORDING_URL_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Imposta la qualità del video per una stanza
   * @param {string} roomId - ID della stanza
   * @param {Object} quality - Configurazione qualità
   * @returns {Promise<Object>} Informazioni aggiornate
   */
  async setVideoQuality(roomId, quality) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      const room = await this.client.video.rooms(call.room.sid).update({
        videoCodecs: quality.codecs || ['VP8', 'H264'],
        maxVideoBitrate: quality.maxBitrate || 2000,
        maxAudioBitrate: quality.maxAudioBitrate || 64
      });

      call.videoQuality = quality;
      this.activeCalls.set(roomId, call);

      return {
        roomId,
        quality: call.videoQuality
      };
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'impostazione della qualità video',
        500,
        'VIDEO_QUALITY_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Invia un messaggio di chat nella videochiamata
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @param {string} message - Messaggio
   * @returns {Promise<Object>} Informazioni sul messaggio
   */
  async sendChatMessage(roomId, userId, message) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      const chatMessage = {
        id: crypto.randomUUID(),
        roomId,
        userId,
        message,
        timestamp: new Date()
      };

      if (!call.chat) {
        call.chat = [];
      }
      call.chat.push(chatMessage);
      this.activeCalls.set(roomId, call);

      return chatMessage;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nell\'invio del messaggio',
        500,
        'CHAT_MESSAGE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Ottiene la cronologia chat di una videochiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Array>} Lista dei messaggi
   */
  async getChatHistory(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      return call.chat || [];
    } catch (error) {
      throw new ErrorResponse(
        'Errore nel recupero della cronologia chat',
        500,
        'CHAT_HISTORY_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Gestisce la riconnessione di un partecipante
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @returns {Promise<Object>} Informazioni sulla riconnessione
   */
  async handleReconnection(roomId, userId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      // Genera un nuovo token
      const token = this.generateVideoToken(roomId, userId);

      // Aggiorna lo stato del partecipante
      if (!call.participants.includes(userId)) {
        call.participants.push(userId);
      }

      this.activeCalls.set(roomId, call);

      return {
        roomId,
        userId,
        token,
        status: 'reconnected'
      };
    } catch (error) {
      throw new ErrorResponse(
        'Errore nella riconnessione',
        500,
        'RECONNECTION_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Gestisce la qualità del video in base alla connessione
   * @param {string} roomId - ID della stanza
   * @param {Object} networkStats - Statistiche della rete
   * @returns {Promise<Object>} Configurazione qualità aggiornata
   */
  async handleAdaptiveQuality(roomId, networkStats) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      // Calcola la qualità ottimale in base alle statistiche di rete
      const quality = this.calculateOptimalQuality(networkStats);

      // Aggiorna la qualità
      await this.setVideoQuality(roomId, quality);

      // Salva le statistiche
      if (!call.networkStats) {
        call.networkStats = [];
      }
      call.networkStats.push({
        timestamp: new Date(),
        ...networkStats,
        quality
      });

      this.activeCalls.set(roomId, call);

      return quality;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nella gestione della qualità adattiva',
        500,
        'ADAPTIVE_QUALITY_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Calcola la qualità ottimale in base alle statistiche di rete
   * @param {Object} stats - Statistiche della rete
   * @returns {Object} Configurazione qualità
   */
  calculateOptimalQuality(stats) {
    const { bandwidth, latency, packetLoss } = stats;

    // Qualità bassa
    if (bandwidth < 1000 || latency > 300 || packetLoss > 5) {
      return {
        maxBitrate: 500,
        maxAudioBitrate: 32,
        codecs: ['VP8'],
        resolution: '480p'
      };
    }

    // Qualità media
    if (bandwidth < 2000 || latency > 200 || packetLoss > 2) {
      return {
        maxBitrate: 1000,
        maxAudioBitrate: 48,
        codecs: ['VP8', 'H264'],
        resolution: '720p'
      };
    }

    // Qualità alta
    return {
      maxBitrate: 2000,
      maxAudioBitrate: 64,
      codecs: ['VP8', 'H264'],
      resolution: '1080p'
    };
  }

  /**
   * Salva la cronologia chat nel database
   * @param {string} roomId - ID della stanza
   * @returns {Promise<void>}
   */
  async saveChatHistory(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call || !call.chat) {
        return;
      }

      // Prepara i dati per il salvataggio
      const chatData = {
        roomId,
        startTime: call.startTime,
        endTime: new Date(),
        messages: call.chat.map(msg => ({
          id: msg.id,
          userId: msg.userId,
          message: msg.message,
          timestamp: msg.timestamp
        }))
      };

      // TODO: Implementa il salvataggio nel database
      // await db.collection('chat_history').insertOne(chatData);

      // Pulisci la chat in memoria
      call.chat = [];
      this.activeCalls.set(roomId, call);
    } catch (error) {
      throw new ErrorResponse(
        'Errore nel salvataggio della cronologia chat',
        500,
        'CHAT_SAVE_ERROR',
        { originalError: error.message }
      );
    }
  }

  /**
   * Sistema di retry per le operazioni fallite
   * @param {Function} operation - Operazione da riprovare
   * @param {Object} options - Opzioni di retry
   * @returns {Promise<any>} Risultato dell'operazione
   */
  async withRetry(operation, options = {}) {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      onRetry = null
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) {
          break;
        }

        // Calcola il delay per il prossimo tentativo
        const nextDelay = delay * Math.pow(backoff, attempt - 1);
        
        // Notifica del retry
        if (onRetry) {
          onRetry(attempt, nextDelay, error);
        }

        // Attendi prima del prossimo tentativo
        await new Promise(resolve => setTimeout(resolve, nextDelay));
      }
    }

    throw lastError;
  }

  /**
   * Gestisce la riconnessione con retry
   * @param {string} roomId - ID della stanza
   * @param {string} userId - ID dell'utente
   * @returns {Promise<Object>} Informazioni sulla riconnessione
   */
  async handleReconnectionWithRetry(roomId, userId) {
    return this.withRetry(
      () => this.handleReconnection(roomId, userId),
      {
        maxAttempts: 5,
        delay: 2000,
        onRetry: (attempt, delay, error) => {
          console.log(`Tentativo di riconnessione ${attempt}/5 tra ${delay}ms`);
        }
      }
    );
  }

  /**
   * Monitora la qualità della chiamata
   * @param {string} roomId - ID della stanza
   * @returns {Promise<Object>} Statistiche della chiamata
   */
  async monitorCallQuality(roomId) {
    try {
      const call = this.activeCalls.get(roomId);
      if (!call) {
        throw new ErrorResponse(
          'Videochiamata non trovata',
          404,
          'CALL_NOT_FOUND'
        );
      }

      const room = await this.client.video.rooms(call.room.sid).fetch();
      const participants = await this.client.video.rooms(call.room.sid)
        .participants
        .list();

      const stats = {
        roomId,
        timestamp: new Date(),
        participants: participants.length,
        quality: call.videoQuality,
        networkStats: call.networkStats?.[call.networkStats.length - 1],
        recording: call.recording ? {
          status: call.recording.status,
          duration: call.recording.duration
        } : null
      };

      // Salva le statistiche
      if (!call.qualityStats) {
        call.qualityStats = [];
      }
      call.qualityStats.push(stats);
      this.activeCalls.set(roomId, call);

      return stats;
    } catch (error) {
      throw new ErrorResponse(
        'Errore nel monitoraggio della qualità',
        500,
        'QUALITY_MONITOR_ERROR',
        { originalError: error.message }
      );
    }
  }
}

// Crea un'istanza singleton del servizio
const videoCallService = new VideoCallService();

module.exports = videoCallService; 