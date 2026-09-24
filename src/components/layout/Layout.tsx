import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { LandingNavbar } from '../landing/LandingNavbar';
import { LandingFooter } from '../landing/LandingFooter';

export const Layout: React.FC = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isDarkWorkspace = location.pathname === '/3d-lab' || location.pathname === '/molecule';

  return (
    <div className={isDarkWorkspace ? "h-screen flex flex-col bg-[#060810] overflow-hidden" : "min-h-screen flex flex-col bg-[#FAF9F5]"}>
      {isLanding ? <LandingNavbar /> : <Navbar />}
      <main className={isDarkWorkspace ? "flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#060810]" : "flex-1 flex flex-col"}>
        <Outlet />
      </main>
      {!isDarkWorkspace && (isLanding ? <LandingFooter /> : <Footer />)}
    </div>
  );
};

