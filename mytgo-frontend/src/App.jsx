import "leaflet/dist/leaflet.css";

import {
  CalendarCheck,
  CarFront,
  Check,
  LogOut,
  MapPin,
  MessageCircle,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Square,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";

import {
  apiRequest,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "./services/apiClient";
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

const serviceLabels = {
  repair: "Araç Tamir",
  cleaning: "Temizlik",
  inspection: "Muayene",
};

const statusLabels = {
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
          onChanged={() => refreshWithNotice(refresh, setNotice, "Randevu oluşturuldu")}
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
        appointments={appointments}
        valetRequests={valetRequests}
        users={users}
        vehicles={vehicles}
      />
    ),
  };

  return (
    <main className="min-h-dvh bg-mytgo-panel text-mytgo-ink">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
        <header className="flex items-center justify-between border-b border-mytgo-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mytgo-teal">
              MYTGO
            </p>
            <h1 className="mt-1 text-2xl font-semibold">{roleLabels[user.role]} Paneli</h1>
          </div>
          <button className="icon-command" type="button" onClick={onLogout} title="Çıkış">
            <LogOut size={20} />
          </button>
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

        <div className="py-5">{panels[active]}</div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-mytgo-line bg-white/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div
          className="mx-auto grid max-w-5xl gap-2"
          style={{ gridTemplateColumns: `repeat(${navByRole[user.role].length}, minmax(0, 1fr))` }}
        >
          {navByRole[user.role].map(([label, Icon]) => (
            <button
              key={label}
              className={`bottom-command ${active === label ? "bottom-command-active" : ""}`}
              type="button"
              onClick={() => setActive(label)}
              title={label}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
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
      <AppointmentList appointments={appointments} />
    </Panel>
  );
}

function MechanicAppointments({ token, appointments, onChanged }) {
  async function patch(id, status) {
    await apiRequest(`/api/v1/appointments/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    });
    onChanged();
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
            <p>{transfer.pickup_address}</p>
            <p className="mt-1 text-sm text-neutral-500">{transfer.dropoff_address}</p>
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

function AdminPanel({ appointments, valetRequests, users, vehicles }) {
  const stats = [
    ["Kullanıcı", users.length],
    ["Araç", vehicles.length],
    ["Randevu", appointments.length],
    ["Vale", valetRequests.length],
  ];

  return (
    <Panel title="Admin" icon={ShieldCheck}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="rounded-lg border border-mytgo-line bg-white p-4" key={label}>
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <AppointmentList appointments={appointments} />
    </Panel>
  );
}

function AppointmentList({ appointments }) {
  return (
    <CardGrid>
      {appointments.map((appointment) => (
        <InfoCard
          key={appointment.id}
          title={`#${appointment.id} ${serviceLabels[appointment.service_type]}`}
          meta={statusLabels[appointment.status]}
        >
          {appointment.service_address ?? "Adres yok"}
        </InfoCard>
      ))}
    </CardGrid>
  );
}

function ShellFrame({ title, subtitle, children }) {
  return (
    <main className="min-h-dvh bg-mytgo-panel text-mytgo-ink">
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
        <div className="border-b border-mytgo-line pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mytgo-teal">
            {title}
          </p>
          {subtitle && <h1 className="mt-2 text-2xl font-semibold">{subtitle}</h1>}
        </div>
        <div className="pt-5">{children}</div>
      </section>
    </main>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-mytgo-teal text-white">
          <Icon size={22} />
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
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
    <article className="rounded-lg border border-mytgo-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {meta}
        </span>
      </div>
      <div className="mt-2 text-sm text-neutral-600">{children}</div>
    </article>
  );
}

async function refreshWithNotice(refresh, setNotice, message) {
  await refresh();
  setNotice(message);
  window.setTimeout(() => setNotice(""), 2600);
}

export default App;
