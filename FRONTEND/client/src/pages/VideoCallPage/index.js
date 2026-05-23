import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Video from 'twilio-video';
import { Button, Container, Spinner, Alert } from 'react-bootstrap';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import videoService from '../../services/videoService';
import styles from './VideoCallPage.module.css';
import { toast } from 'react-toastify';

// Componente partecipante remoto (fuori da VideoCallPage per evitare re-creazione)
const Participant = ({ participant }) => {
  const videoRef = useRef();
  const audioRef = useRef();

  useEffect(() => {
    const attachTrack = (track) => {
      if (track.kind === 'video' && videoRef.current) track.attach(videoRef.current);
      if (track.kind === 'audio' && audioRef.current) track.attach(audioRef.current);
    };
    const detachTrack = (track) => track.detach();

    participant.on('trackSubscribed', attachTrack);
    participant.on('trackUnsubscribed', detachTrack);

    // Tracce già sottoscritte al mount
    participant.tracks.forEach((pub) => {
      if (pub.isSubscribed && pub.track) attachTrack(pub.track);
    });

    return () => {
      participant.off('trackSubscribed', attachTrack);
      participant.off('trackUnsubscribed', detachTrack);
    };
  }, [participant]);

  return (
    <div className={styles.participantCard}>
      <video ref={videoRef} autoPlay playsInline className={styles.participantVideo} />
      <audio ref={audioRef} autoPlay />
      <div className={styles.participantName}>{participant.identity}</div>
    </div>
  );
};

const VideoCallPage = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [localTrack, setLocalTrack] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Ref callback: viene chiamato da React nel momento esatto in cui
  // l'elemento <video> entra nel DOM. A quel punto attacchiamo la traccia.
  const localVideoRefCallback = useCallback(
    (videoEl) => {
      if (videoEl && localTrack) {
        localTrack.attach(videoEl);
        console.log('✅ [VideoCall] Video locale attaccato via ref callback');
      }
    },
    [localTrack]
  );

  useEffect(() => {
    let currentRoom = null;
    let localVideoTrack = null;

    const startVideoCall = async () => {
      try {
        setLoading(true);

        // 1. Crea la traccia video locale ESPLICITAMENTE prima di connettersi
        //    Così abbiamo la certezza che esista al momento della connessione.
        localVideoTrack = await Video.createLocalVideoTrack({ width: 640 });
        setLocalTrack(localVideoTrack);
        console.log('🎥 [VideoCall] Traccia locale creata:', localVideoTrack);

        // 2. Richiedi token e connettiti
        const { token, roomName } = await videoService.getToken(mealId);
        console.log('🎥 [VideoCall] Connessione alla stanza:', roomName);

        currentRoom = await Video.connect(token, {
          name: roomName,
          tracks: [localVideoTrack], // Passa la traccia già creata
          audio: true,
        });

        setRoom(currentRoom);
        setLoading(false);
        console.log('✅ [VideoCall] Connesso:', currentRoom.name);

        // Partecipanti già presenti
        setParticipants(Array.from(currentRoom.participants.values()));

        currentRoom.on('participantConnected', (p) => {
          console.log('👤 Entrato:', p.identity);
          setParticipants((prev) => [...prev, p]);
        });
        currentRoom.on('participantDisconnected', (p) => {
          console.log('👋 Uscito:', p.identity);
          setParticipants((prev) => prev.filter((x) => x !== p));
        });
        currentRoom.on('disconnected', handleDisconnectCleanup);
      } catch (err) {
        console.error('❌ [VideoCall] Errore:', err);
        setError('Impossibile accedere alla videochiamata. Verifica i permessi o riprova.');
        setLoading(false);
      }
    };

    const handleDisconnectCleanup = () => {
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.detach().forEach((el) => el.remove());
      }
    };

    startVideoCall();

    return () => {
      if (currentRoom) {
        currentRoom.disconnect();
        currentRoom.localParticipant.tracks.forEach((pub) => {
          pub.track.stop();
          pub.track.detach().forEach((el) => el.remove());
        });
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.detach().forEach((el) => el.remove());
      }
    };
  }, [mealId]);

  const handleDisconnect = () => {
    if (room) room.disconnect();
    if (localTrack) {
      localTrack.stop();
      localTrack.detach().forEach((el) => el.remove());
    }
    navigate(`/meals/${mealId}`);
  };

  const toggleAudio = () => {
    if (room) {
      room.localParticipant.audioTracks.forEach((pub) => {
        pub.track.enable(!isAudioEnabled);
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (room) {
      room.localParticipant.videoTracks.forEach((pub) => {
        isVideoEnabled ? pub.track.disable() : pub.track.enable();
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
      </div>
    );
  if (error)
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => navigate(-1)}>Torna Indietro</Button>
      </Container>
    );

  return (
    <div className={styles.videoPage}>
      <div className={styles.videoGrid}>
        {/* Video locale — il ref callback attacca la traccia appena l'elemento è nel DOM */}
        <div className={styles.localVideoContainer}>
          <video
            ref={localVideoRefCallback}
            autoPlay
            muted
            playsInline
            className={styles.localVideo}
          />
          <div className={styles.localLabel}>Tu {!isAudioEnabled && '(Muted)'}</div>
        </div>

        {/* Partecipanti remoti */}
        {participants.map((participant) => (
          <Participant key={participant.sid} participant={participant} />
        ))}
      </div>

      <div className={styles.controlsBar}>
        <button
          className={`${styles.controlBtn} ${!isAudioEnabled ? styles.btnOff : ''}`}
          onClick={toggleAudio}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <button className={styles.disconnectBtn} onClick={handleDisconnect}>
          <FaPhoneSlash />
        </button>

        <button
          className={`${styles.controlBtn} ${!isVideoEnabled ? styles.btnOff : ''}`}
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;
