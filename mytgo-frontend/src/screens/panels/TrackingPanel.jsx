import React from "react";
import { MapPin } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { Panel, EmptyState } from "../../dashboard/shared.jsx";
import TrackingMap from "./TrackingMap.jsx";

export default function TrackingPanel() {
  const { token, valetRequests } = useDashboard();

  return (
    <Panel title="Canlı Takip" icon={MapPin}>
      {valetRequests.length === 0 ? (
        <EmptyState
          title="Takip bekleniyor"
          description="Konum akışı başlayınca canlı takip kartı burada gösterilir."
        />
      ) : (
        <TrackingMap token={token} transfers={valetRequests} role="valet" />
      )}
    </Panel>
  );
}
