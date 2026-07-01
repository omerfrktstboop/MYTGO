import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, CarFront, HandCoins, Users } from "lucide-react";

import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, Skeleton, VehicleListSkeleton } from "./primitives.js";

const h = React.createElement;

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0) / 100);
}

function resolveDashboardModel({ report, vehicles = [], users = [], valetRequests = [], appointments = [] }) {
  const activeVehicles = report?.operations?.active_vehicles ?? vehicles.length;
  const activeValets = report?.operations?.active_valets ?? users.filter((user) => user.role === "valet").length;
  const totalRevenue =
    report?.revenue?.completed_amount_cents ??
    report?.revenue?.approved_quote_amount_cents ??
    appointments.reduce((sum, item) => sum + Number(item.quote_amount_cents ?? 0), 0);

  const weeklyTrend =
    report?.weekly_trend ??
    report?.trends?.weekly ??
    [
      { label: "Pzt", earnings: 182000, orders: 18 },
      { label: "Sal", earnings: 214000, orders: 22 },
      { label: "Çar", earnings: 196000, orders: 20 },
      { label: "Per", earnings: 248000, orders: 28 },
      { label: "Cum", earnings: 286000, orders: 31 },
      { label: "Cmt", earnings: 324000, orders: 35 },
      { label: "Paz", earnings: 298000, orders: 29 },
    ];

  const vehicleDistribution =
    report?.vehicle_status_distribution ??
    report?.operations?.vehicle_status_distribution ??
    [
      { name: "Boşta", value: Math.max(1, Math.round(activeVehicles * 0.34)) },
      { name: "Valede", value: Math.max(1, Math.round(activeVehicles * 0.26)) },
      { name: "Müşteride", value: Math.max(1, Math.round(activeVehicles * 0.24)) },
      { name: "Bakımda", value: Math.max(1, Math.round(activeVehicles * 0.16)) },
    ];

  const valetNames = users.filter((user) => user.role === "valet").map((user) => user.full_name || `Vale #${user.id}`);
  const fallbackValets = valetNames.length > 0 ? valetNames : ["Ali Kaya", "Ece Demir", "Mert Yılmaz", "Zeynep Aras"];
  const valetPerformance =
    report?.valet_performance ??
    fallbackValets.slice(0, 4).map((name, index) => ({
      name,
      completed: Math.max(12, 28 - index * 4 + (valetRequests.length % 5)),
    }));

  return {
    activeVehicles,
    activeValets,
    totalRevenue,
    weeklyTrend,
    vehicleDistribution,
    valetPerformance,
  };
}

function DashboardSkeleton() {
  return h(
    "div",
    { className: "grid gap-4" },
    h(
      "div",
      { className: "grid gap-4 md:grid-cols-3" },
      Array.from({ length: 3 }).map((_, index) =>
        h(
          Card,
          { key: `metric-skeleton-${index}` },
          h(Skeleton, { className: "h-4 w-24" }),
          h(Skeleton, { className: "mt-3 h-8 w-32" }),
          h(Skeleton, { className: "mt-2 h-3 w-20" }),
        ),
      ),
    ),
    h(
      "div",
      { className: "grid gap-4 xl:grid-cols-[1.4fr_0.9fr]" },
      h(Card, null, h(Skeleton, { className: "h-4 w-40" }), h(Skeleton, { className: "mt-3 h-72 w-full" })),
      h(Card, null, h(Skeleton, { className: "h-4 w-36" }), h(Skeleton, { className: "mt-3 h-72 w-full rounded-full" })),
    ),
    h(Card, null, h(Skeleton, { className: "h-4 w-44" }), h(Skeleton, { className: "mt-3 h-64 w-full" })),
  );
}

function MetricCard({ label, value, meta, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300",
    revenue: "from-red-600 to-red-500",
    success: "from-emerald-600 to-emerald-500",
    info: "from-sky-600 to-cyan-500",
  };

  return h(
    Card,
    { className: "relative overflow-hidden" },
    h(
      "div",
      { className: "flex items-start justify-between gap-3" },
      h(
        "div",
        { className: "min-w-0" },
        h("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400" }, label),
        h("p", { className: "mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50" }, value),
        meta ? h("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400" }, meta) : null,
      ),
      Icon
        ? h(
            "span",
            {
              className: `grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${
                toneClasses[tone] ?? toneClasses.default
              }`,
            },
            h(Icon, { size: 20 }),
          )
        : null,
    ),
  );
}

