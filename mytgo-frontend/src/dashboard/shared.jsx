import React from "react";
import { Activity, CarFront, Sparkles } from "lucide-react";

import { Badge, Button, Card } from "../ui/system.js";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function BrandLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="logo-mark" aria-hidden="true">
        <CarFront className="logo-mark__svg" focusable="false" />
      </span>
      {!compact ? (
        <span className="brand-wordmark">
          <span className="block text-2xl font-black tracking-tight text-white">E-Cars</span>
          <span className="brand-wordmark-caret" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

export function ShellFrame({ title, subtitle, themeToggle, children }) {
  return (
    <main className="auth-shell min-h-dvh text-mytgo-ink">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="hidden rounded-[2.25rem] bg-mytgo-gradient p-8 text-white shadow-glow lg:block">
          <BrandLogo />
          <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
            Aracını servis, vale ve chat ile tek panelden yönet.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/76">
            Canlı konum takibi, randevu akışı ve rol bazlı operasyonlar için modern E-Cars deneyimi.
          </p>
        </div>
        <div className="auth-card rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-soft backdrop-blur sm:p-7 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-3">
            <BrandLogo compact />
            <div className="shrink-0">{themeToggle}</div>
          </div>
          <div className="mt-6 border-b border-mytgo-line pb-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mytgo-teal">{title}</p>
            {subtitle ? <h1 className="mt-2 text-2xl font-black">{subtitle}</h1> : null}
          </div>
          <div className="pt-5">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function Panel({ title, icon: Icon, description, children }) {
  return (
    <section className="panel-card grid gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mytgo-gradient text-white shadow-glow">
          <Icon size={22} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-mytgo-teal">Operasyon</p>
          <h2 className="text-2xl font-black">{title}</h2>
          <p className="panel-description mt-1 max-w-2xl">{description ?? "Rol bazlı operasyonlar için detaylı işlem alanı."}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function CardGrid({ children }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function DetailRows({ rows }) {
  return (
    <dl className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/60">
          <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</dt>
          <dd className="text-right text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusTimeline({ steps }) {
  return (
    <ol className="grid gap-2" aria-label="Durum zaman çizelgesi">
      {steps.map((step) => (
        <li
          key={step.key}
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold",
            step.state === "done"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200"
              : step.state === "current"
                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
                : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400",
          )}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function InfoCard({ title, meta, description, icon: Icon = Sparkles, children }) {
  return (
    <article className="info-card overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-4 shadow-sm backdrop-blur transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-slate-100 dark:text-slate-950">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-black leading-tight text-slate-950 dark:text-slate-50">{title}</h3>
          {description ? <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        <Badge variant="outline" className="shrink-0">
          {meta}
        </Badge>
      </div>
      <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </article>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = Activity }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/60">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950 dark:text-slate-50">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-4" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
