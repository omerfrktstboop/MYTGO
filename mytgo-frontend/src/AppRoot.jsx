import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardScreen from "./screens/DashboardScreen.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import { DashboardProvider } from "./state/dashboard.jsx";
import { SessionProvider, useSession } from "./state/session.jsx";
import { defaultSectionByRole } from "./dashboard/config.js";
import { ShellFrame } from "./dashboard/shared.jsx";

function DashboardEntry() {
  const { booting, isAuthenticated, user } = useSession();

  if (booting) {
    return <ShellFrame title="E-Cars" subtitle="Bağlanıyor..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/app/${defaultSectionByRole[user.role] ?? "vehicles"}`} replace />;
}

function DashboardRoute() {
  const { booting, isAuthenticated, user } = useSession();

  if (booting) {
    return <ShellFrame title="E-Cars" subtitle="Bağlanıyor..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardProvider>
      <DashboardScreen />
    </DashboardProvider>
  );
}

export default function AppRoot() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/" element={<DashboardEntry />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/app" element={<DashboardEntry />} />
          <Route path="/app/:section" element={<DashboardRoute />} />
          <Route path="*" element={<DashboardEntry />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
