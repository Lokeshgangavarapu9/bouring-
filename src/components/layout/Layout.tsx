import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LandingNavbar } from '../landing/LandingNavbar';
import { LandingFooter } from '../landing/LandingFooter';
import { Footer } from './Footer';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  const isLanding = location.pathname === '/';
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/auth';
  const is3DLab = location.pathname === '/3d-lab';

  // Collapsible sidebar state (ChatGPT-style)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Default open on desktop (window width >= 768)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Automatically close mobile drawer when navigating
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Public Landing Page (Remains 100% unmodified and approved)
  if (isLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F5]">
        <LandingNavbar />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Auth pages (Login, Signup)
  if (isAuthPage || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F5]">
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
      </div>
    );
  }

  // Authenticated App Shell with Collapsible Sidebar & Single Unified UI Language
  return (
    <div
      className={`min-h-screen flex flex-row ${
        is3DLab ? 'bg-[#060810] h-screen overflow-hidden' : 'bg-[#FAF9F5]'
      }`}
    >
      {/* ChatGPT-style Collapsible Navigation Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Content Area (Expands to 100% when sidebar is collapsed) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          is3DLab ? 'h-screen overflow-hidden' : 'min-h-screen'
        }`}
      >
        <AppHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />

        <main
          className={`flex-1 flex flex-col min-w-0 ${
            is3DLab ? 'h-[calc(100vh-3.5rem)] overflow-hidden' : ''
          }`}
        >
          <Outlet />
        </main>

        {!is3DLab && <Footer />}
      </div>
    </div>
  );
};
