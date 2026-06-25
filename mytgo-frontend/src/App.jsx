import "leaflet/dist/leaflet.css";

import {
  Activity,
  BarChart3,
  BellRing,
  CalendarCheck,
  CarFront,
  Check,
  Crown,
  Gauge,
  Layers3,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Plus,
  Route,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./services/apiClient";
import {
  AdminReportPanel,
  fetchAdminReportOverview,
  getAdminReportErrorMessage,
} from "./adminReport";
import {
  buildAppointmentTimeline,
  buildValetTimeline,
  formatCurrencyFromCents,
  getDetailRows,
  serviceLabels,
  statusLabels,
} from "./appDetails";
import { ServiceHistoryLoader } from "./serviceHistory";
import { createRealtimeSocket } from "./services/realtime";

const demoUsers = [
  ["Müşteri", "customer@mytgo.local", "customer"],
  ["Usta", "mechanic@mytgo.local", "mechanic"],
  ["Vale", "valet@mytgo.local", "valet"],
  ["Admin", "admin@mytgo.local", "admin"],
];

const roleLabels = {
  customer: "Müşteri",
  mechanic: "Usta",
  valet: "Vale",
  admin: "Admin",
};

const roleAccentLabels = {
  customer: "Müşteri Deneyimi",
  mechanic: "Servis Atölyesi",
  valet: "Vale Operasyon",
  admin: "Admin HQ",
};

const brandTokens = [
  ["Violet", "#7c3aed"],
  ["Cyan", "#0891b2"],
  ["Rose", "#f43f5e"],
  ["Neon", "#b6ff5c"],
];

const navByRole = {
  customer: [
    ["Araç", CarFront],
    ["Randevu", CalendarCheck],
    ["Vale", MapPin],
    ["Chat", MessageCircle],
  ],
  mechanic: [
    ["Randevu", Wrench],
    ["Chat", MessageCircle],
  ],
  valet: [
    ["Transfer", CarFront],
    ["Takip", MapPin],
  ],
  admin: [
    ["Panel", ShieldCheck],
    ["Vale", MapPin],
    ["Chat", MessageCircle],
  ],
};

function App() {
  const [token, setToken] = useState(getStoredToken());
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [booting, setBooting] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    apiRequest("/api/v1/auth/me", { token })
      .then(setUser)
      .catch(() => {
        clearStoredToken();
        setToken(null);
      })
      .finally(() => setBooting(false));
  }, [token]);

  async function handleAuth(payload) {
    setAuthError("");
    const path = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    try {
      const response = await apiRequest(path, {
        method: "POST",
        body: payload,
        token: null,
      });
      setStoredToken(response.access_token);
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  function handleLogout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  if (booting) {
    return <ShellFrame title="MYTGO">Bağlantı kuruluyor...</ShellFrame>;
  }

  if (!user || !token) {
    return (
      <AuthScreen
        authMode={authMode}
        error={authError}
        onAuth={handleAuth}
        onModeChange={setAuthMode}
      />
    );
  }

  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}

function AuthScreen({ authMode, error, onAuth, onModeChange }) {
  const [form, setForm] = useState({
    email: "customer@mytgo.local",
    password: "DemoPass123!",
    full_name: "MYTGO Customer",
    phone: "",
    role: "customer",
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
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
    onAuth(payload);
  }

  return (
    <ShellFrame title="MYTGO" subtitle="Araç bakım ve vale operasyonu">
      <form className="grid gap-3" onSubmit={submit}>
        <Segmented
          value={authMode}
          options={[
            ["login", "Giriş"],
            ["register", "Kayıt"],
          ]}
          onChange={onModeChange}
        />
        <Field label="E-posta">
          <input value={form.email} onChange={(event) => update("email", event.target.value)} />
        </Field>
        <Field label="Şifre">
          <input
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
          />
        </Field>
        {authMode === "register" && (
          <>
            <Field label="Ad Soyad">
              <input
                value={form.full_name}
                onChange={(event) => update("full_name", event.target.value)}
              />
            </Field>
            <Field label="Telefon">
              <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
            </Field>
            <Field label="Rol">
              <select value={form.role} onChange={(event) => update("role", event.target.value)}>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <option key={role} value={role}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="command command-primary" type="submit">
          <Check size={18} />
          {authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}
        </button>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {demoUsers.map(([label, email, role]) => (
          <button
            className="command command-ghost"
            key={role}
            type="button"
            onClick={() => {
              setForm((current) => ({
                ...current,
                email,
                role,
                password: "DemoPass123!",
                full_name: `MYTGO ${label}`,
              }));
              onModeChange("login");
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

function Dashboard({ token, user, onLogout }) {
  const [vehicles, setVehicles] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [valetRequests, setValetRequests] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [active, setActive] = useState(navByRole[user.role][0][0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    setError("");
    try {
      const [vehiclesData, appointmentsData, valetData, conversationsData] = await Promise.all([
        apiRequest("/api/v1/vehicles", { token }).catch(() => []),
        apiRequest("/api/v1/appointments", { token }).catch(() => []),
        apiRequest("/api/v1/valet-requests", { token }).catch(() => []),
        apiRequest("/api/v1/conversations", { token }).catch(() => []),
      ]);
      setVehicles(vehiclesData);
      setAppointments(appointmentsData);
      setValetRequests(valetData);
      setConversations(conversationsData);
      if (user.role === "admin") {
        setUsers(await apiRequest("/api/v1/users", { token }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    refresh();
  }, [token, user.role]);

  const totals = [
    ["Araç", vehicles.length, CarFront, "from-violet-500 to-cyan-500"],
    ["Randevu", appointments.length, CalendarCheck, "from-blue-500 to-violet-500"],
    ["Vale", valetRequests.length, Route, "from-cyan-500 to-emerald-400"],
    ["Chat", conversations.length, MessageCircle, "from-rose-500 to-orange-400"],
  ];

  const panels = {
    Araç: (
      <CustomerVehicles
        token={token}
        vehicles={vehicles}
        onChanged={() => refreshWithNotice(refresh, setNotice, "Araç kaydedildi")}
      />
    ),
    Randevu:
      user.role === "mechanic" ? (
        <MechanicAppointments
          token={token}
          appointments={appointments}
          onChanged={() => refreshWithNotice(refresh, setNotice, "Randevu güncellendi")}
        />
      ) : (
        <CustomerAppointments
          token={token}
          vehicles={vehicles}
          appointments={appointments}
          onChanged={(message = "Randevu oluşturuldu") => refreshWithNotice(refresh, setNotice, message)}
        />
      ),
    Vale: (
      <ValetPanel
        token={token}
        role={user.role}
        appointments={appointments}
        valetRequests={valetRequests}
        onChanged={() => refreshWithNotice(refresh, setNotice, "Vale akışı güncellendi")}
      />
    ),
    Chat: <ChatPanel token={token} user={user} conversations={conversations} />,
    Transfer: (
      <ValetOperations
        token={token}
        valetRequests={valetRequests}
        onChanged={() => refreshWithNotice(refresh, setNotice, "Transfer güncellendi")}
      />
    ),
    Takip: <ValetSimulator token={token} valetRequests={valetRequests} />,
    Panel: (
      <AdminPanel
        token={token}
        appointments={appointments}
        valetRequests={valetRequests}
        users={users}
        vehicles={vehicles}
      />
    ),
  };

  return (
    <main className="app-shell min-h-dvh text-mytgo-ink">
      {sidebarOpen && (
        <button
          aria-label="Menüyü kapat"
          className="sidebar-scrim lg:hidden"
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <BrandLogo />
          <button
            aria-label="Menüyü kapat"
            className="icon-command border-white/20 bg-white/10 text-white lg:hidden"
            type="button"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 rounded-3xl bg-white/14 p-4 text-white shadow-glow ring-1 ring-white/20">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">Canlı Operasyon</p>
          <p className="mt-2 text-2xl font-black">{roleLabels[user.role]} Paneli</p>
          <p className="mt-1 text-sm text-white/75">{roleAccentLabels[user.role]} için mobil öncelikli kontrol.</p>
        </div>

        <nav className="mt-8 grid gap-2" aria-label="Ana menü">
          <p className="px-2 text-xs font-black uppercase tracking-[0.22em] text-white/55">Sol Menü</p>
          {navByRole[user.role].map(([label, Icon]) => (
            <button
              key={label}
              className={`sidebar-link ${active === label ? "sidebar-link-active" : ""}`}
              type="button"
              onClick={() => {
                setActive(label);
                setSidebarOpen(false);
              }}
              title={label}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="brand-system-card mt-3 text-white">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/70">
            <Gauge size={15} />
            Marka Sistemi
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2" aria-label="MYTGO renk sistemi">
            {brandTokens.map(([name, color]) => (
              <span className="brand-swatch" key={name} title={name} style={{ background: color }} />
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-white/82">Parlak CTA, yüksek kontrast ve tek elle erişilebilir akışlar.</p>
        </div>

        <div className="mt-auto rounded-3xl border border-white/15 bg-white/10 p-4 text-white">
          <p className="text-sm font-bold">{user.full_name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/65">{roleLabels[user.role]}</p>
          <button
            className="mt-4 w-full justify-start border-white/20 bg-white/10 text-white command"
            type="button"
            onClick={onLogout}
          >
            <LogOut size={18} />
            Çıkış
          </button>
        </div>
      </aside>

      <section className="dashboard-surface min-h-dvh px-4 py-5 sm:px-6 lg:ml-[19rem] lg:px-8">
        <header className="hero-card overflow-hidden rounded-[2rem] p-5 text-white shadow-glow sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mobile-topbar mb-4 lg:hidden">
                <button
                  aria-label="Menüyü aç"
                  className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-white/16 text-white ring-1 ring-white/25"
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu size={22} />
                </button>
                <span className="rounded-full bg-white/16 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ring-1 ring-white/20">
                  Mobil Panel
                </span>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">MYTGO kontrol merkezi</p>
              <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
                Parlak marka sistemiyle servis, vale ve chat tek akışta
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/78 sm:text-base">
                {roleLabels[user.role]} akışı için randevu, vale takibi ve mesajlaşma modern tek panelde.
              </p>
            </div>
            <div className="hidden shrink-0 rounded-3xl bg-white/15 p-3 ring-1 ring-white/20 sm:block">
              <BrandLogo compact />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              [Crown, "Premium marka", "Gradient kimlik + neon vurgu"],
              [Smartphone, "Mobil öncelik", "Sidebar drawer ve büyük dokunma alanı"],
              [BellRing, "Canlı aksiyon", "Teklif, vale ve chat hızlı komutları"],
            ].map(([Icon, title, copy]) => (
              <div className="brand-promise-card" key={title}>
                <Icon size={20} />
                <div>
                  <p className="font-black">{title}</p>
                  <p className="text-xs text-white/70">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {totals.map(([label, value, Icon, accent]) => (
              <div className="stat-card" key={label}>
                <span className={`stat-icon bg-gradient-to-br ${accent}`}>
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/65">{label}</p>
                  <p className="mt-1 text-2xl font-black">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        {(notice || error) && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
          </p>
        )}

        <div className="py-6">{panels[active]}</div>
      </section>
    </main>
  );
}

function CustomerVehicles({ token, vehicles, onChanged }) {
  const [form, setForm] = useState({ plate_number: "", brand: "", model: "", year: "" });

  async function submit(event) {
    event.preventDefault();
    await apiRequest("/api/v1/vehicles", {
      method: "POST",
      token,
      body: { ...form, year: form.year ? Number(form.year) : null },
    });
    setForm({ plate_number: "", brand: "", model: "", year: "" });
    onChanged();
  }

  return (
    <Panel title="Araçlar" icon={CarFront}>
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
        <Field label="Plaka">
          <input
            value={form.plate_number}
            onChange={(event) => setForm({ ...form, plate_number: event.target.value })}
            required
          />
        </Field>
        <Field label="Marka">
          <input
            value={form.brand}
            onChange={(event) => setForm({ ...form, brand: event.target.value })}
            required
          />
        </Field>
        <Field label="Model">
          <input
            value={form.model}
            onChange={(event) => setForm({ ...form, model: event.target.value })}
            required
          />
        </Field>
        <Field label="Yıl">
          <input
            type="number"
            value={form.year}
            onChange={(event) => setForm({ ...form, year: event.target.value })}
          />
        </Field>
        <button className="command command-primary sm:col-span-4" type="submit">
          <Plus size={18} />
          Araç Ekle
        </button>
      </form>
      <CardGrid>
        {vehicles.map((vehicle) => (
          <InfoCard key={vehicle.id} title={vehicle.plate_number} meta={`${vehicle.brand} ${vehicle.model}`}>
            {vehicle.year ?? "Yıl belirtilmedi"}
            <ServiceHistoryLoader apiRequest={apiRequest} token={token} vehicle={vehicle} />
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}

function CustomerAppointments({ token, vehicles, appointments, onChanged }) {
  const [form, setForm] = useState({
    vehicle_id: "",
    service_type: "repair",
    service_address: "MYTGO Sanayi",
    notes: "",
  });

  async function submit(event) {
    event.preventDefault();
    await apiRequest("/api/v1/appointments", {
      method: "POST",
      token,
      body: { ...form, vehicle_id: Number(form.vehicle_id) },
    });
    setForm((current) => ({ ...current, notes: "" }));
    onChanged();
  }

  async function approveQuote(id) {
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: { status: "approved" },
    });
    onChanged("Teklif onaylandı");
  }

  return (
    <Panel title="Randevular" icon={CalendarCheck}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
        <Field label="Araç">
          <select
            value={form.vehicle_id}
            onChange={(event) => setForm({ ...form, vehicle_id: event.target.value })}
            required
          >
            <option value="">Seç</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate_number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Servis">
          <select
            value={form.service_type}
            onChange={(event) => setForm({ ...form, service_type: event.target.value })}
          >
            {Object.entries(serviceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Adres">
          <input
            value={form.service_address}
            onChange={(event) => setForm({ ...form, service_address: event.target.value })}
          />
        </Field>
        <Field label="Not">
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </Field>
        <button className="command command-primary sm:col-span-2" type="submit">
          <Plus size={18} />
          Randevu Oluştur
        </button>
      </form>
      <AppointmentList appointments={appointments} onApproveQuote={approveQuote} />
    </Panel>
  );
}

function MechanicAppointments({ token, appointments, onChanged }) {
  const [quoteForms, setQuoteForms] = useState({});

  async function patch(id, status) {
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    onChanged();
  }

  async function sendQuote(event, id) {
    event.preventDefault();
    const form = quoteForms[id] ?? { amount: "", notes: "" };
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: {
        quote_amount_cents: Math.round(Number(form.amount) * 100),
        quote_notes: form.notes || null,
      },
    });
    setQuoteForms((current) => ({ ...current, [id]: { amount: "", notes: "" } }));
    onChanged();
  }

  function updateQuoteForm(id, key, value) {
    setQuoteForms((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? {}),
        [key]: value,
      },
    }));
  }

  return (
    <Panel title="Servis Kuyruğu" icon={Wrench}>
      <CardGrid>
        {appointments.map((appointment) => (
          <InfoCard
            key={appointment.id}
            title={serviceLabels[appointment.service_type]}
            meta={statusLabels[appointment.status]}
          >
            <DetailRows rows={getDetailRows("appointment", appointment)} />
            <StatusTimeline steps={buildAppointmentTimeline(appointment)} />
            <form className="quote-form" onSubmit={(event) => sendQuote(event, appointment.id)}>
              <Field label="Teklif (₺)">
                <input
                  min="0"
                  step="1"
                  type="number"
                  value={quoteForms[appointment.id]?.amount ?? ""}
                  onChange={(event) => updateQuoteForm(appointment.id, "amount", event.target.value)}
                  required
                />
              </Field>
              <Field label="Teklif notu">
                <input
                  value={quoteForms[appointment.id]?.notes ?? ""}
                  onChange={(event) => updateQuoteForm(appointment.id, "notes", event.target.value)}
                  placeholder="Parça + işçilik dahil"
                />
              </Field>
              <button className="command command-primary" type="submit">
                <Send size={18} />
                Teklif Gönder
              </button>
            </form>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["approved", "in_progress", "completed"].map((status) => (
                <button
                  className="mini-command"
                  key={status}
                  type="button"
                  onClick={() => patch(appointment.id, status)}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}

function ValetPanel({ token, role, appointments, valetRequests, onChanged }) {
  const [form, setForm] = useState({
    appointment_id: "",
    pickup_address: "Müşteri Adresi",
    dropoff_address: "MYTGO Sanayi",
  });

  async function submit(event) {
    event.preventDefault();
    await apiRequest("/api/v1/valet-requests", {
      method: "POST",
      token,
      body: {
        appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
        pickup_address: form.pickup_address,
        dropoff_address: form.dropoff_address,
      },
    });
    onChanged();
  }

  return (
    <Panel title="Vale" icon={MapPin}>
      {role === "customer" && (
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={submit}>
          <Field label="Randevu">
            <select
              value={form.appointment_id}
              onChange={(event) => setForm({ ...form, appointment_id: event.target.value })}
            >
              <option value="">Bağımsız</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  #{appointment.id} {serviceLabels[appointment.service_type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Alış">
            <input
              value={form.pickup_address}
              onChange={(event) => setForm({ ...form, pickup_address: event.target.value })}
            />
          </Field>
          <Field label="Teslim">
            <input
              value={form.dropoff_address}
              onChange={(event) => setForm({ ...form, dropoff_address: event.target.value })}
            />
          </Field>
          <button className="command command-primary sm:col-span-3" type="submit">
            <CarFront size={18} />
            Vale Çağır
          </button>
        </form>
      )}
      <TrackingMap token={token} transfers={valetRequests} role={role} />
    </Panel>
  );
}

function ValetOperations({ token, valetRequests, onChanged }) {
  async function patch(id, status) {
    await apiRequest(`/api/v1/valet-requests/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    onChanged();
  }

  return (
    <Panel title="Transferler" icon={CarFront}>
      <CardGrid>
        {valetRequests.map((transfer) => (
          <InfoCard key={transfer.id} title={`Transfer #${transfer.id}`} meta={statusLabels[transfer.status]}>
            <DetailRows rows={getDetailRows("valet", transfer)} />
            <StatusTimeline steps={buildValetTimeline(transfer)} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["picking_up", "in_transit_to_service", "returning", "delivered"].map((status) => (
                <button
                  className="mini-command"
                  key={status}
                  type="button"
                  onClick={() => patch(transfer.id, status)}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </InfoCard>
        ))}
      </CardGrid>
    </Panel>
  );
}

function ValetSimulator({ token, valetRequests }) {
  return (
    <Panel title="Canlı Takip" icon={MapPin}>
      <TrackingMap token={token} transfers={valetRequests} role="valet" />
    </Panel>
  );
}

function TrackingMap({ token, transfers, role }) {
  const [selectedId, setSelectedId] = useState(transfers[0]?.id ?? "");
  const [position, setPosition] = useState([41.015137, 28.97953]);
  const [trail, setTrail] = useState([[41.015137, 28.97953]]);
  const [running, setRunning] = useState(false);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  const selectedTransfer = useMemo(
    () => transfers.find((transfer) => transfer.id === Number(selectedId)),
    [selectedId, transfers],
  );

  useEffect(() => {
    if (!selectedTransfer && transfers[0]) {
      setSelectedId(transfers[0].id);
    }
  }, [selectedTransfer, transfers]);

  useEffect(() => {
    if (!selectedTransfer) {
      return undefined;
    }
    const initial =
      selectedTransfer.current_latitude && selectedTransfer.current_longitude
        ? [Number(selectedTransfer.current_latitude), Number(selectedTransfer.current_longitude)]
        : [41.015137, 28.97953];
    setPosition(initial);
    setTrail([initial]);

    const socket = createRealtimeSocket(`/ws/valet/${selectedTransfer.id}`, token);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type !== "valet_location") {
        return;
      }
      const next = [
        Number(payload.transfer.current_latitude),
        Number(payload.transfer.current_longitude),
      ];
      setPosition(next);
      setTrail((current) => [...current.slice(-18), next]);
    };
    return () => {
      clearInterval(intervalRef.current);
      socket.close();
      setRunning(false);
    };
  }, [selectedTransfer?.id, token]);

  function toggleSimulation() {
    if (!socketRef.current || role !== "valet") {
      return;
    }
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
      return;
    }

    let step = 0;
    intervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }
      step += 1;
      const next = {
        latitude: 41.015137 + step * 0.0012,
        longitude: 28.97953 + step * 0.001,
      };
      socketRef.current.send(JSON.stringify(next));
    }, 1200);
    setRunning(true);
  }

  return (
    <div className="mt-4 grid gap-3">
      <Field label="Transfer">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {transfers.map((transfer) => (
            <option key={transfer.id} value={transfer.id}>
              #{transfer.id} {statusLabels[transfer.status]}
            </option>
          ))}
        </select>
      </Field>
      {role === "valet" && (
        <button className="command command-primary" type="button" onClick={toggleSimulation}>
          {running ? <Square size={18} /> : <Play size={18} />}
          {running ? "Simülasyonu Durdur" : "Konum Simülasyonu Başlat"}
        </button>
      )}
      <div className="overflow-hidden rounded-lg border border-mytgo-line bg-white">
        <MapContainer center={position} zoom={13} scrollWheelZoom className="h-[360px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker center={position} radius={10} pathOptions={{ color: "#0f766e" }}>
            <Popup>MYTGO Vale</Popup>
          </CircleMarker>
          <Polyline positions={trail} pathOptions={{ color: "#d97706", weight: 4 }} />
        </MapContainer>
      </div>
    </div>
  );
}

function ChatPanel({ token, user, conversations }) {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const socketRef = useRef(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === Number(selectedId)),
    [selectedId, conversations],
  );

  useEffect(() => {
    if (!activeConversation && conversations[0]) {
      setSelectedId(conversations[0].id);
    }
  }, [activeConversation, conversations]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return undefined;
    }

    apiRequest(`/api/v1/conversations/${activeConversation.id}/messages`, { token }).then(setMessages);
    const socket = createRealtimeSocket(`/ws/chat/${activeConversation.id}`, token);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "chat_message") {
        setMessages((current) => [...current, payload.message]);
      }
    };
    return () => socket.close();
  }, [activeConversation?.id, token]);

  function send(event) {
    event.preventDefault();
    const text = content.trim();
    if (!text || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(JSON.stringify({ content: text }));
    setContent("");
  }

  return (
    <Panel title="Chat" icon={MessageCircle}>
      <Field label="Görüşme">
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              #{conversation.id} Müşteri {conversation.customer_id} / Usta {conversation.mechanic_id}
            </option>
          ))}
        </select>
      </Field>
      <div className="mt-4 grid h-[420px] content-end gap-2 overflow-y-auto rounded-lg border border-mytgo-line bg-white p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
              message.sender_id === user.id
                ? "ml-auto bg-mytgo-teal text-white"
                : "mr-auto bg-mytgo-panel text-mytgo-ink"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={send}>
        <input value={content} onChange={(event) => setContent(event.target.value)} />
        <button className="icon-command bg-mytgo-ink text-white" type="submit" title="Gönder">
          <Send size={19} />
        </button>
      </form>
    </Panel>
  );
}

function getDefaultAdminReportFilters() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    timezone: "Europe/Istanbul",
  };
}

function AdminPanel({ token, appointments, valetRequests, users, vehicles }) {
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState("loading");
  const [reportError, setReportError] = useState(null);
  const [reportFilters, setReportFilters] = useState(getDefaultAdminReportFilters);

  async function loadReport() {
    setReportStatus("loading");
    setReportError(null);
    try {
      const data = await fetchAdminReportOverview({
        apiRequest,
        token,
        ...reportFilters,
      });
      setReport(data);
      setReportStatus("success");
    } catch (err) {
      setReportError(err);
      setReportStatus("error");
    }
  }

  useEffect(() => {
    loadReport();
  }, [token]);

  const stats = [
    ["Kullanıcı", users.length],
    ["Araç", vehicles.length],
    ["Randevu", appointments.length],
    ["Vale", valetRequests.length],
  ];

  return (
    <Panel title="Admin" icon={ShieldCheck}>
      <div className="admin-command-bar" aria-label="Admin hızlı görünüm">
        <span>
          <Layers3 size={18} />
          Operasyon görünümü
        </span>
        <span>
          <BarChart3 size={18} />
          Raporlar
        </span>
        <span>
          <Activity size={18} />
          Canlı kapasite
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="rounded-lg border border-mytgo-line bg-white p-4" key={label}>
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <AdminReportPanel
        error={reportError ? { ...reportError, message: getAdminReportErrorMessage(reportError) } : null}
        filters={reportFilters}
        report={report}
        status={reportStatus}
        onFiltersChange={(name, value) => setReportFilters((current) => ({ ...current, [name]: value }))}
        onSubmit={loadReport}
      />
      <AppointmentList appointments={appointments} />
    </Panel>
  );
}

function AppointmentList({ appointments, onApproveQuote }) {
  return (
    <CardGrid>
      {appointments.map((appointment) => (
        <InfoCard
          key={appointment.id}
          title={`#${appointment.id} ${serviceLabels[appointment.service_type]}`}
          meta={statusLabels[appointment.status]}
        >
          <DetailRows rows={getDetailRows("appointment", appointment)} />
          <StatusTimeline steps={buildAppointmentTimeline(appointment)} />
          {appointment.quote_amount_cents ? (
            <div className="quote-box">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-mytgo-teal">Usta Teklifi</p>
              <p className="mt-1 text-2xl font-black text-mytgo-ink">
                {formatCurrencyFromCents(appointment.quote_amount_cents)}
              </p>
              {appointment.quote_notes && <p className="mt-1 text-sm text-neutral-600">{appointment.quote_notes}</p>}
              {appointment.status === "quote_sent" && onApproveQuote && (
                <button
                  className="command command-primary mt-3 w-full"
                  type="button"
                  onClick={() => onApproveQuote(appointment.id)}
                >
                  <Check size={18} />
                  Teklifi Onayla
                </button>
              )}
            </div>
          ) : (
            <p className="quote-empty">Usta fiyat teklifi bekleniyor.</p>
          )}
        </InfoCard>
      ))}
    </CardGrid>
  );
}

function DetailRows({ rows }) {
  return (
    <dl className="detail-grid">
      {rows.map(([label, value]) => (
        <div className="detail-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusTimeline({ steps }) {
  return (
    <ol className="status-timeline" aria-label="Durum zaman çizelgesi">
      {steps.map((step) => (
        <li className={`status-step status-step-${step.state}`} key={step.key}>
          <span className="status-dot" />
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function BrandLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="logo-mark">
        <CarFront size={compact ? 24 : 28} />
        <Sparkles className="absolute -right-1 -top-1 text-yellow-300" size={compact ? 14 : 16} />
      </span>
      {!compact && (
        <span>
          <span className="block text-2xl font-black tracking-tight text-white">MYTGO</span>
          <span className="block text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
            Mobil oto servis
          </span>
        </span>
      )}
    </div>
  );
}

function ShellFrame({ title, subtitle, children }) {
  return (
    <main className="auth-shell min-h-dvh text-mytgo-ink">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="hidden rounded-[2.25rem] bg-mytgo-gradient p-8 text-white shadow-glow lg:block">
          <BrandLogo />
          <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
            Aracını servis, vale ve chat ile tek panelden yönet.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/76">
            Canlı konum takibi, randevu akışı ve rol bazlı operasyonlar için modern MYTGO deneyimi.
          </p>
        </div>
        <div className="rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-soft backdrop-blur sm:p-7">
          <BrandLogo compact />
          <div className="mt-6 border-b border-mytgo-line pb-5">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-mytgo-teal">{title}</p>
            {subtitle && <h1 className="mt-2 text-2xl font-black">{subtitle}</h1>}
          </div>
          <div className="pt-5">{children}</div>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel-card grid gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mytgo-gradient text-white shadow-glow">
          <Icon size={22} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-mytgo-teal">Operasyon</p>
          <h2 className="text-2xl font-black">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-neutral-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-mytgo-line bg-white p-1">
      {options.map(([key, label]) => (
        <button
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            value === key ? "bg-mytgo-ink text-white" : "text-neutral-600"
          }`}
          key={key}
          type="button"
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CardGrid({ children }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function InfoCard({ title, meta, children }) {
  return (
    <article className="rounded-3xl border border-mytgo-line/70 bg-white/90 p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700">
          {meta}
        </span>
      </div>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </article>
  );
}

async function refreshWithNotice(refresh, setNotice, message) {
  await refresh();
  setNotice(message);
  window.setTimeout(() => setNotice(""), 2600);
}

export default App;
