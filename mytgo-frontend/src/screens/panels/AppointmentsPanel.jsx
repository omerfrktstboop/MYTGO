import React, { useState } from "react";
import { CalendarCheck, Check, Plus, Send, Wrench } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import {
  buildAppointmentTimeline,
  formatCurrencyFromCents,
  getDetailRows,
  serviceLabels,
  statusLabels,
} from "../../appDetails.js";
import { Button } from "../../ui/system.js";
import { CardGrid, DetailRows, EmptyState, InfoCard, Panel, StatusTimeline } from "../../dashboard/shared.jsx";

function AppointmentList({ appointments, onApproveQuote }) {
  if (appointments.length === 0) {
    return null;
  }

  return (
    <CardGrid>
      {appointments.map((appointment) => (
        <InfoCard
          key={appointment.id}
          icon={Wrench}
          title={`#${appointment.id} ${serviceLabels[appointment.service_type]}`}
          meta={statusLabels[appointment.status]}
          description={`${appointment.service_address ?? "Adres yok"} • Teklif ve iş akışı özeti`}
        >
          <DetailRows rows={getDetailRows("appointment", appointment)} />
          <StatusTimeline steps={buildAppointmentTimeline(appointment)} />
          {appointment.quote_amount_cents ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Usta Teklifi</p>
              <p className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">
                {formatCurrencyFromCents(appointment.quote_amount_cents)}
              </p>
              {appointment.quote_notes ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{appointment.quote_notes}</p> : null}
              {appointment.status === "quote_sent" && onApproveQuote ? (
                <Button className="mt-3 w-full" type="button" onClick={() => onApproveQuote(appointment.id)} leftIcon={<Check size={18} />}>
                  Teklifi Onayla
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
              Usta fiyat teklifi bekleniyor.
            </p>
          )}
        </InfoCard>
      ))}
    </CardGrid>
  );
}

function CustomerAppointments() {
  const { token, vehicles, appointments, refresh, notify } = useDashboard();
  const [form, setForm] = useState({
    vehicle_id: "",
    service_type: "repair",
    service_address: "E-Car Sanayi",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/appointments", {
        method: "POST",
        token,
        body: { ...form, vehicle_id: Number(form.vehicle_id) },
      });
      setForm((current) => ({ ...current, notes: "" }));
      await refresh();
      notify("Randevu oluşturuldu");
    } finally {
      setSubmitting(false);
    }
  }

  async function approveQuote(id) {
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: { status: "approved" },
    });
    await refresh();
    notify("Teklif onaylandı");
  }

  return (
    <Panel title="Sanayi Randevu" icon={CalendarCheck}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Araç</span>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.vehicle_id}
            onChange={(event) => setForm({ ...form, vehicle_id: event.target.value })}
            required
          >
            <option value="">Seç</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate_number}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Servis</span>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.service_type}
            onChange={(event) => setForm({ ...form, service_type: event.target.value })}
          >
            {Object.entries(serviceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Adres</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.service_address}
            onChange={(event) => setForm({ ...form, service_address: event.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Not</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>
        <Button className="w-full sm:col-span-2" leftIcon={<Plus size={18} />} loading={submitting} type="submit">
          Randevu Oluştur
        </Button>
      </form>
      {appointments.length === 0 ? (
        <EmptyState
          title="Henüz randevu yok"
          description="Yeni randevular burada görünecek. İlk kaydı oluşturabilirsiniz."
          actionLabel="Yenile"
          onAction={refresh}
        />
      ) : (
        <AppointmentList appointments={appointments} onApproveQuote={approveQuote} />
      )}
    </Panel>
  );
}

function MechanicAppointments() {
  const { token, appointments, refresh, notify } = useDashboard();
  const [quoteForms, setQuoteForms] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  async function patch(id, status) {
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    await refresh();
    notify("Randevu güncellendi");
  }

  async function sendQuote(event, id) {
    event.preventDefault();
    const form = quoteForms[id] ?? { amount: "", notes: "" };
    setSubmittingId(id);
    try {
      await apiRequest(`/api/v1/appointments/${id}`, {
        method: "PATCH",
        token,
        body: {
          quote_amount_cents: Math.round(Number(form.amount) * 100),
          quote_notes: form.notes || null,
        },
      });
      setQuoteForms((current) => ({ ...current, [id]: { amount: "", notes: "" } }));
      await refresh();
      notify("Teklif gönderildi");
    } finally {
      setSubmittingId(null);
    }
  }

  function updateQuoteForm(id, key, value) {
    setQuoteForms((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        [key]: value,
      },
    }));
  }

  return (
    <Panel title="Servis Kuyruğu" icon={Wrench}>
      {appointments.length === 0 ? (
        <EmptyState
          title="Bekleyen iş yok"
          description="Servis kuyruğu boş. Yeni randevular gelince burada kartlar oluşur."
          actionLabel="Yenile"
          onAction={refresh}
        />
      ) : (
        <CardGrid>
          {appointments.map((appointment) => (
            <InfoCard
              key={appointment.id}
              icon={CalendarCheck}
              title={serviceLabels[appointment.service_type]}
              meta={statusLabels[appointment.status]}
              description={`${appointment.service_address ?? "Adres yok"} • ${appointment.notes || "Ek not yok"}`}
            >
              <DetailRows rows={getDetailRows("appointment", appointment)} />
              <StatusTimeline steps={buildAppointmentTimeline(appointment)} />
              <form className="mt-3 grid gap-3" onSubmit={(event) => sendQuote(event, appointment.id)}>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Teklif (₺)</span>
                  <input
                    min="0"
                    step="1"
                    type="number"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    value={quoteForms[appointment.id]?.amount ?? ""}
                    onChange={(event) => updateQuoteForm(appointment.id, "amount", event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Teklif notu</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    value={quoteForms[appointment.id]?.notes ?? ""}
                    onChange={(event) => updateQuoteForm(appointment.id, "notes", event.target.value)}
                    placeholder="Parça + işçilik dahil"
                  />
                </label>
                <Button className="w-full" leftIcon={<Send size={18} />} loading={submittingId === appointment.id} type="submit">
                  Teklif Gönder
                </Button>
              </form>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["approved", "in_progress", "completed"].map((status) => (
                  <button
                    className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    key={status}
                    type="button"
                    onClick={() => patch(appointment.id, status)}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </InfoCard>
          ))}
        </CardGrid>
      )}
    </Panel>
  );
}

export default function AppointmentsPanel() {
  const { user } = useDashboard();
  return user.role === "mechanic" ? <MechanicAppointments /> : <CustomerAppointments />;
}
