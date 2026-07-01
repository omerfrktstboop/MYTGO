import React, { useState } from "react";
import { CarFront, Plus } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import { ServiceHistoryLoader } from "../../serviceHistory.js";
import { Button, VehicleListSkeleton } from "../../ui/system.js";
import { CardGrid, EmptyState, InfoCard, Panel } from "../../dashboard/shared.jsx";

export default function VehiclesPanel() {
  const { token, vehicles, loading, refresh, notify } = useDashboard();
  const [form, setForm] = useState({ plate_number: "", brand: "", model: "", year: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/vehicles", {
        method: "POST",
        token,
        body: { ...form, year: form.year ? Number(form.year) : null },
      });
      setForm({ plate_number: "", brand: "", model: "", year: "" });
      await refresh();
      notify("Araç kaydedildi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Araçlarım" icon={CarFront}>
      {loading && vehicles.length === 0 ? <VehicleListSkeleton rows={3} /> : null}
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Plaka</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.plate_number}
            onChange={(event) => setForm({ ...form, plate_number: event.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Marka</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.brand}
            onChange={(event) => setForm({ ...form, brand: event.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Model</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Yıl</span>
          <input
            type="number"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.year}
            onChange={(event) => setForm({ ...form, year: event.target.value })}
          />
        </label>
        <Button className="w-full sm:col-span-4" leftIcon={<Plus size={18} />} loading={submitting} type="submit">
          Araç Ekle
        </Button>
      </form>
      {vehicles.length === 0 && !loading ? (
        <EmptyState
          title="Henüz araç yok"
          description="İlk aracınızı ekleyin; servis geçmişi ve bakım kartları burada listelenecek."
          actionLabel="Sayfayı yenile"
          onAction={refresh}
        />
      ) : null}
      <CardGrid>
        {vehicles.map((vehicle) => (
          <InfoCard
            key={vehicle.id}
            icon={CarFront}
            title={vehicle.plate_number}
            meta={`${vehicle.brand} ${vehicle.model}`}
            description={`${vehicle.year ?? "Yıl belirtilmedi"} • Servis geçmişi ve hazırlık notları`}
          >
            <ServiceHistoryLoader apiRequest={apiRequest} token={token} vehicle={vehicle} />
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}
