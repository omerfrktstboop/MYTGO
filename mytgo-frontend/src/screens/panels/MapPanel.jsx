import React from "react";
import { BatteryCharging, LifeBuoy, MapPin } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { Panel, CardGrid, EmptyState, InfoCard } from "../../dashboard/shared.jsx";
import TrackingMap from "./TrackingMap.jsx";

const chargingStations = [
  {
    id: 1,
    name: "MYTGO Hızlı Şarj - Merkez",
    meta: "DC 180 kW",
    description: "7/24 açık, ana arter üzerinde.",
    distance: "2.4 km",
    status: "Boş",
  },
  {
    id: 2,
    name: "MYTGO Şarj Noktası - AVM",
    meta: "AC 22 kW",
    description: "Alışveriş alanı otoparkında.",
    distance: "4.8 km",
    status: "2 araç dolu",
  },
  {
    id: 3,
    name: "MYTGO Enerji - Sanayi",
    meta: "DC 120 kW",
    description: "Servis ve otoyol bağlantısına yakın.",
    distance: "6.1 km",
    status: "Bakımda değil",
  },
];

const assistanceCards = [
  {
    title: "Çekici Çağır",
    meta: "Acil destek",
    description: "Arıza veya kaza durumlarında en yakın çekici yönlendirmesi.",
    rows: [
      ["Yanıt süresi", "Ortalama 10-15 dk"],
      ["Kapsam", "Şehir içi hızlı yönlendirme"],
    ],
  },
  {
    title: "Lastik Yardımı",
    meta: "Mobil servis",
    description: "Patlak lastik ve basınç desteği için mobil ekip.",
    rows: [
      ["Destek", "Şişirme ve değişim"],
      ["Uygunluk", "Randevusuz öncelikli"],
    ],
  },
  {
    title: "Akü Takviyesi",
    meta: "Yerinde çözüm",
    description: "Marş basmama ve güç kaybı için hızlı akü desteği.",
    rows: [
      ["Ekip", "Yerinde müdahale"],
      ["Çağrı", "Tek dokunuşla yönlendirme"],
    ],
  },
];

export default function MapPanel() {
  const { token, user, valetRequests } = useDashboard();

  if (user.role === "customer") {
    return (
      <Panel title="Harita" icon={MapPin}>
        <p className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
          Transfer ve konum akışını harita üzerinden takip edebilirsiniz.
        </p>
        <TrackingMap token={token} transfers={valetRequests} role="customer" />
      </Panel>
    );
  }

  return (
    <Panel title="Harita" icon={MapPin}>
      <TrackingMap token={token} transfers={valetRequests} role="customer" />
    </Panel>
  );
}

export function ChargingPanel() {
  return (
    <Panel title="Şarj İstasyonları" icon={BatteryCharging}>
      <CardGrid>
        {chargingStations.map((station) => (
          <InfoCard
            key={station.id}
            icon={BatteryCharging}
            title={station.name}
            meta={station.status}
            description={`${station.meta} • ${station.distance}`}
          >
            <dl className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Konum</dt>
                <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{station.description}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Erişim</dt>
                <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Harita ve navigasyon desteği hazır</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Uygunluk</dt>
                <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{station.status}</dd>
              </div>
            </dl>
            <button className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" type="button">
              Yol tarifi aç
            </button>
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}

export function RoadsidePanel() {
  return (
    <Panel title="Yol Yardım" icon={LifeBuoy}>
      <CardGrid>
        {assistanceCards.map((item) => (
          <InfoCard key={item.title} icon={LifeBuoy} title={item.title} meta={item.meta} description={item.description}>
            <dl className="grid gap-2">
              {item.rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</dt>
                  <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
            <button className="mt-3 w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5" type="button">
              Destek iste
            </button>
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}
