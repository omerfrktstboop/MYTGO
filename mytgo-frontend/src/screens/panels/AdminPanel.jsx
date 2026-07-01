import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { useDashboard } from "../../state/dashboard.jsx";
import { apiRequest } from "../../services/apiClient";
import {
  AdminDashboard,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/system.js";
import { fetchAdminReportOverview, getAdminReportErrorMessage, AdminReportPanel } from "../../adminReport.js";
import { Panel } from "../../dashboard/shared.jsx";

function getDefaultAdminReportFilters() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    timezone: "Europe/Istanbul",
  };
}

export default function AdminPanel() {
  const { token, appointments, valetRequests, users, vehicles, loading } = useDashboard();
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
    void loadReport();
  }, [token]);

  return (
    <Panel title="Admin" icon={ShieldCheck}>
      <AdminDashboard
        appointments={appointments}
        loading={loading || reportStatus === "loading"}
        report={report}
        users={users}
        valetRequests={valetRequests}
        vehicles={vehicles}
        onRefresh={loadReport}
      />
      <AdminReportPanel
        error={reportError ? { ...reportError, message: getAdminReportErrorMessage(reportError) } : null}
        filters={reportFilters}
        report={report}
        status={reportStatus}
        onFiltersChange={(name, value) => setReportFilters((current) => ({ ...current, [name]: value }))}
        onSubmit={loadReport}
      />
    </Panel>
  );
}
