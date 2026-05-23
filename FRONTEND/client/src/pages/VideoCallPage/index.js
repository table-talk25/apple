import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Video from 'twilio-video';
import { Button, Container, Spinner, Alert } from 'react-bootstrap';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import videoService from '../../services/videoService';
import styles from './VideoCallPage.module.css';

// ─── Partecipante remoto ───────────────────────────────────────────────────────
const Participant = ({ participant }) => {
  const videoRef = useRef();
  const containerRef = useRef(); // audio lo appendiamo qui dentro, non via ref fisso

  useEffect(() => {
    const attachTrack = (track) => {
      if (track.kind === 'video' && videoRef.current) {
        track.attach(videoRef.current);
      }
      if (track.kind === 'audio') {
        // Lascia che Twilio crei l'elemento <audio> e lo appende nel container
        const audioEl = track.attach();
        audioEl.autoplay = true;
        if (containerRef.current) containerRef.current.appendChild(audioEl);
      }
    };

    const detachTrack = (track) => {
      track.detach().forEach((el) => el.remove());
    };

    participant.on('trackSubscribed', attachTrack);
    participant.on('trackUnsubscribed', detachTrack);

    // Tracce già sottoscritte al mount
    participant.tracks.forEach((pub) => {
      if (pub.isSubscribed && pub.track) attachTrack(pub.track);
    });

    return () => {
      participant.off('trackSubscribed', attachTrack);
      participant.off('trackUnsubscribed', detachTrack);
      // Rimuovi tutti gli elementi audio appenditi
      if (containerRef.current) {
        containerRef.current.querySelectorAll('audio').forEach((el) => el.remove());
      }
    };
  }, [participant]);

  return (
    <div ref={containerRef} className={styles.participantCard}>
      <video ref={videoRef} autoPlay playsInline className={styles.participantVideo} />
      <div className={styles.participantName}>{participant.identity}</div>
    </div>
  );
};

// ─── Pagina principale ──────────────────────────────────────────────────────────
const VideoCallPage = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Ref callback: si attiva nell'istante esatto in cui <video> entra nel DOM
  const localVideoRefCallback = useCallback(
    (videoEl) => {
      if (videoEl && localVideoTrack) {
        localVideoTrack.attach(videoEl);
        console.log('✅ [VideoCall] Video locale attaccato');
      }
    },
    [localVideoTrack]
  );

  useEffect(() => {
    let currentRoom = null;
    let vidTrack = null;
    let audTrack = null;

    const startVideoCall = async () => {
      try {
        setLoading(true);

        // 1. Crea ENTRAMBE le tracce locali esplicitamente.
        //    Quando si usa `tracks:[]`, Twilio ignora le shorthand `audio`/`video`.
        [vidTrack, audTrack] = await Promise.all([
          Video.createLocalVideoTrack({ width: 640 }),
          Video.createLocalAudioTrack(),
        ]);
        setLocalVideoTrack(vidTrack);
        console.log('🎥 [VideoCall] Tracce locali create (video + audio)');

        // 2. Token + connessione
        const { token, roomName } = await videoService.getToken(mealId);
        currentRoom = await Video.connect(token, {
          name: roomName,
          tracks: [vidTrack, audTrack], // entrambe le tracce
        });

        setRoom(currentRoom);
        setLoading(false);
        console.log('✅ [VideoCall] Connesso a:', currentRoom.name);

        setParticipants(Array.from(currentRoom.participants.values()));

        currentRoom.on('participantConnected', (p) => {
          setParticipants((prev) => [...prev, p]);
        });
        currentRoom.on('participantDisconnected', (p) => {
          setParticipants((prev) => prev.filter((x) => x !== p));
        });
      } catch (err) {
        console.error('❌ [VideoCall] Errore:', err);
        setError('Impossibile accedere alla videochiamata. Verifica i permessi o riprova.');
        setLoading(false);
      }
    };

    startVideoCall();

    return () => {
      if (currentRoom) {
        currentRoom.disconnect();
      }
      [vidTrack, audTrack].forEach((t) => {
        if (t) { t.stop(); t.detach().forEach((el) => el.remove()); }
      });
    };
  }, [mealId]);

  const handleDisconnect = () => {
    if (room) room.disconnect();
    navigate(`/meals/${mealId}`);
  };

  const toggleAudio = () => {
    if (!room) return;
    room.localParticipant.audioTracks.forEach((pub) => {
      isAudioEnabled ? pub.track.disable() : pub.track.enable();
    });
    setIsAudioEnabled((v) => !v);
  };

  const toggleVideo = () => {
    if (!room) return;
    room.localParticipant.videoTracks.forEach((pub) => {
      isVideoEnabled ? pub.track.disable() : pub.track.enable();
    });
    setIsVideoEnabled((v) => !v);
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
        {/* Video locale */}
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
        {participants.map((p) => (
          <Participant key={p.sid} participant={p} />
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
