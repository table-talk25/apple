import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Video from 'twilio-video';
import { Button, Container, Spinner, Alert } from 'react-bootstrap';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import videoService from '../../services/videoService';
import styles from './VideoCallPage.module.css'; // Assicurati di avere un CSS base o usa stili inline per test
import { toast } from 'react-toastify';

const VideoCallPage = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Refs per i container video (Evita re-render inutili)
  const localVideoRef = useRef();
  const remoteParticipantsRef = useRef();

  useEffect(() => {
    let currentRoom = null;

    const startVideoCall = async () => {
      try {
        setLoading(true);
        console.log('🎥 [VideoCall] Richiesta token per pasto:', mealId);
        
        const { token, roomName } = await videoService.getToken(mealId);
        
        console.log('🎥 [VideoCall] Connessione alla stanza Twilio:', roomName);
        
        // Connessione a Twilio
        currentRoom = await Video.connect(token, {
          name: roomName,
          audio: true,
          video: { width: 640 } // Risparmia banda
        });

        setRoom(currentRoom);
        setLoading(false);
        console.log('✅ [VideoCall] Connesso alla stanza:', currentRoom.name);

        // --- GESTIONE TRACCIA LOCALE ---
        const localPub = Array.from(currentRoom.localParticipant.videoTracks.values())[0];
        if (localPub && localVideoRef.current) {
           localPub.track.attach(localVideoRef.current);
        }

        // --- GESTIONE PARTECIPANTI ESISTENTI ---
        const existingParticipants = Array.from(currentRoom.participants.values());
        setParticipants(existingParticipants);

        // --- EVENT LISTENERS ---
        
        // Qualcuno si unisce
        currentRoom.on('participantConnected', (participant) => {
          console.log('👤 [VideoCall] Partecipante entrato:', participant.identity);
          setParticipants(prev => [...prev, participant]);
        });

        // Qualcuno esce
        currentRoom.on('participantDisconnected', (participant) => {
          console.log('👋 [VideoCall] Partecipante uscito:', participant.identity);
          setParticipants(prev => prev.filter(p => p !== participant));
        });
        
        // Gestione disconnessione locale (se cade la linea)
        currentRoom.on('disconnected', () => {
           handleDisconnect();
        });

      } catch (err) {
        console.error('❌ [VideoCall] Errore connessione:', err);
        setError('Impossibile accedere alla videochiamata. Verifica i permessi o riprova.');
        setLoading(false);
      }
    };

    startVideoCall();

    // Cleanup on unmount (CRUCIALE)
    return () => {
      if (currentRoom) {
        currentRoom.disconnect();
        currentRoom.localParticipant.tracks.forEach(publication => {
            publication.track.stop(); // Spegni la lucina della cam
            const attachedElements = publication.track.detach();
            attachedElements.forEach(element => element.remove());
        });
      }
    };
  }, [mealId]);

  // Funzione per renderizzare il video remoto di un partecipante
  const Participant = ({ participant }) => {
    const videoRef = useRef();
    const audioRef = useRef();

    useEffect(() => {
      const trackSubscribed = (track) => {
        if (track.kind === 'video' && videoRef.current) track.attach(videoRef.current);
        if (track.kind === 'audio' && audioRef.current) track.attach(audioRef.current);
      };

      const trackUnsubscribed = (track) => {
        track.detach();
      };

      participant.on('trackSubscribed', trackSubscribed);
      participant.on('trackUnsubscribed', trackUnsubscribed);

      participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
          trackSubscribed(publication.track);
        }
      });

      return () => {
        participant.off('trackSubscribed', trackSubscribed);
        participant.off('trackUnsubscribed', trackUnsubscribed);
      };
    }, [participant]);

    return (
      <div className={styles.participantCard}>
        <video ref={videoRef} autoPlay playsInline className={styles.participantVideo} />
        <audio ref={audioRef} autoPlay muted={false} />
        <div className={styles.participantName}>{participant.identity}</div>
      </div>
    );
  };

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
    }
    navigate(`/meals/${mealId}`); // Torna al dettaglio pasto
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach(pub => {
        pub.track.enable(!isAudioEnabled);
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach(pub => {
        if (isVideoEnabled) {
            pub.track.disable(); // Non stop(), solo disable per poter riattivare
        } else {
            pub.track.enable();
        }
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" /></div>;
  if (error) return <Container className="mt-5"><Alert variant="danger">{error}</Alert><Button onClick={() => navigate(-1)}>Torna Indietro</Button></Container>;

  return (
    <div className={styles.videoPage}>
      {/* Griglia Video */}
      <div className={styles.videoGrid}>
        {/* Utente Locale */}
        <div className={styles.localVideoContainer}>
             <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
             <div className={styles.localLabel}>Tu {isAudioEnabled ? '' : '(Muted)'}</div>
        </div>
        
        {/* Partecipanti Remoti */}
        {participants.map(participant => (
          <Participant key={participant.sid} participant={participant} />
        ))}
      </div>

      {/* Barra Controlli */}
      <div className={styles.controlsBar}>
        <button className={`${styles.controlBtn} ${!isAudioEnabled ? styles.btnOff : ''}`} onClick={toggleAudio}>
            {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        
        <button className={styles.disconnectBtn} onClick={handleDisconnect}>
            <FaPhoneSlash />
        </button>
        
        <button className={`${styles.controlBtn} ${!isVideoEnabled ? styles.btnOff : ''}`} onClick={toggleVideo}>
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;
