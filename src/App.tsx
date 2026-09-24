import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { Layout } from './components/layout/Layout';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { PeoplePage } from './pages/PeoplePage';
import { RequestsPage } from './pages/RequestsPage';
import { MoleculePage } from './pages/MoleculePage';
import { ThreeDLabPage } from './pages/ThreeDLabPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NetworkProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Public Routes */}
                <Route index element={<LandingPage />} />
                <Route path="login" element={<AuthPage />} />
                <Route path="signup" element={<AuthPage />} />
                <Route path="auth" element={<AuthPage />} />

                {/* Primary Authenticated Routes */}
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="molecule"
                  element={
                    <ProtectedRoute>
                      <MoleculePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="people"
                  element={
                    <ProtectedRoute>
                      <PeoplePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="requests"
                  element={
                    <ProtectedRoute>
                      <RequestsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="3d-lab"
                  element={
                    <ProtectedRoute>
                      <ThreeDLabPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Backward Compatibility Redirects */}
                <Route path="dashboard" element={<Navigate to="/profile" replace />} />
                <Route path="network" element={<Navigate to="/profile" replace />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </NetworkProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
