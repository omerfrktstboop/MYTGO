import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  AdminReportPanel,
  buildAdminReportRequestPath,
  fetchAdminReportOverview,
  getAdminReportErrorMessage,
  hasReportData,
} from '../src/adminReport.js';

const report = {
  range: {
    from: '2026-06-01T00:00:00+03:00',
    to: '2026-07-01T00:00:00+03:00',
    timezone: 'Europe/Istanbul',
  },
  summary: {
    total_appointments: 42,
    total_valet_requests: 18,
  },
  status_distribution: {
    appointments: [
      { status: 'pending', label: 'Bekliyor', group: 'open', count: 6, percentage: 14.3 },
      { status: 'completed', label: 'Tamamlandı', group: 'completed', count: 14, percentage: 33.3 },
    ],
    valet_requests: [
      { status: 'requested', label: 'Talep', group: 'open', count: 2, percentage: 11.1 },
      { status: 'delivered', label: 'Teslim', group: 'completed', count: 6, percentage: 33.3 },
    ],
  },
  completed_jobs: {
    appointments: 14,
    valet_deliveries: 6,
    total: 20,
  },
  revenue: {
    currency: 'TRY',
    approved_quote_amount_cents: 1850000,
    completed_amount_cents: 1240000,
    pending_quote_amount_cents: 420000,
    average_completed_amount_cents: 88571,
    formatted: {
      approved_quote_amount: '₺18.500',
      completed_amount: '₺12.400',
      pending_quote_amount: '₺4.200',
      average_completed_amount: '₺886',
    },
  },
  operations: {
    active_appointments: 26,
    active_valet_transfers: 11,
    unassigned_appointments: 3,
    unassigned_valet_transfers: 2,
    appointment_cancellation_rate: 4.8,
    valet_cancellation_rate: 5.6,
    active_users_by_role: [
      { role: 'customer', label: 'Müşteri', count: 128 },
      { role: 'mechanic', label: 'Usta', count: 9 },
      { role: 'valet', label: 'Vale', count: 5 },
      { role: 'admin', label: 'Admin', count: 2 },
    ],
  },
};

function render(props) {
  return renderToStaticMarkup(React.createElement(AdminReportPanel, props));
}

test('buildAdminReportRequestPath includes contract query parameters', () => {
  assert.equal(
    buildAdminReportRequestPath({ from: '2026-06-01', to: '2026-07-01' }),
    '/api/v1/admin/reports/overview?timezone=Europe%2FIstanbul&include_zero_statuses=true&from=2026-06-01&to=2026-07-01',
  );
});

test('fetchAdminReportOverview calls the admin reports endpoint with auth token', async () => {
  const calls = [];
  const fakeApiRequest = async (path, options) => {
    calls.push([path, options]);
    return report;
  };

  const result = await fetchAdminReportOverview({
    apiRequest: fakeApiRequest,
    token: 'token-123',
    from: '2026-06-01',
    to: '2026-07-01',
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], buildAdminReportRequestPath({ from: '2026-06-01', to: '2026-07-01' }));
  assert.equal(calls[0][1].token, 'token-123');
  assert.equal(result.summary.total_appointments, 42);
});

test('AdminReportPanel renders summary, revenue, status and operation cards', () => {
  const html = render({ status: 'success', report });

  assert.match(html, /Admin Raporları/);
  assert.match(html, /Toplam Randevu/);
  assert.match(html, /42/);
  assert.match(html, /Toplam Vale Talebi/);
  assert.match(html, /Tamamlanan İşler/);
  assert.match(html, /14 randevu \/ 6 teslim/);
  assert.match(html, /Onaylı Teklif Hacmi/);
  assert.match(html, /₺18\.500/);
  assert.match(html, /Randevu Durum Dağılımı/);
  assert.match(html, /Bekliyor/);
  assert.match(html, /33\.3%/);
  assert.match(html, /Aktif Vale İşleri/);
  assert.match(html, /Vale İptal Oranı/);
  assert.match(html, /Aktif Kullanıcı Kapasitesi/);
  assert.match(html, /Müşteri/);
});

test('AdminReportPanel includes accessible loading, error and meter states', () => {
  assert.match(render({ status: 'loading' }), /role="status"/);
  assert.match(render({ status: 'error', error: { status: 403 } }), /role="alert"/);
  assert.match(render({ status: 'success', report }), /role="meter"/);
  assert.match(render({ status: 'success', report }), /aria-label="Rapor tarih aralığı filtresi"/);
});

test('AdminReportPanel renders an empty state when every report metric is zero', () => {
  const emptyReport = {
    summary: { total_appointments: 0, total_valet_requests: 0 },
    status_distribution: { appointments: [], valet_requests: [] },
    completed_jobs: { appointments: 0, valet_deliveries: 0, total: 0 },
    revenue: {
      approved_quote_amount_cents: 0,
      completed_amount_cents: 0,
      pending_quote_amount_cents: 0,
      average_completed_amount_cents: 0,
    },
    operations: {
      active_appointments: 0,
      active_valet_transfers: 0,
      unassigned_appointments: 0,
      unassigned_valet_transfers: 0,
      appointment_cancellation_rate: 0,
      valet_cancellation_rate: 0,
      active_users_by_role: [],
    },
  };

  assert.equal(hasReportData(emptyReport), false);
  assert.match(render({ status: 'success', report: emptyReport }), /Seçilen dönemde raporlanacak veri yok/);
});

test('getAdminReportErrorMessage returns friendly contract errors', () => {
  assert.equal(getAdminReportErrorMessage({ status: 401 }), 'Rapor panelini görmek için yeniden giriş yapın.');
  assert.equal(
    getAdminReportErrorMessage({ status: 422 }),
    'Rapor tarih aralığı geçersiz. Başlangıç tarihi bitişten önce olmalı.',
  );
});
