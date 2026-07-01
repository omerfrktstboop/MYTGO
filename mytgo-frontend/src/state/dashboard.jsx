import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { apiRequest } from "../services/apiClient";
import { useSession } from "./session.jsx";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { token, user } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [valetRequests, setValetRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!token || !user) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [vehiclesData, appointmentsData, valetData, conversationsData, notificationsData, unreadCountData] =
        await Promise.all([
          apiRequest("/api/v1/vehicles", { token }).catch(() => []),
          apiRequest("/api/v1/appointments", { token }).catch(() => []),
          apiRequest("/api/v1/valet-requests", { token }).catch(() => []),
          apiRequest("/api/v1/conversations", { token }).catch(() => []),
          apiRequest("/api/v1/notifications", { token }).catch(() => []),
          apiRequest("/api/v1/notifications/unread-count", { token }).catch(() => ({ unread_count: 0 })),
        ]);

      setVehicles(vehiclesData);
      setAppointments(appointmentsData);
      setValetRequests(valetData);
      setConversations(conversationsData);
      setNotifications(notificationsData);
      if (user.role === "admin") {
        const userList = await apiRequest("/api/v1/users", { token }).catch(() => []);
        setUsers(userList);
      } else {
        setUsers([]);
      }
      return unreadCountData.unread_count ?? 0;
    } catch (err) {
      setError(err.message || "Veri yüklenemedi");
      return 0;
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const notify = useCallback((message) => {
    setNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
    }, 2600);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    },
    [],
  );

  const unreadNotificationCount = notifications.filter((notification) => !notification.read_at).length;

  const value = useMemo(
    () => ({
      token,
      user,
      vehicles,
      appointments,
      valetRequests,
      conversations,
      notifications,
      users,
      loading,
      error,
      notice,
      unreadNotificationCount,
      refresh,
      notify,
      setNotice,
    }),
    [
      appointments,
      conversations,
      error,
      loading,
      notice,
      notifications,
      notify,
      refresh,
      token,
      unreadNotificationCount,
      user,
      users,
      valetRequests,
      vehicles,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
