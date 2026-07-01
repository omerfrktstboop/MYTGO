import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Laptop2,
  Moon,
  SunMedium,
  Sparkles,
  LoaderCircle,
  TrendingUp,
  CarFront,
  HandCoins,
  Users,
  CalendarCheck,
} from "lucide-react";

const ThemeContext = createContext(null);

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function ThemeProvider({ children, storageKey = "mytgo-theme" }) {
  const [themeMode, setThemeMode] = useState(() => {
    const stored = readStoredTheme(storageKey);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (themeMode !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(media.matches ? "dark" : "light");

    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [themeMode]);

  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;

    try {
      window.localStorage.setItem(storageKey, themeMode);
    } catch {
      // localStorage unavailable; keep the resolved theme in memory only.
    }
  }, [resolvedTheme, storageKey, themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
      setLight: () => setThemeMode("light"),
      setDark: () => setThemeMode("dark"),
      setSystem: () => setThemeMode("system"),
      toggleTheme: () =>
        setThemeMode((current) => {
          if (current === "system") {
            return getSystemTheme() === "dark" ? "light" : "dark";
          }
          return current === "dark" ? "light" : "dark";
        }),
    }),
    [resolvedTheme, themeMode],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle({ className }) {
  const { themeMode, resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const icon = isDark ? Moon : SunMedium;
  const label = isDark ? "Koyu" : "Açık";

  return React.createElement(
    Button,
    {
      type: "button",
      variant: "ghost",
      size: "sm",
      className: cn("gap-2", className),
      onClick: toggleTheme,
      "aria-label": `Tema değiştir, mevcut tema ${label}`,
    },
    React.createElement(icon, { size: 16, className: "shrink-0" }),
    React.createElement(
      "span",
      { className: "flex items-center gap-2" },
      React.createElement("span", null, label),
      themeMode === "system"
        ? React.createElement(
            Badge,
            {
              variant: "outline",
              size: "xs",
              className: "border-white/20 bg-white/10 text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
            },
            "Sistem",
          )
        : null,
    ),
  );
}

const buttonVariants = {
  primary:
    "border border-red-600/15 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-700/15 hover:from-red-500 hover:to-red-600 focus-visible:ring-red-500 dark:shadow-red-950/30",
  secondary:
    "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-200 dark:hover:bg-slate-800/80",
  outline:
    "border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-400 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800",
};

const buttonSizes = {
  sm: "min-h-10 px-3.5 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-12 px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  leftIcon = null,
  rightIcon = null,
  type = "button",
  ...props
}) {
  const isDisabled = disabled || loading;

  return React.createElement(
    "button",
    {
      type,
      disabled: isDisabled,
      "aria-disabled": isDisabled || undefined,
      "aria-busy": loading || undefined,
      className: cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold tracking-tight transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant] ?? buttonVariants.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className,
      ),
      ...props,
    },
    loading ? React.createElement(Spinner, { size: 16, className: "shrink-0" }) : leftIcon,
    React.createElement("span", { className: "truncate" }, children),
    rightIcon,
  );
}

export function Card({ className, children, ...props }) {
  return React.createElement(
    "article",
    {
      className: cn(
        "rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70",
        className,
      ),
      ...props,
    },
    children,
  );
}

export function CardHeader({ className, children, ...props }) {
  return React.createElement(
    "div",
    { className: cn("flex flex-wrap items-start justify-between gap-3", className), ...props },
    children,
  );
}

export function CardTitle({ className, children, ...props }) {
  return React.createElement(
    "h3",
    { className: cn("text-base font-bold tracking-tight text-slate-950 dark:text-slate-50", className), ...props },
    children,
  );
}

export function CardDescription({ className, children, ...props }) {
  return React.createElement(
    "p",
    { className: cn("text-sm leading-6 text-slate-500 dark:text-slate-400", className), ...props },
    children,
  );
}

export function CardContent({ className, children, ...props }) {
  return React.createElement("div", { className: cn("mt-4", className), ...props }, children);
}

export function Input({ className, ...props }) {
  return React.createElement("input", {
    className: cn(
      "flex w-full min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-950 shadow-sm outline-none transition",
      "placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
      "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60",
      "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-red-400 dark:focus:ring-red-400/15",
      className,
    ),
    ...props,
  });
}

