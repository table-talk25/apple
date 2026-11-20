import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Video from 'twilio-video';
import videoService from '../../services/videoService';
import VideoCall from './index';

jest.mock('twilio-video', () => ({
  createLocalVideoTrack: jest.fn(),
  createLocalAudioTrack: jest.fn(),
  connect: jest.fn(),
  LocalVideoTrack: jest.fn(),
}));

jest.mock('../../services/videoService', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', nickname: 'Giulia', profileImage: null },
  }),
}));

const createEmitter = () => {
  const listeners = {};
  return {
    on(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    off(event, fn) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((f) => f !== fn);
    },
    emit(event, ...args) {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
  };
};

describe('VideoCall Google Meet UI & Twilio integration', () => {
  let mockVideoTrack;
  let mockAudioTrack;
  let mockScreenTrack;
  let mockRemoteParticipant;
  let mockRoom;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVideoTrack = {
      kind: 'video',
      isEnabled: true,
      attach: jest.fn(),
      detach: jest.fn(() => []),
      enable: jest.fn(() => {
        mockVideoTrack.isEnabled = true;
      }),
      disable: jest.fn(() => {
        mockVideoTrack.isEnabled = false;
      }),
      stop: jest.fn(),
    };

    mockAudioTrack = {
      kind: 'audio',
      isEnabled: true,
      attach: jest.fn(),
      detach: jest.fn(() => []),
      enable: jest.fn(() => {
        mockAudioTrack.isEnabled = true;
      }),
      disable: jest.fn(() => {
        mockAudioTrack.isEnabled = false;
      }),
      stop: jest.fn(),
    };

    mockScreenTrack = {
      kind: 'video',
      mediaStreamTrack: { onended: null },
      stop: jest.fn(),
      detach: jest.fn(() => []),
    };

    const remoteEmitter = createEmitter();
    mockRemoteParticipant = {
      sid: 'PA_REMOTE_1',
      identity: 'Marco Rossi',
      tracks: new Map(),
      audioTracks: new Map(),
      ...remoteEmitter,
    };

    const localEmitter = createEmitter();
    const roomEmitter = createEmitter();

    mockRoom = {
      name: 'Cena Toscana',
      connectedAt: new Date(Date.now() - 65000).toISOString(),
      dominantSpeaker: mockRemoteParticipant,
      participants: new Map([[mockRemoteParticipant.sid, mockRemoteParticipant]]),
      localParticipant: {
        sid: 'PA_LOCAL',
        identity: 'Giulia',
        networkQualityLevel: 5,
        audioTracks: new Map([['aud1', { track: mockAudioTrack }]]),
        videoTracks: new Map([['vid1', { track: mockVideoTrack }]]),
        publishScreen: jest.fn().mockResolvedValue({ track: mockScreenTrack }),
        unpublishTrack: jest.fn(),
        ...localEmitter,
      },
      disconnect: jest.fn(),
      ...roomEmitter,
    };

    Video.createLocalVideoTrack.mockResolvedValue(mockVideoTrack);
    Video.createLocalAudioTrack.mockResolvedValue(mockAudioTrack);
    videoService.getToken.mockResolvedValue({ token: 'fake-token', roomName: 'Cena Toscana' });
    Video.connect.mockResolvedValue(mockRoom);
  });

  const renderCall = () =>
    render(
      <MemoryRouter initialEntries={['/meals/meal123/video']}>
        <Routes>
          <Route path="/meals/:mealId/video" element={<VideoCall />} />
          <Route path="/meals/:mealId" element={<div data-testid="meal-detail">Meal Detail</div>} />
        </Routes>
      </MemoryRouter>
    );

  test('renders stage, top bar, speaking indicator, controls, side panel, ESC close, and leave modal', async () => {
    renderCall();

    await waitFor(() => {
      expect(screen.getByText('Cena Toscana')).toBeInTheDocument();
    });

    // Quality badge & timer
    expect(screen.getByText('HD · Ottima')).toBeInTheDocument();
    expect(screen.getByLabelText('Durata chiamata').textContent).toMatch(/^\d{2}:\d{2}$/);

    // Dominant speaker indicator
    expect(screen.getByText(/Sta parlando/i)).toBeInTheDocument();

    // Mic toggle calls Twilio track disable/enable
    const micBtn = screen.getByRole('button', { name: /Disattiva microfono/i });
    fireEvent.click(micBtn);
    expect(mockAudioTrack.disable).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Attiva microfono/i }));
    expect(mockAudioTrack.enable).toHaveBeenCalledTimes(1);

    // Camera toggle calls Twilio track disable/enable
    const camBtn = screen.getByRole('button', { name: /Disattiva fotocamera/i });
    fireEvent.click(camBtn);
    expect(mockVideoTrack.disable).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Attiva fotocamera/i }));
    expect(mockVideoTrack.enable).toHaveBeenCalledTimes(1);

    // Screen share calls publishScreen & unpublishTrack
    const shareBtn = screen.getByRole('button', { name: /Condividi schermo/i });
    await act(async () => {
      fireEvent.click(shareBtn);
    });
    expect(mockRoom.localParticipant.publishScreen).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Interrompi condivisione schermo/i }));
    expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(mockScreenTrack);

    // Chat side panel placeholder
    fireEvent.click(screen.getByRole('button', { name: /Apri chat della stanza/i }));
    expect(screen.getByText('Chat in arrivo')).toBeInTheDocument();

    // Switch to Partecipanti tab
    fireEvent.click(screen.getByRole('tab', { name: /Partecipanti/i }));
    expect(screen.getByText('Giulia (Tu)')).toBeInTheDocument();
    expect(screen.getAllByText('Marco Rossi').length).toBeGreaterThan(0);

    // ESC closes side panel
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tab', { name: /Partecipanti/i })).not.toBeInTheDocument();

    // Leave opens custom confirmation modal and disconnects on confirm
    fireEvent.click(screen.getByRole('button', { name: /Esci dalla videochiamata/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Uscire dalla videochiamata?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Esci dalla chiamata/i }));
    expect(mockRoom.disconnect).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('meal-detail')).toBeInTheDocument();
    });
  });
});
