import {
  Activity,
  BatteryCharging,
  BellRing,
  CarFront,
  CalendarCheck,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";

export const demoUsers = [
  ["Müşteri", "customer@mytgo.local", "customer"],
  ["Usta", "mechanic@mytgo.local", "mechanic"],
  ["Vale", "valet@mytgo.local", "valet"],
  ["Admin", "admin@mytgo.local", "admin"],
];

export const roleLabels = {
  customer: "Müşteri",
  mechanic: "Usta",
  valet: "Vale",
  admin: "Admin",
};

export const panelDescriptions = {
  vehicles: "Araç kaydı, geçmiş ve servis hazırlıkları tek kartta.",
  appointments: "Durum takibi, teklif akışı ve servis onayı burada.",
  map: "Araçların ve transferlerin konumunu tek bakışta görün.",
  charging: "Yakındaki şarj noktaları ve hızlı erişim bilgileri burada.",
  roadside: "Acil destek, çekici ve lastik desteğine hızlı erişim.",
  valet: "Transfer isteği, rota ve teslim akışı tek bakışta.",
  tracking: "Canlı konum ve hareket çizgisiyle takip edin.",
  chat: "Müşteri ve ekip mesajları canlı konuşma akışında.",
  notifications: "Servis, vale ve chat olayları burada görünür.",
  profile: "Hesap bilgileri, rol ve oturum özeti burada yer alır.",
  settings: "Tema ve arayüz tercihlerini hızlıca değiştirin.",
  admin: "Yönetim özeti, kapasite ve raporları hızlıca görün.",
};

export const navByRole = {
  customer: [
    { slug: "vehicles", label: "Araçlarım", icon: CarFront },
    { slug: "appointments", label: "Sanayi Randevu", icon: CalendarCheck },
    { slug: "map", label: "Harita", icon: MapPin },
    { slug: "charging", label: "Şarj İstasyonları", icon: BatteryCharging },
    { slug: "roadside", label: "Yol Yardım", icon: LifeBuoy },
  ],
  mechanic: [
    { slug: "appointments", label: "Randevu", icon: Wrench },
    { slug: "chat", label: "Chat", icon: MessageCircle },
    { slug: "notifications", label: "Bildirimler", icon: BellRing },
    { slug: "profile", label: "Profil", icon: UserRound },
    { slug: "settings", label: "Ayarlar", icon: Settings },
  ],
  valet: [
    { slug: "valet", label: "Transfer", icon: CarFront },
    { slug: "tracking", label: "Takip", icon: MapPin },
    { slug: "notifications", label: "Bildirimler", icon: BellRing },
    { slug: "profile", label: "Profil", icon: UserRound },
    { slug: "settings", label: "Ayarlar", icon: Settings },
  ],
  admin: [
    { slug: "admin", label: "Panel", icon: ShieldCheck },
    { slug: "valet", label: "Vale", icon: MapPin },
    { slug: "chat", label: "Chat", icon: MessageCircle },
    { slug: "notifications", label: "Bildirimler", icon: BellRing },
    { slug: "profile", label: "Profil", icon: UserRound },
    { slug: "settings", label: "Ayarlar", icon: Settings },
  ],
};

export const defaultSectionByRole = Object.fromEntries(
  Object.entries(navByRole).map(([role, items]) => [role, items[0].slug]),
);

export const sectionMetaBySlug = {
  vehicles: panelDescriptions.vehicles,
  appointments: panelDescriptions.appointments,
  map: panelDescriptions.map,
  charging: panelDescriptions.charging,
  roadside: panelDescriptions.roadside,
  valet: panelDescriptions.valet,
  tracking: panelDescriptions.tracking,
  chat: panelDescriptions.chat,
  notifications: panelDescriptions.notifications,
  profile: panelDescriptions.profile,
  settings: panelDescriptions.settings,
  admin: panelDescriptions.admin,
};

export const panelAccentSummary = {
  vehicles: "Araç yönetimi",
  appointments: "Servis akışı",
  map: "Canlı konum",
  charging: "Enerji noktaları",
  roadside: "Acil yardım",
  valet: "Vale operasyonu",
  tracking: "Hareket takibi",
  chat: "Canlı mesajlaşma",
  notifications: "Olay akışı",
  profile: "Hesap özeti",
  settings: "Tema ve görünüm",
  admin: "Yönetim paneli",
};