const badgeVariants = {
  default: "border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950",
  secondary: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300",
  destructive: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300",
  outline: "border-slate-200 bg-transparent text-slate-700 dark:border-slate-700 dark:text-slate-200",
};

const badgeSizes = {
  xs: "px-2 py-0.5 text-[11px]",
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
};

export function Badge({ variant = "default", size = "sm", className, children, ...props }) {
  return React.createElement(
    "span",
    {
      className: cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-tight",
        badgeVariants[variant] ?? badgeVariants.default,
        badgeSizes[size] ?? badgeSizes.sm,
        className,
      ),
      ...props,
    },
    children,
  );
}

export function Spinner({ size = 16, className }) {
  return React.createElement(LoaderCircle, {
    size,
    className: cn("animate-spin", className),
    "aria-hidden": "true",
  });
}

export function Skeleton({ className, ...props }) {
  return React.createElement("div", {
    className: cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800", className),
    ...props,
  });
}

export function VehicleListSkeleton({ rows = 4 }) {
  return React.createElement(
    Card,
    { className: "overflow-hidden" },
    React.createElement(
      CardHeader,
      null,
      React.createElement(
        "div",
        { className: "space-y-2" },
        React.createElement(Skeleton, { className: "h-4 w-28" }),
        React.createElement(Skeleton, { className: "h-6 w-48" }),
      ),
      React.createElement(Skeleton, { className: "h-9 w-28 rounded-full" }),
    ),
    React.createElement(
      "div",
      { className: "mt-5 grid gap-3" },
      Array.from({ length: rows }).map((_, index) =>
        React.createElement(
          "div",
          {
            key: `vehicle-skeleton-${index}`,
            className:
              "flex items-center gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60",
          },
          React.createElement(Skeleton, { className: "h-12 w-12 rounded-2xl" }),
          React.createElement(
            "div",
            { className: "min-w-0 flex-1 space-y-3" },
            React.createElement(Skeleton, { className: "h-4 w-32" }),
            React.createElement(Skeleton, { className: "h-3 w-3/4" }),
          ),
        ),
      ),
    ),
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0) / 100);
}

function resolveDashboardModel({ report, vehicles = [], users = [], valetRequests = [], appointments = [] }) {
  const activeVehicles = report?.operations?.active_vehicles ?? vehicles.length;
  const activeValets =
    report?.operations?.active_valets ?? users.filter((user) => user.role === "valet").length;
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
  return React.createElement(
    "div",
    { className: "grid gap-4" },
    React.createElement(
      "div",
      { className: "grid gap-4 md:grid-cols-3" },
      Array.from({ length: 3 }).map((_, index) =>
        React.createElement(
          Card,
          { key: `metric-skeleton-${index}` },
          React.createElement(Skeleton, { className: "h-4 w-24" }),
          React.createElement(Skeleton, { className: "mt-3 h-8 w-32" }),
          React.createElement(Skeleton, { className: "mt-2 h-3 w-20" }),
        ),
      ),
    ),
    React.createElement(
      "div",
      { className: "grid gap-4 xl:grid-cols-[1.4fr_0.9fr]" },
      React.createElement(
        Card,
        null,
        React.createElement(Skeleton, { className: "h-4 w-40" }),
        React.createElement(Skeleton, { className: "mt-3 h-72 w-full" }),
      ),
      React.createElement(
        Card,
        null,
        React.createElement(Skeleton, { className: "h-4 w-36" }),
        React.createElement(Skeleton, { className: "mt-3 h-72 w-full rounded-full" }),
      ),
    ),
    React.createElement(
      Card,
      null,
      React.createElement(Skeleton, { className: "h-4 w-44" }),
      React.createElement(Skeleton, { className: "mt-3 h-64 w-full" }),
    ),
  );
}

