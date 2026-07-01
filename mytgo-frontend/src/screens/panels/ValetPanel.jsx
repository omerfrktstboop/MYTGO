import React, { useState } from "react";
import { CarFront, MapPin } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import {
  buildValetTimeline,
  getDetailRows,
  serviceLabels,
  statusLabels,
} from "../../appDetails.js";
import { Button, Input } from "../../ui/system.js";
import { CardGrid, DetailRows, EmptyState, InfoCard, Panel, StatusTimeline } from "../../dashboard/shared.jsx";
import TrackingMap from "./TrackingMap.jsx";

function TrackingStub() {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
      Canlı harita bağlantısı bu sürümde veri akışının yanında sade bir konum özetinde gösterilir.
    </div>
  );
}

export default function ValetPanel() {
  const { token, user, appointments, valetRequests, refresh, notify } = useDashboard();
  const [form, setForm] = useState({
    appointment_id: "",
    pickup_address: "Müşteri Adresi",
    dropoff_address: "E-Car Sanayi",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/valet-requests", {
        method: "POST",
        token,
        body: {
          appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
          pickup_address: form.pickup_address,
          dropoff_address: form.dropoff_address,
        },
      });
      await refresh();
      notify("Vale isteği oluşturuldu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title={user.role === "admin" ? "Vale" : "Transfer"} icon={MapPin}>
      {user.role === "customer" ? (
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Randevu</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              value={form.appointment_id}
              onChange={(event) => setForm({ ...form, appointment_id: event.target.value })}
            >
              <option value="">Bağımsız</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  #{appointment.id} {serviceLabels[appointment.service_type]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Alış</span>
            <Input
              value={form.pickup_address}
              onChange={(event) => setForm({ ...form, pickup_address: event.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>Teslim</span>
            <Input
              value={form.dropoff_address}
              onChange={(event) => setForm({ ...form, dropoff_address: event.target.value })}
            />
          </label>
          <Button className="w-full sm:col-span-3" leftIcon={<CarFront size={18} />} loading={submitting} type="submit">
            Vale Çağır
          </Button>
        </form>
      ) : null}

      {user.role !== "customer" ? <TrackingMap token={token} transfers={valetRequests} role={user.role} /> : null}

      {valetRequests.length === 0 ? (
        <EmptyState
          title="Transfer yok"
          description="Yeni vale isteği oluştuğunda takip ve durum kartları burada listelenecek."
          actionLabel="Yenile"
          onAction={refresh}
        />
      ) : (
        <CardGrid>
          {valetRequests.map((transfer) => (
            <InfoCard
              key={transfer.id}
              icon={MapPin}
              title={`Transfer #${transfer.id}`}
              meta={statusLabels[transfer.status]}
              description={`${transfer.pickup_address ?? "Alış yok"} → ${transfer.dropoff_address ?? "Bırakış yok"}`}
            >
              <DetailRows rows={getDetailRows("valet", transfer)} />
              <StatusTimeline steps={buildValetTimeline(transfer)} />
            </InfoCard>
          ))}
        </CardGrid>
      )}
    </Panel>
  );
}
