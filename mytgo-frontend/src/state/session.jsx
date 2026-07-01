import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest, clearStoredToken, getStoredToken, setStoredToken } from "../services/apiClient";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    let alive = true;
    apiRequest("/api/v1/auth/me", { token })
      .then((nextUser) => {
        if (alive) {
          setUser(nextUser);
        }
      })
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (alive) {
          setBooting(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [token]);

  async function authenticate(mode, payload) {
    const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const response = await apiRequest(path, {
      method: "POST",
      body: payload,
      token: null,
    });

    setStoredToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    return response;
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      booting,
      isAuthenticated: Boolean(token && user),
      authenticate,
      logout,
    }),
    [booting, token, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

