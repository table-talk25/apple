import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Video from 'twilio-video';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  Info,
  Maximize2,
  Minimize2,
  X,
  Wifi,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import videoService from '../../services/videoService';
import styles from './VideoCall.module.css';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'TT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatTimer = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getQualityInfo = (level) => {
  if (level === null || level === undefined || level >= 4) {
    return { label: 'HD · Ottima', className: styles.qualityGood };
  }
  if (level >= 2) {
    return { label: 'Buona', className: styles.qualityMedium };
  }
  return { label: 'Debole', className: styles.qualityPoor };
};

// Keeps a remote participant's audio attached regardless of who is on the main stage
const RemoteAudioTrack = ({ participant }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!participant || !container) return undefined;

    const attachAudio = (track) => {
      if (track.kind !== 'audio') return;
      const el = track.attach();
      el.autoplay = true;
      container.appendChild(el);
    };

    const detachAudio = (track) => {
      if (track.kind !== 'audio') return;
      track.detach().forEach((el) => el.remove());
    };

    participant.tracks.forEach((pub) => {
      if (pub.isSubscribed && pub.track) attachAudio(pub.track);
    });

    participant.on('trackSubscribed', attachAudio);
    participant.on('trackUnsubscribed', detachAudio);

    return () => {
      participant.off('trackSubscribed', attachAudio);
      participant.off('trackUnsubscribed', detachAudio);
      container.querySelectorAll('audio').forEach((el) => el.remove());
    };
  }, [participant]);

  return <div ref={containerRef} className={styles.audioSink} />;
};

