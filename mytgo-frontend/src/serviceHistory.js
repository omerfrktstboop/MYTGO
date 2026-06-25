import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_LIMIT = 20;

const operationLabels = {
  maintenance: "Bakım",
  repair: "Tamir",
  inspection: "Muayene",
  cleaning: "Temizlik",
  tire: "Lastik",
  other: "Diğer",
};

function formatDate(value) {
  if (!value) {
    return "Tarih yok";
  }
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return "Zaman yok";
  }
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatKilometers(value) {
  if (value === null || value === undefined || value === "") {
    return "Kilometre girilmedi";
  }
  return `${new Intl.NumberFormat("tr-TR").format(Number(value))} km`;
}

function formatCurrencyFromCents(value, currency = "TRY") {
  if (value === null || value === undefined || value === "") {
    return "Maliyet girilmedi";
  }
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

function normalizeServiceHistoryPayload(payload) {
  if (Array.isArray(payload)) {
    return { vehicle: null, items: payload, total: payload.length, limit: DEFAULT_LIMIT, offset: 0 };
  }
  return {
    vehicle: payload?.vehicle ?? null,
    items: payload?.items ?? payload?.records ?? payload?.service_history ?? [],
    total: payload?.total ?? payload?.items?.length ?? 0,
    limit: payload?.limit ?? DEFAULT_LIMIT,
    offset: payload?.offset ?? 0,
  };
}

export async function fetchServiceHistory({ apiRequest, token, vehicleId, limit = DEFAULT_LIMIT, offset = 0 }) {
  const path = `/api/v1/vehicles/${encodeURIComponent(vehicleId)}/service-history?limit=${limit}&offset=${offset}`;
  const payload = await apiRequest(path, { token });
  return normalizeServiceHistoryPayload(payload);
}

export function getRecentServiceHistoryEntries(items = [], limit = 5) {
  return [...items]
    .sort((left, right) => {
      const dateDiff = new Date(right.service_date ?? right.created_at ?? 0) - new Date(left.service_date ?? left.created_at ?? 0);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return Number(right.id ?? 0) - Number(left.id ?? 0);
    })
    .slice(0, limit);
}

export function getSortedServiceHistoryEntries(items = []) {
  return getRecentServiceHistoryEntries(items, items.length);
}

export function getServiceHistoryErrorMessage(error) {
  const status = error?.status ?? error?.response?.status;
  if (status === 401) {
    return "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
  }
  if (status === 403) {
    return "Bu aracın servis geçmişine erişim yetkiniz yok.";
  }
  if (status === 404) {
    return "Araç veya servis kaydı bulunamadı.";
  }
  if (status === 422) {
    return "Lütfen servis tarihi, işlem tipi ve tutar alanlarını kontrol edin.";
  }
  return "Servis geçmişi yüklenemedi. Tekrar deneyin.";
}

function Detail({ label, value }) {
  return React.createElement(
    "div",
    { className: "detail-row" },
    React.createElement("dt", null, label),
    React.createElement("dd", null, value),
  );
}

function ServiceHistoryCard({ entry }) {
  return React.createElement(
    "article",
    { className: "service-history-card", "data-service-entry-id": entry.id },
    React.createElement(
      "div",
      { className: "flex items-start justify-between gap-3" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "text-xs font-black uppercase tracking-[0.18em] text-mytgo-teal" }, formatDate(entry.service_date)),
        React.createElement("h4", { className: "mt-1 font-black text-mytgo-ink" }, operationLabels[entry.operation_type] ?? entry.operation_type ?? "Servis"),
      ),
      React.createElement("span", { className: "rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800" }, formatKilometers(entry.odometer_km)),
    ),
    React.createElement(
      "dl",
      { className: "detail-grid mt-3" },
      React.createElement(Detail, { label: "Servis Noktası", value: entry.service_provider || "Servis sağlayıcı yok" }),
      React.createElement(Detail, { label: "Not", value: entry.description || "Not yok" }),
      React.createElement(Detail, { label: "Tutar", value: formatCurrencyFromCents(entry.cost_amount_cents, entry.cost_currency || "TRY") }),
      React.createElement(Detail, { label: "Oluşturan", value: entry.created_by_id ? `#${entry.created_by_id}` : "Bilinmiyor" }),
      React.createElement(Detail, { label: "Güncelleyen", value: entry.updated_by_id ? `#${entry.updated_by_id}` : "Henüz güncellenmedi" }),
      React.createElement(Detail, { label: "Oluşturulma", value: formatDateTime(entry.created_at) }),
      React.createElement(Detail, { label: "Güncellenme", value: formatDateTime(entry.updated_at) }),
    ),
  );
}

