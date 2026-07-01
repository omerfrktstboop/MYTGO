import React from "react";
import { BellRing } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import { Panel, EmptyState } from "../../dashboard/shared.jsx";

const notificationTypeLabels = {
  "appointment.created": "Randevu oluşturuldu",
  "appointment.status_changed": "Randevu durumu",
  "appointment.quote_sent": "Teklif hazır",
  "valet.created": "Vale talebi",
  "valet.status_changed": "Transfer durumu",
};

function formatNotificationTimestamp(value) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPanel() {
  const { token, notifications, refresh, notify } = useDashboard();
  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  async function markAsRead(id) {
    await apiRequest(`/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      token,
    });
    await refresh();
    notify("Bildirim güncellendi");
  }

  return (
    <Panel title="Bildirimler" icon={BellRing}>
      <div className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Canlı olay akışı</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Servis, vale ve chat olayları burada görünür.</p>
          </div>
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">{unreadCount} okunmamış</span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Henüz bildirim yok" description="Olay akışı başladığında yeni bildirimler burada listelenecek." />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-[1.75rem] border p-4 shadow-sm transition ${
                notification.read_at
                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
                  : "border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 rounded-full ${notification.read_at ? "bg-slate-300" : "bg-red-600"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-950 dark:text-slate-50">{notification.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-red-600 dark:text-red-400">
                        {notificationTypeLabels[notification.event_type] ?? notification.event_type}
                      </p>
                    </div>
                    {!notification.read_at ? (
                      <button className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white" type="button" onClick={() => markAsRead(notification.id)}>
                        Okundu işaretle
                      </button>
                    ) : (
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-700 ring-1 ring-red-100 dark:bg-slate-950 dark:text-red-200 dark:ring-red-900/40">
                        Okundu
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatNotificationTimestamp(notification.created_at)}</span>
                    <span>•</span>
                    <span>
                      {notification.entity_type ?? "genel"}
                      {notification.entity_id ? ` #${notification.entity_id}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
