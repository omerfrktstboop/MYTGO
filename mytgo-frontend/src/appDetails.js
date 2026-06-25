export const serviceLabels = {
  repair: "Araç Tamir",
  cleaning: "Temizlik",
  inspection: "Muayene",
};

export const statusLabels = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  in_progress: "İşlemde",
  completed: "Tamamlandı",
  cancelled: "İptal",
  requested: "Talep",
  assigned: "Atandı",
  picking_up: "Alıma Gidiyor",
  in_transit_to_service: "Servise Gidiyor",
  at_service: "Serviste",
  returning: "Dönüşte",
  delivered: "Teslim",
};

const appointmentSteps = ["pending", "approved", "in_progress", "completed"];
const valetSteps = [
  "requested",
  "assigned",
  "picking_up",
  "in_transit_to_service",
  "at_service",
  "returning",
  "delivered",
];

function buildTimeline(steps, status) {
  const activeIndex = steps.includes(status) ? steps.indexOf(status) : 0;
  return steps.map((key, index) => ({
    key,
    label: statusLabels[key] ?? key,
    state: index < activeIndex ? "done" : index === activeIndex ? "current" : "upcoming",
  }));
}

export function buildAppointmentTimeline(appointment) {
  return buildTimeline(appointmentSteps, appointment?.status);
}

export function buildValetTimeline(transfer) {
  return buildTimeline(valetSteps, transfer?.status);
}

function formatDateTime(value) {
  if (!value) {
    return "Henüz planlanmadı";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getDetailRows(type, record) {
  if (type === "appointment") {
    return [
      ["Talep No", `#${record.id}`],
      ["Servis", serviceLabels[record.service_type] ?? record.service_type],
      ["Durum", statusLabels[record.status] ?? record.status],
      ["Adres", record.service_address ?? "Adres yok"],
      ["Planlanan Zaman", formatDateTime(record.scheduled_at)],
      ["Araç", record.vehicle_id ? `#${record.vehicle_id}` : "Araç yok"],
      ["Usta", record.mechanic_id ? `#${record.mechanic_id}` : "Atama bekliyor"],
      ["Not", record.notes || "Not yok"],
    ];
  }

  return [
    ["Talep No", `#${record.id}`],
    ["Bağlı Randevu", record.appointment_id ? `#${record.appointment_id}` : "Bağımsız"],
    ["Durum", statusLabels[record.status] ?? record.status],
    ["Alış", record.pickup_address],
    ["Teslim", record.dropoff_address],
    ["Vale", record.valet_id ? `#${record.valet_id}` : "Atama bekliyor"],
    ["Son Konum", record.last_location_at ? formatDateTime(record.last_location_at) : "Konum yok"],
  ];
}
