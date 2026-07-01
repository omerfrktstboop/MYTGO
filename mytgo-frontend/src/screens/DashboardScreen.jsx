import React, { lazy, Suspense, useMemo, useState } from "react";
import { Activity, ArrowLeftToLine, BellRing, LogOut, Menu, UserRound } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { navByRole, panelDescriptions, roleLabels, sectionMetaBySlug } from "../dashboard/config.js";
import { EmptyState, BrandLogo } from "../dashboard/shared.jsx";
import { Badge, Button, Card, Skeleton, ThemeToggle } from "../ui/system.js";
import { DashboardProvider, useDashboard } from "../state/dashboard.jsx";
import { useSession } from "../state/session.jsx";

const sectionLoaders = {
  vehicles: lazy(() => import("./panels/VehiclesPanel.jsx")),
  appointments: lazy(() => import("./panels/AppointmentsPanel.jsx")),
  map: lazy(() => import("./panels/MapPanel.jsx")),
  charging: lazy(() => import("./panels/ChargingPanel.jsx")),
  roadside: lazy(() => import("./panels/RoadsidePanel.jsx")),
  valet: lazy(() => import("./panels/ValetPanel.jsx")),
  tracking: lazy(() => import("./panels/TrackingPanel.jsx")),
  chat: lazy(() => import("./panels/ChatPanel.jsx")),
  notifications: lazy(() => import("./panels/NotificationsPanel.jsx")),
  profile: lazy(() => import("./panels/ProfilePanel.jsx")),
  settings: lazy(() => import("./panels/SettingsPanel.jsx")),
  admin: lazy(() => import("./panels/AdminPanel.jsx")),
};

function PanelLoading() {
  return (
    <Card className="grid gap-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-72 w-full" />
    </Card>
  );
}