export function ServiceHistoryPanel({ vehicle, status = "success", items = [], error = null }) {
  const sortedItems = useMemo(() => getSortedServiceHistoryEntries(items), [items]);
  const recentItems = useMemo(() => getRecentServiceHistoryEntries(items), [items]);
  const vehicleTitle = [vehicle?.brand, vehicle?.model, vehicle?.year].filter(Boolean).join(" ");

  if (status === "loading") {
    return React.createElement(
      "section",
      { className: "service-history-panel", role: "status", "aria-live": "polite" },
      "Servis geçmişi yükleniyor...",
    );
  }

  if (status === "error") {
    return React.createElement(
      "section",
      { className: "service-history-panel service-history-panel-error", role: "alert" },
      getServiceHistoryErrorMessage(error),
    );
  }

  return React.createElement(
    "section",
    { className: "service-history-panel", "aria-label": `${vehicle?.plate_number ?? "Araç"} servis geçmişi` },
    React.createElement(
      "div",
      { className: "service-history-header" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "text-xs font-black uppercase tracking-[0.18em] text-mytgo-teal" }, "Servis Geçmişi"),
        React.createElement("h3", { className: "text-lg font-black" }, vehicle?.plate_number ?? "Araç"),
        vehicleTitle ? React.createElement("p", { className: "text-sm font-semibold text-slate-600" }, vehicleTitle) : null,
      ),
      React.createElement("button", { className: "mini-command", type: "button" }, "Servis Kaydı Ekle"),
    ),
    items.length === 0
      ? React.createElement(
          "div",
          { className: "service-history-empty" },
          React.createElement("p", { className: "font-black" }, "Bu araç için servis geçmişi yok"),
          React.createElement("p", null, "İlk bakım veya servis kaydını ekleyerek geçmişi oluşturmaya başlayın."),
        )
      : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: "mt-4" },
            React.createElement("p", { className: "text-sm font-black text-mytgo-ink" }, "Son işlemler"),
            React.createElement("p", { className: "text-xs font-semibold text-slate-500" }, "Servis tarihine göre en güncel 5 kayıt"),
            React.createElement(
              "div",
              { className: "mt-3 grid gap-2" },
              recentItems.map((entry) =>
                React.createElement(
                  "div",
                  { className: "recent-entry", key: entry.id, "data-testid": `recent-entry-${entry.id}` },
                  React.createElement("span", null, formatDate(entry.service_date)),
                  React.createElement("strong", null, operationLabels[entry.operation_type] ?? entry.operation_type ?? "Servis"),
                ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "mt-4 grid gap-3" },
            sortedItems.map((entry) => React.createElement(ServiceHistoryCard, { entry, key: entry.id })),
          ),
          items.length > 5
            ? React.createElement("button", { className: "command command-ghost mt-3 w-full", type: "button" }, "Tüm geçmişi görüntüle")
            : null,
        ),
  );
}

export function ServiceHistoryLoader({ apiRequest, token, vehicle }) {
  const [state, setState] = useState({ status: "loading", items: [], error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", items: [], error: null });
    fetchServiceHistory({ apiRequest, token, vehicleId: vehicle.id })
      .then((payload) => {
        if (!cancelled) {
          setState({ status: "success", items: payload.items, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: "error", items: [], error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiRequest, token, vehicle.id]);

  return React.createElement(ServiceHistoryPanel, {
    vehicle,
    status: state.status,
    items: state.items,
    error: state.error,
  });
}