// Renders the active remote participant's video track fullscreen (object-fit: cover)
const ActiveRemoteVideo = ({ participant, isSpeaking }) => {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!participant || !videoEl) {
      setHasVideo(false);
      return undefined;
    }

    let attachedTrack = null;

    const handleEnabled = () => setHasVideo(true);
    const handleDisabled = () => setHasVideo(false);

    const attachVideo = (track) => {
      if (track.kind !== 'video') return;
      if (attachedTrack && attachedTrack !== track) {
        attachedTrack.off('enabled', handleEnabled);
        attachedTrack.off('disabled', handleDisabled);
        attachedTrack.detach(videoEl);
      }
      attachedTrack = track;
      track.attach(videoEl);
      setHasVideo(track.isEnabled !== false);
      track.on('enabled', handleEnabled);
      track.on('disabled', handleDisabled);
    };

    const detachVideo = (track) => {
      if (track.kind !== 'video') return;
      track.off('enabled', handleEnabled);
      track.off('disabled', handleDisabled);
      track.detach(videoEl);
      if (attachedTrack === track) {
        attachedTrack = null;
        setHasVideo(false);
      }
    };

    participant.tracks.forEach((pub) => {
      if (pub.isSubscribed && pub.track && pub.track.kind === 'video') {
        attachVideo(pub.track);
      }
    });

    participant.on('trackSubscribed', attachVideo);
    participant.on('trackUnsubscribed', detachVideo);

    return () => {
      participant.off('trackSubscribed', attachVideo);
      participant.off('trackUnsubscribed', detachVideo);
      if (attachedTrack) {
        attachedTrack.off('enabled', handleEnabled);
        attachedTrack.off('disabled', handleDisabled);
        attachedTrack.detach(videoEl);
      }
      setHasVideo(false);
    };
  }, [participant]);

  const identity = participant?.identity || 'Partecipante';

  return (
    <div
      className={`${styles.remoteStage} ${isSpeaking ? styles.remoteStageSpeaking : ''}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`${styles.remoteVideo} ${!hasVideo ? styles.remoteVideoHidden : ''}`}
      />
      {!hasVideo && (
        <div className={styles.remotePlaceholder}>
          <div
            className={`${styles.remoteAvatar} ${
              isSpeaking ? styles.remoteAvatarSpeaking : ''
            }`}
          >
            {getInitials(identity)}
          </div>
          <p className={styles.waitingTitle}>{identity}</p>
          <p className={styles.waitingSubtitle}>Fotocamera disattivata</p>
        </div>
      )}
    </div>
  );
};

const VideoCall = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Twilio state
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [dominantSpeakerSid, setDominantSpeakerSid] = useState(null);
  const [pinnedParticipantSid, setPinnedParticipantSid] = useState(null);
  const [remoteAudioStates, setRemoteAudioStates] = useState({});
  const [networkQuality, setNetworkQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // UI state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sidePanelTab, setSidePanelTab] = useState(null); // null | 'chat' | 'participants'
  const [showInfo, setShowInfo] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Draggable PIP state (null = default CSS bottom-right anchor)
  const [pipPos, setPipPos] = useState(null);
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Refs
  const stageRef = useRef(null);
  const mainAreaRef = useRef(null);
  const pipRef = useRef(null);
  const connectedAtRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localScreenTrackRef = useRef(null);
  const localVideoElRef = useRef(null);

  const tryAttachLocalVideo = useCallback(() => {
    if (localVideoTrackRef.current && localVideoElRef.current) {
      localVideoTrackRef.current.attach(localVideoElRef.current);
    }
  }, []);

  const localVideoRefCallback = useCallback(
    (videoEl) => {
      localVideoElRef.current = videoEl;
      if (videoEl) {
        tryAttachLocalVideo();
      }
    },
    [tryAttachLocalVideo]
  );

  // Track remote participant audio enabled/disabled state for Participants panel
  const syncParticipantAudio = useCallback((participant) => {
    let enabled = true;
    participant.audioTracks.forEach((pub) => {
      if (pub.track) {
        enabled = pub.track.isEnabled;
      } else if (typeof pub.isTrackEnabled === 'boolean') {
        enabled = pub.isTrackEnabled;
      }
    });
    setRemoteAudioStates((prev) => ({ ...prev, [participant.sid]: enabled }));
  }, []);

  // Twilio connection lifecycle (preserves existing connect / track / event logic)
  useEffect(() => {
    let currentRoom = null;
    let isCancelled = false;
    const participantCleanups = new Map();

    const bindParticipantListeners = (p) => {
      syncParticipantAudio(p);

      const onTrackSubscribed = (track) => {
        if (track.kind === 'audio') {
          setRemoteAudioStates((prev) => ({ ...prev, [p.sid]: track.isEnabled }));
          track.on('enabled', () =>
            setRemoteAudioStates((prev) => ({ ...prev, [p.sid]: true }))
          );
          track.on('disabled', () =>
            setRemoteAudioStates((prev) => ({ ...prev, [p.sid]: false }))
          );
        }
      };

      const onTrackUnsubscribed = (track) => {
        if (track.kind === 'audio') {
          setRemoteAudioStates((prev) => ({ ...prev, [p.sid]: false }));
        }
      };

      p.tracks.forEach((pub) => {
        if (pub.isSubscribed && pub.track) onTrackSubscribed(pub.track);
      });

      p.on('trackSubscribed', onTrackSubscribed);
      p.on('trackUnsubscribed', onTrackUnsubscribed);

      participantCleanups.set(p.sid, () => {
        p.off('trackSubscribed', onTrackSubscribed);
        p.off('trackUnsubscribed', onTrackUnsubscribed);
      });
    };

    const startVideoCall = async () => {
      try {
        setLoading(true);
        setError('');

        const [vidTrack, audTrack] = await Promise.all([
          Video.createLocalVideoTrack({ width: 640 }),
          Video.createLocalAudioTrack(),
        ]);

        if (isCancelled) {
          vidTrack.stop();
          audTrack.stop();
          return;
        }

        localVideoTrackRef.current = vidTrack;
        localAudioTrackRef.current = audTrack;
        tryAttachLocalVideo();

        const { token, roomName } = await videoService.getToken(mealId);
        if (isCancelled) {
          vidTrack.stop();
          audTrack.stop();
          return;
        }

        currentRoom = await Video.connect(token, {
          name: roomName,
          tracks: [vidTrack, audTrack],
          dominantSpeaker: true,
          networkQuality: { local: 1, remote: 0 },
        });

        if (isCancelled) {
          currentRoom.disconnect();
          return;
        }

        connectedAtRef.current = currentRoom.connectedAt
          ? new Date(currentRoom.connectedAt).getTime()
          : Date.now();
        setElapsedSeconds(0);
        setRoom(currentRoom);
        setLoading(false);

        const initialParticipants = Array.from(currentRoom.participants.values());
        setParticipants(initialParticipants);
        initialParticipants.forEach(bindParticipantListeners);

        if (currentRoom.dominantSpeaker) {
          setDominantSpeakerSid(currentRoom.dominantSpeaker.sid);
        }

        if (typeof currentRoom.localParticipant.networkQualityLevel === 'number') {
          setNetworkQuality(currentRoom.localParticipant.networkQualityLevel);
        }

        currentRoom.localParticipant.on('networkQualityLevelChanged', (level) => {
          setNetworkQuality(level);
        });

        currentRoom.on('dominantSpeakerChanged', (speaker) => {
          if (speaker) {
            setDominantSpeakerSid(speaker.sid);
          }
        });

        currentRoom.on('participantConnected', (p) => {
          bindParticipantListeners(p);
          setParticipants((prev) => (prev.some((x) => x.sid === p.sid) ? prev : [...prev, p]));
        });

        currentRoom.on('participantDisconnected', (p) => {
          const cleanup = participantCleanups.get(p.sid);
          if (cleanup) {
            cleanup();
            participantCleanups.delete(p.sid);
          }
          setParticipants((prev) => prev.filter((x) => x.sid !== p.sid));
          setPinnedParticipantSid((prev) => (prev === p.sid ? null : prev));
          setDominantSpeakerSid((prev) => (prev === p.sid ? null : prev));
        });
      } catch (err) {
        console.error('❌ [VideoCall] Errore:', err);
        if (!isCancelled) {
          setError('Impossibile accedere alla videochiamata. Verifica i permessi o riprova.');
          setLoading(false);
        }
      }
    };

    startVideoCall();

    return () => {
      isCancelled = true;
      participantCleanups.forEach((cleanup) => cleanup());
      participantCleanups.clear();
      if (currentRoom) currentRoom.disconnect();
      [
        localVideoTrackRef.current,
        localAudioTrackRef.current,
        localScreenTrackRef.current,
      ].forEach((t) => {
        if (t) {
          t.stop();
          t.detach().forEach((el) => el.remove());
        }
      });
      localVideoTrackRef.current = null;
      localAudioTrackRef.current = null;
      localScreenTrackRef.current = null;
    };
  }, [mealId, retryCount, syncParticipantAudio, tryAttachLocalVideo]);

  // Re-attach local video when returning from video-off state or loading
  useEffect(() => {
    if (!loading && isVideoEnabled) {
      tryAttachLocalVideo();
    }
  }, [loading, isVideoEnabled, tryAttachLocalVideo]);

  // Live timer from room.connectedAt (MM:SS)
  useEffect(() => {
    if (!room) return undefined;
    const startTs = room.connectedAt
      ? new Date(room.connectedAt).getTime()
      : connectedAtRef.current || Date.now();

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [room]);

  // Fullscreen state listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // ESC closes side panel, info popover, or leave modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (showLeaveModal) {
        setShowLeaveModal(false);
      } else if (showInfo) {
        setShowInfo(false);
      } else if (sidePanelTab) {
        setSidePanelTab(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showLeaveModal, showInfo, sidePanelTab]);

  // ─── Twilio Controls ─────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const nextEnabled = !isAudioEnabled;
    if (room) {
      room.localParticipant.audioTracks.forEach((pub) => {
        if (pub.track) {
          nextEnabled ? pub.track.enable() : pub.track.disable();
        }
      });
    } else if (localAudioTrackRef.current) {
      nextEnabled
        ? localAudioTrackRef.current.enable()
        : localAudioTrackRef.current.disable();
    }
    setIsAudioEnabled(nextEnabled);
  }, [room, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    const nextEnabled = !isVideoEnabled;
    if (room) {
      room.localParticipant.videoTracks.forEach((pub) => {
        if (pub.track && pub.track !== localScreenTrackRef.current) {
          nextEnabled ? pub.track.enable() : pub.track.disable();
        }
      });
    } else if (localVideoTrackRef.current) {
      nextEnabled
        ? localVideoTrackRef.current.enable()
        : localVideoTrackRef.current.disable();
    }
    setIsVideoEnabled(nextEnabled);
  }, [room, isVideoEnabled]);

  const stopScreenShare = useCallback(() => {
    const screenTrack = localScreenTrackRef.current;
    if (!screenTrack) {
      setIsScreenSharing(false);
      return;
    }
    try {
      if (room?.localParticipant) {
        room.localParticipant.unpublishTrack(screenTrack);
      }
    } catch (err) {
      console.warn('[VideoCall] Errore unpublish screen track:', err);
    }
    screenTrack.stop();
    screenTrack.detach().forEach((el) => el.remove());
    localScreenTrackRef.current = null;
    setIsScreenSharing(false);
  }, [room]);

  const toggleScreenShare = useCallback(async () => {
    if (!room) return;

    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      if (typeof room.localParticipant.publishScreen === 'function') {
        const publication = await room.localParticipant.publishScreen();
        if (publication?.track) {
          localScreenTrackRef.current = publication.track;
          publication.track.mediaStreamTrack.onended = () => stopScreenShare();
        }
        setIsScreenSharing(true);
        return;
      }

      if (!navigator.mediaDevices?.getDisplayMedia) {
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const mediaStreamTrack = stream.getVideoTracks()[0];
      const screenTrack = new Video.LocalVideoTrack(mediaStreamTrack, { name: 'screen' });
      localScreenTrackRef.current = screenTrack;
      await room.localParticipant.publishTrack(screenTrack);
      setIsScreenSharing(true);

      mediaStreamTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        console.error('❌ [VideoCall] Errore condivisione schermo:', err);
      }
      setIsScreenSharing(false);
    }
  }, [room, isScreenSharing, stopScreenShare]);

  const exitToMealDetail = useCallback(() => {
    if (location.state?.fromMealDetail) {
      navigate(-1);
    } else {
      navigate(mealId ? `/meals/${mealId}` : '/meals', { replace: true });
    }
  }, [location.state, mealId, navigate]);

  const confirmLeave = useCallback(() => {
    if (localScreenTrackRef.current) {
      stopScreenShare();
    }
    if (room) {
      room.disconnect();
    }
    [localVideoTrackRef.current, localAudioTrackRef.current].forEach((t) => {
      if (t) {
        t.stop();
        t.detach().forEach((el) => el.remove());
      }
    });
    setShowLeaveModal(false);
    exitToMealDetail();
  }, [room, exitToMealDetail, stopScreenShare]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (stageRef.current?.requestFullscreen) {
          await stageRef.current.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[VideoCall] Fullscreen non supportato:', err);
    }
  }, []);

  const toggleSidePanel = useCallback((tab) => {
    setSidePanelTab((prev) => (prev === tab ? null : tab));
  }, []);

  // ─── Draggable PIP (Mouse + Touch via Pointer Events) ────────────
  const handlePipPointerDown = (e) => {
    const pipEl = pipRef.current;
    const areaEl = mainAreaRef.current;
    if (!pipEl || !areaEl) return;

    const pipRect = pipEl.getBoundingClientRect();
    const areaRect = areaEl.getBoundingClientRect();

    dragOffsetRef.current = {
      x: e.clientX - pipRect.left,
      y: e.clientY - pipRect.top,
    };

    setPipPos({
      left: pipRect.left - areaRect.left,
      top: pipRect.top - areaRect.top,
    });
    setIsDraggingPip(true);

    if (pipEl.setPointerCapture) {
      pipEl.setPointerCapture(e.pointerId);
    }
  };

  const handlePipPointerMove = (e) => {
    if (!isDraggingPip || !pipRef.current || !mainAreaRef.current) return;
    const areaRect = mainAreaRef.current.getBoundingClientRect();
    const pipRect = pipRef.current.getBoundingClientRect();

    const rawLeft = e.clientX - areaRect.left - dragOffsetRef.current.x;
    const rawTop = e.clientY - areaRect.top - dragOffsetRef.current.y;

    const margin = 12;
    const maxLeft = Math.max(margin, areaRect.width - pipRect.width - margin);
    const maxTop = Math.max(margin, areaRect.height - pipRect.height - margin);

    setPipPos({
      left: Math.min(Math.max(margin, rawLeft), maxLeft),
      top: Math.min(Math.max(margin, rawTop), maxTop),
    });
  };

  const handlePipPointerUp = (e) => {
    if (!isDraggingPip) return;
    setIsDraggingPip(false);
    if (pipRef.current?.releasePointerCapture) {
      try {
        pipRef.current.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Active remote participant: pinned > dominant speaker > first remote
  const activeRemoteParticipant = useMemo(() => {
    if (participants.length === 0) return null;
    if (pinnedParticipantSid) {
      const pinned = participants.find((p) => p.sid === pinnedParticipantSid);
      if (pinned) return pinned;
    }
    if (dominantSpeakerSid) {
      const speaker = participants.find((p) => p.sid === dominantSpeakerSid);
      if (speaker) return speaker;
    }
    return participants[0];
  }, [participants, pinnedParticipantSid, dominantSpeakerSid]);

  const secondaryParticipants = useMemo(() => {
    if (!activeRemoteParticipant) return [];
    return participants.filter((p) => p.sid !== activeRemoteParticipant.sid);
  }, [participants, activeRemoteParticipant]);

  // Combined participant list for the side panel
  const allParticipants = useMemo(() => {
    const localName =
      user?.nickname || room?.localParticipant?.identity || 'Tu';
    const localItem = {
      id: room?.localParticipant?.sid || 'local',
      name: `${localName} (Tu)`,
      rawName: localName,
      avatarUrl: user?.profileImage || null,
      isLocal: true,
      isHost: participants.length === 0,
      audioEnabled: isAudioEnabled,
      isSpeaking: false,
    };

    const remoteItems = participants.map((p, index) => ({
      id: p.sid,
      name: p.identity || 'Partecipante',
      rawName: p.identity || 'Partecipante',
      avatarUrl: null,
      isLocal: false,
      isHost: index === 0 && !localItem.isHost,
      audioEnabled: remoteAudioStates[p.sid] !== false,
      isSpeaking: dominantSpeakerSid === p.sid,
    }));

    return [localItem, ...remoteItems];
  }, [user, room, participants, isAudioEnabled, remoteAudioStates, dominantSpeakerSid]);

  const qualityInfo = getQualityInfo(networkQuality);
  const displayRoomName = room?.name || (mealId ? `table2Talk · ${mealId.slice(-6)}` : 'table2Talk');
  const localLabel = user?.nickname || 'Tu';

  // ─── Loading / Error UI ──────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.stateScreen} role="status" aria-live="polite">
          <div className={styles.spinner} />
          <p className={styles.waitingTitle}>Connessione alla videochiamata…</p>
          <p className={styles.waitingSubtitle}>
            Stiamo preparando microfono e fotocamera per il tuo table2Talk.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.stateScreen}>
          <div className={styles.errorCard} role="alert">
            <div className={styles.errorIcon}>
              <AlertCircle size={26} />
            </div>
            <h2 className={styles.waitingTitle}>Connessione non riuscita</h2>
            <p className={styles.waitingSubtitle}>{error}</p>
            <div className={styles.errorActions}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={exitToMealDetail}
              >
                Torna indietro
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setRetryCount((c) => c + 1)}
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stage} ref={stageRef}>
      <div className={styles.mainArea} ref={mainAreaRef}>
        {/* Keep all remote audio tracks active */}
        {participants.map((p) => (
          <RemoteAudioTrack key={`audio-${p.sid}`} participant={p} />
        ))}

        {/* Main remote video or waiting stage */}
        {activeRemoteParticipant ? (
          <ActiveRemoteVideo
            participant={activeRemoteParticipant}
            isSpeaking={dominantSpeakerSid === activeRemoteParticipant.sid}
          />
        ) : (
          <div className={styles.remotePlaceholder}>
            <div className={styles.waitingPulse}>
              <Users size={34} />
            </div>
            <h1 className={styles.waitingTitle}>In attesa degli altri partecipanti</h1>
            <p className={styles.waitingSubtitle}>
              Sei connesso alla stanza <strong>{displayRoomName}</strong>. Appena qualcuno si
              unisce, il video apparirà qui.
            </p>
          </div>
        )}

        {/* Top Bar */}
        <header className={styles.topBar}>
          <div className={styles.topGroup}>
            <div className={styles.topPill}>
              <span className={styles.brandDot} aria-hidden="true" />
              <span className={styles.roomName} title={displayRoomName}>
                {displayRoomName}
              </span>
              <span className={styles.timer} aria-label="Durata chiamata">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div
              className={`${styles.qualityBadge} ${qualityInfo.className}`}
              aria-label={`Qualità connessione: ${qualityInfo.label}`}
            >
              <Wifi size={14} aria-hidden="true" />
              <span>{qualityInfo.label}</span>
            </div>
          </div>

          <div className={styles.topGroup}>
            <button
              type="button"
              className={`${styles.topIconBtn} ${showInfo ? styles.topIconBtnActive : ''}`}
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Informazioni stanza"
              aria-pressed={showInfo}
              title="Informazioni stanza"
            >
              <Info size={18} />
            </button>

            <button
              type="button"
              className={styles.topIconBtn}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
              aria-pressed={isFullscreen}
              title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </header>

        {/* Info Popover */}
        {showInfo && (
          <div className={styles.infoPopover} role="dialog" aria-label="Dettagli stanza">
            <div className={styles.infoPopoverHeader}>
              <h2 className={styles.infoPopoverTitle}>Dettagli stanza</h2>
              <button
                type="button"
                className={styles.panelCloseBtn}
                onClick={() => setShowInfo(false)}
                aria-label="Chiudi dettagli stanza"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Stanza</span>
              <span className={styles.infoValue}>{displayRoomName}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Partecipanti</span>
              <span className={styles.infoValue}>{allParticipants.length}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Durata</span>
              <span className={styles.infoValue}>{formatTimer(elapsedSeconds)}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Qualità</span>
              <span className={styles.infoValue}>{qualityInfo.label}</span>
            </div>
          </div>
        )}

        {/* Screen Share Active Banner */}
        {isScreenSharing && (
          <div className={styles.screenShareBanner} role="status">
            <MonitorUp size={15} aria-hidden="true" />
            <span>Stai condividendo il tuo schermo</span>
          </div>
        )}

        {/* Secondary remote participants switcher (if 2+ remote participants) */}
        {secondaryParticipants.length > 0 && (
          <div className={styles.secondaryStrip} aria-label="Altri partecipanti">
            {secondaryParticipants.map((p) => {
              const speaking = dominantSpeakerSid === p.sid;
              return (
                <button
                  key={p.sid}
                  type="button"
                  className={`${styles.secondaryTile} ${
                    speaking ? styles.secondaryTileSpeaking : ''
                  }`}
                  onClick={() => setPinnedParticipantSid(p.sid)}
                  aria-label={`Mostra ${p.identity} a schermo principale`}
                >
                  <span className={styles.secondaryAvatar}>
                    {getInitials(p.identity)}
                  </span>
                  <span>{p.identity}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Remote Participant Name & Speaking Indicator */}
        {activeRemoteParticipant && (
          <div
            className={`${styles.activeSpeakerPill} ${
              dominantSpeakerSid === activeRemoteParticipant.sid
                ? styles.activeSpeakerPillSpeaking
                : ''
            }`}
          >
            {dominantSpeakerSid === activeRemoteParticipant.sid && (
              <span className={styles.speakingDot} aria-hidden="true" />
            )}
            <span>{activeRemoteParticipant.identity}</span>
            {dominantSpeakerSid === activeRemoteParticipant.sid && (
              <span className={styles.speakingTag}>· Sta parlando</span>
            )}
          </div>
        )}

        {/* Draggable Self-View PIP */}
        <div
          ref={pipRef}
          className={`${styles.pip} ${isDraggingPip ? styles.pipDragging : ''}`}
          style={
            pipPos
              ? {
                  left: `${pipPos.left}px`,
                  top: `${pipPos.top}px`,
                  right: 'auto',
                  bottom: 'auto',
                }
              : undefined
          }
          onPointerDown={handlePipPointerDown}
          onPointerMove={handlePipPointerMove}
          onPointerUp={handlePipPointerUp}
          onPointerCancel={handlePipPointerUp}
          aria-label="Anteprima video locale trascinabile"
        >
          <video
            ref={localVideoRefCallback}
            autoPlay
            muted
            playsInline
            className={`${styles.pipVideo} ${!isVideoEnabled ? styles.pipVideoHidden : ''}`}
          />
          {!isVideoEnabled && (
            <div className={styles.pipFallback}>
              <div className={styles.pipAvatar}>{getInitials(localLabel)}</div>
              <span>Camera spenta</span>
            </div>
          )}
          <div className={styles.pipLabel}>
            <span className={styles.pipName}>{localLabel}</span>
            <span
              className={isAudioEnabled ? styles.pipMicOn : styles.pipMicOff}
              aria-label={isAudioEnabled ? 'Microfono attivo' : 'Microfono disattivato'}
            >
              {isAudioEnabled ? <Mic size={13} /> : <MicOff size={13} />}
            </span>
          </div>
        </div>

        {/* Bottom Centered Controls Bar */}
        <div
          className={styles.controlsBar}
          role="toolbar"
          aria-label="Controlli videochiamata"
        >
          <button
            type="button"
            className={`${styles.ctrlBtn} ${!isAudioEnabled ? styles.ctrlBtnOff : ''}`}
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? 'Disattiva microfono' : 'Attiva microfono'}
            aria-pressed={!isAudioEnabled}
            title={isAudioEnabled ? 'Disattiva microfono' : 'Attiva microfono'}
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${!isVideoEnabled ? styles.ctrlBtnOff : ''}`}
            onClick={toggleVideo}
            aria-label={isVideoEnabled ? 'Disattiva fotocamera' : 'Attiva fotocamera'}
            aria-pressed={!isVideoEnabled}
            title={isVideoEnabled ? 'Disattiva fotocamera' : 'Attiva fotocamera'}
          >
            {isVideoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${isScreenSharing ? styles.ctrlBtnActive : ''}`}
            onClick={toggleScreenShare}
            aria-label={
              isScreenSharing ? 'Interrompi condivisione schermo' : 'Condividi schermo'
            }
            aria-pressed={isScreenSharing}
            title={isScreenSharing ? 'Interrompi condivisione schermo' : 'Condividi schermo'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${
              sidePanelTab === 'chat' ? styles.ctrlBtnActive : ''
            }`}
            onClick={() => toggleSidePanel('chat')}
            aria-label="Apri chat della stanza"
            aria-pressed={sidePanelTab === 'chat'}
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${
              sidePanelTab === 'participants' ? styles.ctrlBtnActive : ''
            }`}
            onClick={() => toggleSidePanel('participants')}
            aria-label={`Apri lista partecipanti (${allParticipants.length})`}
            aria-pressed={sidePanelTab === 'participants'}
            title="Partecipanti"
          >
            <Users size={20} />
            <span className={styles.ctrlBadge}>{allParticipants.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.ctrlBtn} ${styles.ctrlBtnLeave}`}
            onClick={() => setShowLeaveModal(true)}
            aria-label="Esci dalla videochiamata"
            title="Esci dalla chiamata"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>

      {/* Slide-over Side Panel (Chat / Partecipanti) */}
      {sidePanelTab && (
        <aside
          className={styles.sidePanel}
          aria-label={
            sidePanelTab === 'chat' ? 'Chat della stanza' : 'Elenco partecipanti'
          }
        >
          <div className={styles.panelHeader}>
            <div className={styles.panelTabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={sidePanelTab === 'chat'}
                className={`${styles.panelTab} ${
                  sidePanelTab === 'chat' ? styles.panelTabActive : ''
                }`}
                onClick={() => setSidePanelTab('chat')}
              >
                Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidePanelTab === 'participants'}
                className={`${styles.panelTab} ${
                  sidePanelTab === 'participants' ? styles.panelTabActive : ''
                }`}
                onClick={() => setSidePanelTab('participants')}
              >
                Partecipanti ({allParticipants.length})
              </button>
            </div>

            <button
              type="button"
              className={styles.panelCloseBtn}
              onClick={() => setSidePanelTab(null)}
              aria-label="Chiudi pannello laterale"
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles.panelBody}>
            {sidePanelTab === 'chat' ? (
              <div className={styles.chatPlaceholder}>
                <div className={styles.chatPlaceholderIcon}>
                  <MessageSquare size={26} />
                </div>
                <h3 className={styles.chatPlaceholderTitle}>Chat in arrivo</h3>
                <p className={styles.chatPlaceholderText}>
                  Presto potrai inviare messaggi e link direttamente dentro la videochiamata.
                </p>
              </div>
            ) : (
              allParticipants.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.participantRow} ${
                    p.isSpeaking ? styles.participantRowSpeaking : ''
                  }`}
                >
                  <div
                    className={`${styles.participantAvatar} ${
                      p.isHost ? styles.participantAvatarHost : ''
                    }`}
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.rawName}
                        className={styles.participantAvatarImg}
                      />
                    ) : (
                      getInitials(p.rawName)
                    )}
                  </div>

                  <div className={styles.participantMeta}>
                    <div className={styles.participantName}>{p.name}</div>
                    <div className={styles.participantSub}>
                      <span className={p.isHost ? styles.roleBadgeHost : undefined}>
                        {p.isHost ? 'Organizzatore' : 'Partecipante'}
                      </span>
                      {p.isSpeaking && (
                        <span className={styles.speakingTag}>· Sta parlando</span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`${styles.participantMic} ${
                      p.audioEnabled ? styles.participantMicOn : styles.participantMicOff
                    }`}
                    aria-label={
                      p.audioEnabled ? 'Microfono attivo' : 'Microfono disattivato'
                    }
                  >
                    {p.audioEnabled ? <Mic size={15} /> : <MicOff size={15} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Custom Leave Confirmation Modal (no window.confirm) */}
      {showLeaveModal && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLeaveModal(false);
          }}
        >
          <div className={styles.modalCard}>
            <h2 id="leave-modal-title" className={styles.modalTitle}>
              Uscire dalla videochiamata?
            </h2>
            <p className={styles.modalText}>
              Verrai disconnesso dalla stanza e riportato alla pagina del table2Talk.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalBtnCancel}
                onClick={() => setShowLeaveModal(false)}
              >
                Resta in chiamata
              </button>
              <button
                type="button"
                className={styles.modalBtnConfirm}
                onClick={confirmLeave}
              >
                Esci dalla chiamata
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
