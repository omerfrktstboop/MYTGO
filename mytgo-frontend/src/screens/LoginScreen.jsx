import React, { useEffect, useState } from "react";
import { Check, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { defaultSectionByRole, demoUsers, roleLabels } from "../dashboard/config.js";
import { BrandLogo, ShellFrame } from "../dashboard/shared.jsx";
import { Button, ThemeToggle } from "../ui/system.js";
import { useSession } from "../state/session.jsx";

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950/80">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            value === key
              ? "bg-slate-950 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function LoginScreen() {
  const { authenticate, isAuthenticated, user } = useSession();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "customer@mytgo.local",
    password: "DemoPass123!",
    full_name: "E-Car Customer",
    phone: "",
    role: "customer",
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/app/${defaultSectionByRole[user.role] ?? "vehicles"}`, { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      const payload =
        authMode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              full_name: form.full_name,
              phone: form.phone || null,
              role: form.role,
            };

      const response = await authenticate(authMode, payload);
      navigate(`/app/${defaultSectionByRole[response.user.role] ?? "vehicles"}`, { replace: true });
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ShellFrame
      title="Giriş"
      subtitle="Araç bakım ve vale operasyonu"
      themeToggle={<ThemeToggle className="shrink-0" />}
    >
      <form className="grid gap-3" onSubmit={submit}>
        <Segmented
          value={authMode}
          options={[
            ["login", "Giriş"],
            ["register", "Kayıt"],
          ]}
          onChange={setAuthMode}
        />
        <Field label="E-posta">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </Field>
        <Field label="Şifre">
          <input
            type="password"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>
        {authMode === "register" ? (
          <>
            <Field label="Ad Soyad">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                value={form.full_name}
                onChange={(event) => update("full_name", event.target.value)}
              />
            </Field>
            <Field label="Telefon">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
              />
            </Field>
            <Field label="Rol">
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                value={form.role}
                onChange={(event) => update("role", event.target.value)}
              >
                {Object.entries(roleLabels).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
        {authError ? <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{authError}</p> : null}
        <Button className="w-full" leftIcon={<Check size={18} />} loading={submitting} type="submit">
          {authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}
        </Button>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {demoUsers.map(([label, email, role]) => (
          <button
            key={role}
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            onClick={() => {
              setForm((current) => ({
                ...current,
                email,
                role,
                password: "DemoPass123!",
                full_name: `E-Cars ${label}`,
              }));
              setAuthMode("login");
            }}
          >
            <UserRound size={17} />
            {label}
          </button>
        ))}
      </div>
    </ShellFrame>
  );
}