function SectionBody({ section }) {
  const Panel = sectionLoaders[section];
  if (!Panel) {
    return (
      <EmptyState
        title="Bilinmeyen bölüm"
        description="Bu rota erişilebilir bir panel üretmedi. Menüden geçerli bir bölüm seçin."
        actionLabel="İlk bölüme dön"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <Suspense fallback={<PanelLoading />}>
      <Panel />
    </Suspense>
  );
}

function DashboardShell() {
  const navigate = useNavigate();
  const { section } = useParams();
  const { user, logout } = useSession();
  const { notice, error, unreadNotificationCount } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = navByRole[user.role] ?? [];
  const currentSection = useMemo(() => {
    if (!section) {
      return menuItems[0]?.slug;
    }
    return menuItems.some((item) => item.slug === section) ? section : menuItems[0]?.slug;
  }, [menuItems, section]);

  if (!currentSection) {
    return <Navigate to="/login" replace />;
  }

  if (section !== currentSection) {
    return <Navigate to={`/app/${currentSection}`} replace />;
  }

  const currentItem = menuItems.find((item) => item.slug === currentSection) ?? menuItems[0];
  const currentDescription = panelDescriptions[currentSection] ?? "Rol bazlı operasyonlar için detaylı işlem alanı.";

  return (
    <main className="app-shell min-h-dvh text-mytgo-ink">
      {sidebarOpen ? (
        <button
          aria-label="Menüyü kapat"
          className="sidebar-scrim lg:hidden"
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />
          <button
            aria-label="Menüyü kapat"
            className="sidebar-back-button lg:hidden"
            type="button"
            onClick={() => setSidebarOpen(false)}
          >
            <ArrowLeftToLine size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="sidebar-active-card mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">Seçili İşlem</p>
          <p className="mt-2 text-2xl font-black">{currentItem?.label}</p>
          <p className="mt-1 text-sm text-white/75">{currentDescription}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/85 ring-1 ring-white/18">
            <Activity size={14} />
            {roleLabels[user.role]} erişimi
          </div>
        </div>

        <nav className="mt-7 grid gap-2" aria-label="Ana menü">
          <p className="px-2 text-xs font-black uppercase tracking-[0.22em] text-white/55">İşlemler</p>
          {menuItems.map((item) => (
            <button
              key={item.slug}
              aria-current={currentSection === item.slug ? "page" : undefined}
              className={`sidebar-link ${currentSection === item.slug ? "sidebar-link-active" : ""}`}
              type="button"
              onClick={() => {
                navigate(`/app/${item.slug}`);
                setSidebarOpen(false);
              }}
              title={item.label}
            >
              <span className="sidebar-link-icon">
                <item.icon size={18} />
              </span>
              <span className="sidebar-link-copy">
                <span className="sidebar-link-title">{item.label}</span>
                <span className="sidebar-link-meta">{sectionMetaBySlug[item.slug] ?? "Aç"}</span>
              </span>
              {currentSection === item.slug ? <span className="sidebar-link-badge">Aktif</span> : null}
              {item.slug === "notifications" && unreadNotificationCount > 0 ? (
                <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">
                  {unreadNotificationCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <button
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left font-bold text-white transition hover:bg-red-500/18"
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            logout();
            navigate("/login", { replace: true });
          }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-100 ring-1 ring-red-300/20">
            <LogOut size={18} />
          </span>
          <span className="flex-1">
            <span className="block text-sm">Çıkış Yap</span>
            <span className="block text-xs font-medium text-white/65">Oturumu kapat</span>
          </span>
        </button>

        <div className="mt-auto rounded-3xl border border-white/15 bg-white/10 p-4 text-white">
          <p className="text-sm font-bold">{user.full_name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">{roleLabels[user.role]}</p>
        </div>
      </aside>

      <section className="dashboard-surface min-h-dvh px-4 py-5 sm:px-6 lg:ml-[19rem] lg:px-8">
        <header className="hero-card overflow-hidden rounded-[2rem] p-5 text-white shadow-glow sm:p-7">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
                  <button
                    aria-label="Menüyü aç"
                    className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/16 text-white ring-1 ring-white/25"
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu size={20} />
                  </button>
                  <span className="rounded-full bg-white/16 px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] ring-1 ring-white/20">
                    Mobil Panel
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] ring-1 ring-white/15">
                    Operasyon
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/80">İlgili işlem</p>
                <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">{currentItem?.label}</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/78 sm:text-base">{currentDescription}</p>
              </div>

              <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
                <span className="rounded-full bg-white/16 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1 ring-white/20">
                  {roleLabels[user.role]}
                </span>
                <div className="flex items-center gap-2">
                  <ThemeToggle className="bg-white/12 text-white hover:bg-white/20" />
                  <button className="hero-action-button" type="button" onClick={() => navigate("/app/notifications")}>
                    Bildirimlere git
                  </button>
                </div>
              </div>
            </div>

            <div className="hero-inline-strip">
              <div className="hero-inline-item">
                <UserRound size={16} />
                <span>{user.full_name}</span>
              </div>
              <div className="hero-inline-item">
                <BellRing size={16} />
                <span>{unreadNotificationCount} okunmamış</span>
              </div>
              <div className="hero-inline-item">
                <Activity size={16} />
                <span>{menuItems.length} menü öğesi</span>
              </div>
            </div>
          </div>
        </header>

        {(notice || error) ? (
          <p
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              error
                ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
                : "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
            }`}
          >
            {error || notice}
          </p>
        ) : null}

        <div className="py-6">
          <SectionBody section={currentSection} />
        </div>
      </section>
    </main>
  );
}

export default function DashboardScreen() {
  const { user, booting, isAuthenticated } = useSession();

  if (booting) {
    return (
      <div className="auth-shell grid min-h-dvh place-items-center px-4 text-center text-slate-700 dark:text-slate-200">
        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <BrandLogo compact />
          <p className="mt-4 text-sm font-semibold">Bağlantı kuruluyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardProvider>
      <DashboardShell />
    </DashboardProvider>
  );
}