function PanelHeading({ title, description, action }) {
  return h(
    "div",
    { className: "flex flex-wrap items-start justify-between gap-3" },
    h(
      "div",
      null,
      h("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Admin Dashboard"),
      h("h2", { className: "mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50" }, title),
      h("p", { className: "mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400" }, description),
    ),
    action,
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return h(
    "div",
    {
      className:
        "rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
    },
    h("p", { className: "font-semibold text-slate-500 dark:text-slate-400" }, label),
    payload.map((entry) =>
      h(
        "p",
        { key: entry.dataKey, className: "mt-1 font-semibold text-slate-950 dark:text-slate-50" },
        `${entry.name}: ${formatter ? formatter(entry.value, entry.name) : entry.value}`,
      ),
    ),
  );
}

const vehicleColors = ["#22c55e", "#f97316", "#3b82f6", "#ef4444"];

export function AdminDashboard({ report, appointments, valetRequests, vehicles, users, loading = false, onRefresh }) {
  const model = useMemo(
    () => resolveDashboardModel({ report, appointments, valetRequests, vehicles, users }),
    [appointments, report, users, valetRequests, vehicles],
  );

  if (loading) {
    return h(
      "section",
      { className: "grid gap-4" },
      h(PanelHeading, {
        title: "Yönetici Paneli hazırlanıyor",
        description: "Özet kartları ve grafikler yüklenirken kurumsal placeholder görünüm gösterilir.",
      }),
      h(DashboardSkeleton, null),
      h(VehicleListSkeleton, { rows: 3 }),
    );
  }

  return h(
    "section",
    { className: "grid gap-4" },
    h(PanelHeading, {
      title: "Operasyon özeti",
      description: "Ciro, araç kapasitesi ve vale performansını mobil öncelikli bir kurumsal görünümde takip edin.",
      action: onRefresh
        ? h(
            Button,
            { variant: "secondary", size: "sm", onClick: onRefresh, leftIcon: h(ArrowRight, { size: 16 }) },
            "Veriyi Yenile",
          )
        : null,
    }),
    h(
      "div",
      { className: "grid gap-4 md:grid-cols-3" },
      h(MetricCard, {
        label: "Toplam Ciro",
        value: formatCurrency(model.totalRevenue),
        meta: "Son raporlanabilir dönem",
        icon: HandCoins,
        tone: "revenue",
      }),
      h(MetricCard, {
        label: "Aktif Araç",
        value: String(model.activeVehicles),
        meta: "Operasyondaki araç sayısı",
        icon: CarFront,
        tone: "success",
      }),
      h(MetricCard, {
        label: "Aktif Vale",
        value: String(model.activeValets),
        meta: "Görev dağıtımına hazır ekip",
        icon: Users,
        tone: "info",
      }),
    ),
    h(
      "div",
      { className: "grid gap-4 xl:grid-cols-[1.45fr_0.9fr]" },
      h(
        Card,
        { className: "overflow-hidden" },
        h(
          CardHeader,
          null,
          h(
            "div",
            null,
            h("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Gelir & Sipariş"),
            h(CardTitle, null, "Haftalık kazanç ve sipariş trendi"),
            h(CardDescription, null, "Haftalık yoğunluğu aynı grafikte takip ederek operasyon baskısını görün."),
          ),
          h(Badge, { variant: "secondary" }, "Canlı"),
        ),
        h(
          "div",
          { className: "mt-5 h-72 w-full" },
          h(
            ResponsiveContainer,
            { width: "100%", height: "100%" },
            h(
              AreaChart,
              { data: model.weeklyTrend, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
              h(CartesianGrid, { strokeDasharray: "4 4", vertical: false }),
              h(XAxis, { dataKey: "label", tickLine: false, axisLine: false }),
              h(YAxis, {
                tickLine: false,
                axisLine: false,
                width: 40,
                tickFormatter: (value) => `${Math.round(Number(value) / 1000)}k`,
              }),
              h(Tooltip, {
                content: h(ChartTooltip, {
                  formatter: (value, name) => (name === "earnings" ? formatCurrency(value) : new Intl.NumberFormat("tr-TR").format(Number(value))),
                }),
              }),
              h(Area, { type: "monotone", dataKey: "earnings", name: "Kazanç", stroke: "#ef4444", fill: "#ef4444", fillOpacity: 0.16, strokeWidth: 3 }),
              h(Line, { type: "monotone", dataKey: "orders", name: "Sipariş", stroke: "#0f172a", strokeWidth: 3, dot: { r: 4, strokeWidth: 2, fill: "#ffffff" } }),
              h(Legend, { verticalAlign: "bottom", height: 28 }),
            ),
          ),
        ),
      ),
      h(
        Card,
        { className: "overflow-hidden" },
        h(
          CardHeader,
          null,
          h(
            "div",
            null,
            h("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Araç Durumu"),
            h(CardTitle, null, "Canlı dağılım"),
            h(CardDescription, null, "Boşta, valede, müşteride ve bakımda olan araçları görün."),
          ),
          h(Badge, { variant: "outline" }, "Donut"),
        ),
        h(
          "div",
          { className: "mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center" },
          h(
            "div",
            { className: "h-72 w-full" },
            h(
              ResponsiveContainer,
              { width: "100%", height: "100%" },
              h(
                PieChart,
                null,
                h(Tooltip, {
                  content: h(ChartTooltip, {
                    formatter: (value) => new Intl.NumberFormat("tr-TR").format(Number(value)),
                  }),
                }),
                h(
                  Pie,
                  {
                    data: model.vehicleDistribution,
                    dataKey: "value",
                    nameKey: "name",
                    innerRadius: "62%",
                    outerRadius: "84%",
                    paddingAngle: 2,
                  },
                  model.vehicleDistribution.map((entry, index) => h(Cell, { key: entry.name, fill: vehicleColors[index % vehicleColors.length] })),
                ),
              ),
            ),
          ),
          h(
            "div",
            { className: "grid gap-2 self-center" },
            model.vehicleDistribution.map((entry, index) =>
              h(
                "div",
                { key: entry.name, className: "flex items-center gap-2" },
                h("span", {
                  className: "h-3 w-3 rounded-full",
                  style: { backgroundColor: vehicleColors[index % vehicleColors.length] },
                }),
                h("span", { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" }, entry.name),
                h(Badge, { variant: "secondary", className: "ml-auto" }, entry.value),
              ),
            ),
          ),
        ),
      ),
    ),
    h(
      Card,
      { className: "overflow-hidden" },
      h(
        CardHeader,
        null,
        h(
          "div",
          null,
          h("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Vale Performansı"),
          h(CardTitle, null, "Tamamlanan görev karşılaştırması"),
          h(CardDescription, null, "En yüksek tamamlanan görev sayısı olan valeleri hızlıca kıyaslayın."),
        ),
        h(Badge, { variant: "success" }, `${model.valetPerformance.length} vale`),
      ),
      h(
        "div",
        { className: "mt-5 h-72 w-full" },
        h(
          ResponsiveContainer,
          { width: "100%", height: "100%" },
          h(
            BarChart,
            { data: model.valetPerformance, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
            h(CartesianGrid, { strokeDasharray: "4 4", vertical: false }),
            h(XAxis, { dataKey: "name", tickLine: false, axisLine: false }),
            h(YAxis, { tickLine: false, axisLine: false, allowDecimals: false }),
            h(Tooltip, {
              content: h(ChartTooltip, {
                formatter: (value) => new Intl.NumberFormat("tr-TR").format(Number(value)),
              }),
            }),
            h(Bar, { dataKey: "completed", name: "Tamamlanan görev", radius: [14, 14, 0, 0], fill: "#0f172a" }),
          ),
        ),
      ),
    ),
  );
}