function MetricCard({ label, value, meta, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300",
    revenue: "from-red-600 to-red-500",
    success: "from-emerald-600 to-emerald-500",
    info: "from-sky-600 to-cyan-500",
  };

  return React.createElement(
    Card,
    { className: "relative overflow-hidden" },
    React.createElement(
      "div",
      { className: "flex items-start justify-between gap-3" },
      React.createElement(
        "div",
        { className: "min-w-0" },
        React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400" }, label),
        React.createElement("p", { className: "mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50" }, value),
        meta ? React.createElement("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400" }, meta) : null,
      ),
      Icon
        ? React.createElement(
            "span",
            {
              className: cn(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                toneClasses[tone] ?? toneClasses.default,
              ),
            },
            React.createElement(Icon, { size: 20 }),
          )
        : null,
    ),
  );
}

function PanelHeading({ title, description, action }) {
  return React.createElement(
    "div",
    { className: "flex flex-wrap items-start justify-between gap-3" },
    React.createElement(
      "div",
      null,
      React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Admin Dashboard"),
      React.createElement("h2", { className: "mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50" }, title),
      React.createElement("p", { className: "mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400" }, description),
    ),
    action,
  );
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return React.createElement(
    "div",
    {
      className:
        "rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95",
    },
    React.createElement("p", { className: "font-semibold text-slate-500 dark:text-slate-400" }, label),
    payload.map((entry) =>
      React.createElement(
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
    return React.createElement(
      "section",
      { className: "grid gap-4" },
      React.createElement(PanelHeading, {
        title: "Yönetici Paneli hazırlanıyor",
        description: "Özet kartları ve grafikler yüklenirken kurumsal placeholder görünüm gösterilir.",
      }),
      React.createElement(DashboardSkeleton, null),
      React.createElement(VehicleListSkeleton, { rows: 3 }),
    );
  }

  return React.createElement(
    "section",
    { className: "grid gap-4" },
    React.createElement(PanelHeading, {
      title: "Operasyon özeti",
      description: "Ciro, araç kapasitesi ve vale performansını mobil öncelikli bir kurumsal görünümde takip edin.",
      action: onRefresh
        ? React.createElement(
            Button,
            { variant: "secondary", size: "sm", onClick: onRefresh, leftIcon: React.createElement(ArrowRight, { size: 16 }) },
            "Veriyi Yenile",
          )
        : null,
    }),
    React.createElement(
      "div",
      { className: "grid gap-4 md:grid-cols-3" },
      React.createElement(MetricCard, {
        label: "Toplam Ciro",
        value: formatCurrency(model.totalRevenue),
        meta: "Son raporlanabilir dönem",
        icon: HandCoins,
        tone: "revenue",
      }),
      React.createElement(MetricCard, {
        label: "Aktif Araç",
        value: String(model.activeVehicles),
        meta: "Operasyondaki araç sayısı",
        icon: CarFront,
        tone: "success",
      }),
      React.createElement(MetricCard, {
        label: "Aktif Vale",
        value: String(model.activeValets),
        meta: "Görev dağıtımına hazır ekip",
        icon: Users,
        tone: "info",
      }),
    ),
    React.createElement(
      "div",
      { className: "grid gap-4 xl:grid-cols-[1.45fr_0.9fr]" },
      React.createElement(
        Card,
        { className: "overflow-hidden" },
        React.createElement(
          CardHeader,
          null,
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Gelir & Sipariş"),
            React.createElement(CardTitle, null, "Haftalık kazanç ve sipariş trendi"),
            React.createElement(CardDescription, null, "Haftalık yoğunluğu aynı grafikte takip ederek operasyon baskısını görün."),
          ),
          React.createElement(Badge, { variant: "secondary" }, "Canlı"),
        ),
        React.createElement(
          "div",
          { className: "mt-5 h-72 w-full" },
          React.createElement(
            ResponsiveContainer,
            { width: "100%", height: "100%" },
            React.createElement(
              AreaChart,
              { data: model.weeklyTrend, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
              React.createElement(CartesianGrid, { strokeDasharray: "4 4", vertical: false }),
              React.createElement(XAxis, { dataKey: "label", tickLine: false, axisLine: false }),
              React.createElement(YAxis, {
                tickLine: false,
                axisLine: false,
                width: 40,
                tickFormatter: (value) => `${Math.round(Number(value) / 1000)}k`,
              }),
              React.createElement(Tooltip, {
                content: React.createElement(ChartTooltip, {
                  formatter: (value, name) =>
                    name === "earnings"
                      ? formatCurrency(value)
                      : new Intl.NumberFormat("tr-TR").format(Number(value)),
                }),
              }),
              React.createElement(Area, {
                type: "monotone",
                dataKey: "earnings",
                name: "Kazanç",
                stroke: "#ef4444",
                fill: "#ef4444",
                fillOpacity: 0.16,
                strokeWidth: 3,
              }),
              React.createElement(Line, {
                type: "monotone",
                dataKey: "orders",
                name: "Sipariş",
                stroke: "#0f172a",
                strokeWidth: 3,
                dot: { r: 4, strokeWidth: 2, fill: "#ffffff" },
              }),
              React.createElement(Legend, { verticalAlign: "bottom", height: 28 }),
            ),
          ),
        ),
      ),
      React.createElement(
        Card,
        { className: "overflow-hidden" },
        React.createElement(
          CardHeader,
          null,
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Araç Durumu"),
            React.createElement(CardTitle, null, "Canlı dağılım"),
            React.createElement(CardDescription, null, "Boşta, valede, müşteride ve bakımda olan araçları görün."),
          ),
          React.createElement(Badge, { variant: "outline" }, "Donut"),
        ),
        React.createElement(
          "div",
          { className: "mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center" },
          React.createElement(
            "div",
            { className: "h-72 w-full" },
            React.createElement(
              ResponsiveContainer,
              { width: "100%", height: "100%" },
              React.createElement(
                PieChart,
                null,
                React.createElement(Tooltip, {
                  content: React.createElement(ChartTooltip, {
                    formatter: (value) => new Intl.NumberFormat("tr-TR").format(Number(value)),
                  }),
                }),
                React.createElement(
                  Pie,
                  {
                    data: model.vehicleDistribution,
                    dataKey: "value",
                    nameKey: "name",
                    innerRadius: "62%",
                    outerRadius: "84%",
                    paddingAngle: 2,
                  },
                  model.vehicleDistribution.map((entry, index) =>
                    React.createElement(Cell, { key: entry.name, fill: vehicleColors[index % vehicleColors.length] }),
                  ),
                ),
              ),
            ),
          ),
          React.createElement(
            "div",
            { className: "grid gap-2 self-center" },
            model.vehicleDistribution.map((entry, index) =>
              React.createElement(
                "div",
                { key: entry.name, className: "flex items-center gap-2" },
                React.createElement("span", {
                  className: "h-3 w-3 rounded-full",
                  style: { backgroundColor: vehicleColors[index % vehicleColors.length] },
                }),
                React.createElement("span", { className: "text-sm font-semibold text-slate-700 dark:text-slate-200" }, entry.name),
                React.createElement(Badge, { variant: "secondary", className: "ml-auto" }, entry.value),
              ),
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      Card,
      { className: "overflow-hidden" },
      React.createElement(
        CardHeader,
        null,
        React.createElement(
          "div",
          null,
          React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-red-600 dark:text-red-400" }, "Vale Performansı"),
          React.createElement(CardTitle, null, "Tamamlanan görev karşılaştırması"),
          React.createElement(CardDescription, null, "En yüksek tamamlanan görev sayısı olan valeleri hızlıca kıyaslayın."),
        ),
        React.createElement(Badge, { variant: "success" }, `${model.valetPerformance.length} vale`),
      ),
      React.createElement(
        "div",
        { className: "mt-5 h-72 w-full" },
        React.createElement(
          ResponsiveContainer,
          { width: "100%", height: "100%" },
          React.createElement(
            BarChart,
            { data: model.valetPerformance, margin: { top: 8, right: 8, left: 0, bottom: 0 } },
            React.createElement(CartesianGrid, { strokeDasharray: "4 4", vertical: false }),
            React.createElement(XAxis, { dataKey: "name", tickLine: false, axisLine: false }),
            React.createElement(YAxis, { tickLine: false, axisLine: false, allowDecimals: false }),
            React.createElement(Tooltip, {
              content: React.createElement(ChartTooltip, {
                formatter: (value) => new Intl.NumberFormat("tr-TR").format(Number(value)),
              }),
            }),
            React.createElement(Bar, {
              dataKey: "completed",
              name: "Tamamlanan görev",
              radius: [14, 14, 0, 0],
              fill: "#0f172a",
            }),
          ),
        ),
      ),
    ),
  );
}
