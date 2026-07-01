import React from "react";
import { LoaderCircle } from "lucide-react";

import cn from "../utils/cn.js";

const h = React.createElement;

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

  return h(
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
        "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
        buttonVariants[variant] ?? buttonVariants.primary,
        buttonSizes[size] ?? buttonSizes.md,
        className,
      ),
      ...props,
    },
    loading ? h(Spinner, { size: 16, className: "shrink-0" }) : leftIcon,
    h("span", { className: "truncate" }, children),
    rightIcon,
  );
}

export function Card({ className, children, ...props }) {
  return h(
    "article",
    {
      className: cn(
        "rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-4 shadow-sm backdrop-blur",
        "dark:border-slate-800 dark:bg-slate-950/70",
        className,
      ),
      ...props,
    },
    children,
  );
}

export function CardHeader({ className, children, ...props }) {
  return h("div", { className: cn("flex flex-wrap items-start justify-between gap-3", className), ...props }, children);
}

export function CardTitle({ className, children, ...props }) {
  return h("h3", { className: cn("text-base font-bold tracking-tight text-slate-950 dark:text-slate-50", className), ...props }, children);
}

export function CardDescription({ className, children, ...props }) {
  return h("p", { className: cn("text-sm leading-6 text-slate-500 dark:text-slate-400", className), ...props }, children);
}

export function CardContent({ className, children, ...props }) {
  return h("div", { className: cn("mt-4", className), ...props }, children);
}

export function Input({ className, ...props }) {
  return h("input", {
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
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300",
  destructive: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300",
  outline: "border-slate-200 bg-transparent text-slate-700 dark:border-slate-700 dark:text-slate-200",
};

const badgeSizes = {
  xs: "px-2 py-0.5 text-[11px]",
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
};

export function Badge({ variant = "default", size = "sm", className, children, ...props }) {
  return h(
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
  return h(LoaderCircle, {
    size,
    className: cn("animate-spin", className),
    "aria-hidden": "true",
  });
}

export function Skeleton({ className, ...props }) {
  return h("div", { className: cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800", className), ...props });
}

export function VehicleListSkeleton({ rows = 4 }) {
  return h(
    Card,
    { className: "overflow-hidden" },
    h(
      CardHeader,
      null,
      h("div", { className: "space-y-2" }, h(Skeleton, { className: "h-4 w-28" }), h(Skeleton, { className: "h-6 w-48" })),
      h(Skeleton, { className: "h-9 w-28 rounded-full" }),
    ),
    h(
      "div",
      { className: "mt-5 grid gap-3" },
      Array.from({ length: rows }).map((_, index) =>
        h(
          "div",
          {
            key: `vehicle-skeleton-${index}`,
            className:
              "flex items-center gap-4 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60",
          },
          h(Skeleton, { className: "h-12 w-12 rounded-2xl" }),
          h("div", { className: "min-w-0 flex-1 space-y-3" }, h(Skeleton, { className: "h-4 w-32" }), h(Skeleton, { className: "h-3 w-3/4" })),
        ),
      ),
    ),
  );
}

