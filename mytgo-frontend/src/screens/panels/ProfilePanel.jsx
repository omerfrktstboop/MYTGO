import React from "react";
import { Activity, UserRound } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { roleLabels } from "../../dashboard/config.js";
import { DetailRows, CardGrid, InfoCard, Panel } from "../../dashboard/shared.jsx";

export default function ProfilePanel() {
  const { user } = useDashboard();

  return (
    <Panel title="Profil" icon={UserRound}>
      <CardGrid>
        <InfoCard
          icon={UserRound}
          title={user.full_name}
          meta={roleLabels[user.role] ?? user.role}
          description="Hesap ve oturum bilgileri."
        >
          <DetailRows
            rows={[
              ["Ad Soyad", user.full_name],
              ["E-posta", user.email],
              ["Rol", roleLabels[user.role] ?? user.role],
              ["Kullanıcı ID", user.id ?? "Belirtilmedi"],
            ]}
          />
        </InfoCard>
        <InfoCard icon={Activity} title="Hızlı Durum" meta="Aktif" description="Bu oturum için görünür özet.">
          <DetailRows
            rows={[
              ["Rol erişimi", roleLabels[user.role] ?? user.role],
              ["Arayüz", "Sidebar tabanlı operasyon paneli"],
              ["Bildirimler", "Canlı ve okunmamış sayaç destekli"],
            ]}
          />
        </InfoCard>
      </CardGrid>
    </Panel>
  );
}
