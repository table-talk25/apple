// File: src/App.js
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { NotificationProvider } from './contexts/NotificationContext';

import Layout from './components/layout/Layout';
import PrivateRoute from './components/common/PrivateRoute';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import usePushPermission from './hooks/usePushPermission';
import { setupPush } from './services/pushNotificationService';
import Spinner from './components/common/Spinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initNotificationSound } from './utils/notificationSound';

const HomePage = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/Auth/Login'));
const RegisterPage = lazy(() => import('./pages/Auth/Register'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPassword'));
const VerifyEmailPage = lazy(() => import('./pages/Auth/VerifyEmail'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfile'));
const MealsPage = lazy(() => import('./pages/Meals/MealsPage'));
const SearchMealsPage = lazy(() => import('./pages/Meals/SearchMealsPage'));
const MealDetailPage = lazy(() => import('./pages/Meals/MealDetailPage'));
const CreateMealPage = lazy(() => import('./pages/Meals/CreateMealPage'));
const EditMealPage = lazy(() => import('./pages/Meals/EditMealPage'));
const MealHistoryPage = lazy(() => import('./pages/Meals/MealHistoryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));
const VideoCallPage = lazy(() => import('./pages/VideoCallPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ChatListPage = lazy(() => import('./pages/ChatListPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));

const App = () => {
  console.log('--- L\'APP SI STA CARICANDO ---');
  const navigate = useNavigate();

  React.useEffect(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.display = 'none';
      loader.style.visibility = 'hidden';
      loader.style.opacity = '0';
      setTimeout(() => { try { loader.remove(); } catch (e) {} }, 300);
    }
  }, []);

  // Inizializza l'AudioContext e registra il listener per sblocco su mobile
  useEffect(() => {
    initNotificationSound();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🔥 Initializing app with push notifications...');
      try {
        if (Capacitor.isNativePlatform()) {
          const pushSetupSuccess = await setupPush();
          console.log('🔥 Push notifications setup result:', pushSetupSuccess);
        } else {
          console.log('📱 Push notifications non disponibili su web - saltato');
        }
      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }

      setTimeout(async () => {
        try {
          if (typeof CapacitorApp !== 'undefined') {
            CapacitorApp.addListener('backButton', ({ canGoBack }) => {
              if (canGoBack) { navigate(-1); } else { CapacitorApp.exitApp(); }
            });
          }
        } catch (error) {
          console.warn('[App] Impossibile configurare back button listener:', error);
        }
        try {
          if (Capacitor.isNativePlatform() && typeof Keyboard !== 'undefined') {
            await Keyboard.setResizeMode({ mode: 'body' });
          }
        } catch (error) {
          console.warn('[App] Impossibile configurare keyboard resize mode:', error);
        }
      }, 2000);
    };
    initializeApp();
    return () => {
      try { CapacitorApp.removeAllListeners(); } catch (error) {}
    };
  }, [navigate]);

  usePushPermission();

  return (
    <ErrorBoundary componentName="App">
      <NotificationProvider>
        <Suspense fallback={<Spinner fullscreen label="Caricamento app..." />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Rotte Pubbliche */}
              <Route index element={<HomePage />} />
              <Route path="meals" element={<MealsPage />} />
              <Route path="meals/search" element={<SearchMealsPage />} />

              {/* Rotte Private */}
              <Route path="/chat" element={
                <PrivateRoute requireCompleteProfile={true}>
                  <ChatListPage />
                </PrivateRoute>
              } />
              <Route path="/chat/:chatId" element={
                <PrivateRoute requireCompleteProfile={true}>
                  <ChatPage />
                </PrivateRoute>
              } />
              <Route path="/meals/:mealId/video" element={
                <PrivateRoute requireCompleteProfile={true}>
                  <VideoCallPage />
                </PrivateRoute>
              } />
              <Route path="/video/:mealId" element={
                <PrivateRoute requireCompleteProfile={true}>
                  <VideoCallPage />
                </PrivateRoute>
              } />
              <Route path="public-profile/:userId" element={<PublicProfilePage />} />
              <Route path="map" element={<PrivateRoute requireCompleteProfile={true}><MapPage /></PrivateRoute>} />
              <Route path="impostazioni/profilo" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="my-meals" element={<PrivateRoute requireCompleteProfile={true}><MealHistoryPage /></PrivateRoute>} />
              <Route path="meals/history" element={<PrivateRoute requireCompleteProfile={true}><MealHistoryPage /></PrivateRoute>} />
              <Route path="meals/create" element={<PrivateRoute requireCompleteProfile={true}><CreateMealPage /></PrivateRoute>} />
              <Route path="meals/edit/:id" element={<PrivateRoute requireCompleteProfile={true}><EditMealPage /></PrivateRoute>} />
              <Route path="meals/:mealId" element={<PrivateRoute requireCompleteProfile={true}><MealDetailPage /></PrivateRoute>} />
            </Route>

            {/* Rotte senza layout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/termini-e-condizioni" element={<TermsAndConditionsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
