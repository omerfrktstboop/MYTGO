import React from 'react';

import { formatCurrencyFromCents, statusLabels } from './appDetails.js';

export const adminReportDefaults = {
  timezone: 'Europe/Istanbul',
  includeZeroStatuses: true,
};

const roleLabels = {
  customer: 'Müşteri',
  mechanic: 'Usta',
  valet: 'Vale',
  admin: 'Admin',
};

const summaryCards = [
  ['total_appointments', 'Toplam Randevu', 'summary.total_appointments'],
  ['total_valet_requests', 'Toplam Vale Talebi', 'summary.total_valet_requests'],
];

const revenueCards = [
  ['approved_quote_amount', 'Onaylı Teklif Hacmi', 'approved_quote_amount_cents'],
  ['completed_amount', 'Tamamlanan İş Cirosu', 'completed_amount_cents'],
  ['pending_quote_amount', 'Bekleyen Teklif Hacmi', 'pending_quote_amount_cents'],
  ['average_completed_amount', 'Ortalama Tamamlanan İş', 'average_completed_amount_cents'],
];

const operationCards = [
  ['active_appointments', 'Aktif Randevular'],
  ['active_valet_transfers', 'Aktif Vale İşleri'],
  ['unassigned_appointments', 'Atama Bekleyen Randevu'],
  ['unassigned_valet_transfers', 'Atama Bekleyen Vale'],
  ['appointment_cancellation_rate', 'Randevu İptal Oranı', '%'],
  ['valet_cancellation_rate', 'Vale İptal Oranı', '%'],
];

function valueAt(record, path) {
  return path.split('.').reduce((current, key) => current?.[key], record);
}

function formatRate(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatReportMoney(report, formattedKey, centsKey) {
  return report?.revenue?.formatted?.[formattedKey] ?? formatCurrencyFromCents(report?.revenue?.[centsKey] ?? 0);
}

export function buildAdminReportRequestPath({ from = '', to = '', timezone = adminReportDefaults.timezone } = {}) {
  const params = new URLSearchParams({
    timezone,
    include_zero_statuses: String(adminReportDefaults.includeZeroStatuses),
  });
  if (from) {
    params.set('from', from);
  }
  if (to) {
    params.set('to', to);
  }
  return `/api/v1/admin/reports/overview?${params.toString()}`;
}

export async function fetchAdminReportOverview({ apiRequest, token, from = '', to = '', timezone } = {}) {
  if (typeof apiRequest !== 'function') {
    throw new TypeError('apiRequest is required');
  }
  return apiRequest(buildAdminReportRequestPath({ from, to, timezone }), { token });
}

export function getAdminReportErrorMessage(error) {
  if (error?.status === 401) {
    return 'Rapor panelini görmek için yeniden giriş yapın.';
  }
  if (error?.status === 403) {
    return 'Bu rapor paneline sadece admin kullanıcılar erişebilir.';
  }
  if (error?.status === 422) {
    return 'Rapor tarih aralığı geçersiz. Başlangıç tarihi bitişten önce olmalı.';
  }
  return error?.message || 'Rapor verileri şu anda yüklenemedi.';
}

export function hasReportData(report) {
  if (!report) {
    return false;
  }
  return Boolean(
    report.summary?.total_appointments ||
      report.summary?.total_valet_requests ||
      report.completed_jobs?.total ||
      report.revenue?.approved_quote_amount_cents ||
      report.revenue?.completed_amount_cents ||
      report.revenue?.pending_quote_amount_cents ||
      report.operations?.active_appointments ||
      report.operations?.active_valet_transfers,
  );
}

export function AdminReportPanel({
  status = 'idle',
  report = null,
  error = null,
  filters = {},
  onFiltersChange,
  onSubmit,
}) {
  const currentFilters = {
    from: filters.from ?? '',
    to: filters.to ?? '',
    timezone: filters.timezone ?? adminReportDefaults.timezone,
  };

  return React.createElement(
    'section',
    {
      className: 'admin-report grid gap-4',
      'aria-labelledby': 'admin-report-title',
    },
    React.createElement(
      'div',
      { className: 'admin-report-header' },
      React.createElement(
        'div',
        null,
        React.createElement('p', { className: 'eyebrow' }, 'Admin Raporları'),
        React.createElement('h3', { id: 'admin-report-title' }, 'Operasyon ve ciro özeti'),
        React.createElement(
          'p',
          { className: 'admin-report-copy' },
          'Tek endpoint ile randevu, vale, statü dağılımı ve quote bazlı TRY ciro metrikleri.',
        ),
      ),
      React.createElement(
        'form',
        {
          className: 'admin-report-filters',
          onSubmit: (event) => {
            event.preventDefault();
            onSubmit?.();
          },
          'aria-label': 'Rapor tarih aralığı filtresi',
        },
        React.createElement(FilterField, {
          label: 'Başlangıç',
          name: 'from',
          type: 'date',
          value: currentFilters.from,
          onChange: onFiltersChange,
        }),
        React.createElement(FilterField, {
          label: 'Bitiş',
          name: 'to',
          type: 'date',
          value: currentFilters.to,
          onChange: onFiltersChange,
        }),
        React.createElement(FilterField, {
          label: 'Zaman Dilimi',
          name: 'timezone',
          value: currentFilters.timezone,
          onChange: onFiltersChange,
        }),
        React.createElement('button', { className: 'command command-primary', type: 'submit' }, 'Raporu Yenile'),
      ),
    ),
    status === 'loading' && React.createElement(ReportLoadingState),
    status === 'error' && React.createElement(ReportErrorState, { error }),
    status === 'success' && !hasReportData(report) && React.createElement(ReportEmptyState),
    status === 'success' && report && React.createElement(ReportContent, { report }),
  );
}

function FilterField({ label, name, type = 'text', value, onChange }) {
  return React.createElement(
    'label',
    { className: 'admin-report-filter' },
    React.createElement('span', null, label),
    React.createElement('input', {
      name,
      type,
      value,
      onChange: (event) => onChange?.(name, event.target.value),
    }),
  );
}

function ReportLoadingState() {
  return React.createElement(
    'div',
    { className: 'report-state-card', role: 'status', 'aria-live': 'polite' },
    'Admin rapor metrikleri yükleniyor...',
  );
}

function ReportErrorState({ error }) {
  return React.createElement(
    'div',
    { className: 'report-state-card report-state-error', role: 'alert' },
    getAdminReportErrorMessage(error),
  );
}

function ReportEmptyState() {
  return React.createElement(
    'div',
    { className: 'report-state-card' },
    React.createElement('strong', null, 'Seçilen dönemde raporlanacak veri yok.'),
    React.createElement('p', null, 'Yeni randevu, vale talebi veya teklif oluştuğunda kartlar otomatik dolacak.'),
  );
}

function ReportContent({ report }) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'admin-report-grid admin-report-grid-summary', 'aria-label': 'Özet kartları' },
      summaryCards.map(([key, label, path]) =>
        React.createElement(MetricCard, {
          key,
          label,
          value: valueAt(report, path) ?? 0,
          tone: key,
        }),
      ),
      React.createElement(MetricCard, {
        key: 'completed_jobs',
        label: 'Tamamlanan İşler',
        value: report.completed_jobs?.total ?? 0,
        meta: `${report.completed_jobs?.appointments ?? 0} randevu / ${report.completed_jobs?.valet_deliveries ?? 0} teslim`,
      }),
    ),
    React.createElement(
      'div',
      { className: 'admin-report-grid', 'aria-label': 'Ciro kartları' },
      revenueCards.map(([formattedKey, label, centsKey]) =>
        React.createElement(MetricCard, {
          key: formattedKey,
          label,
          value: formatReportMoney(report, formattedKey, centsKey),
          meta: 'Quote bazlı TRY',
        }),
      ),
    ),
    React.createElement(
      'div',
      { className: 'admin-report-split' },
      React.createElement(StatusDistribution, {
        title: 'Randevu Durum Dağılımı',
        items: report.status_distribution?.appointments ?? [],
      }),
      React.createElement(StatusDistribution, {
        title: 'Vale Durum Dağılımı',
        items: report.status_distribution?.valet_requests ?? [],
      }),
    ),
    React.createElement(
      'div',
      { className: 'admin-report-grid', 'aria-label': 'Operasyon kartları' },
      operationCards.map(([key, label, suffix]) =>
        React.createElement(MetricCard, {
          key,
          label,
          value: suffix === '%' ? formatRate(report.operations?.[key]) : report.operations?.[key] ?? 0,
        }),
      ),
    ),
    React.createElement(ActiveUsersByRole, { users: report.operations?.active_users_by_role ?? [] }),
  );
}

function MetricCard({ label, value, meta }) {
  return React.createElement(
    'article',
    { className: 'report-metric-card' },
    React.createElement('p', { className: 'report-metric-label' }, label),
    React.createElement('p', { className: 'report-metric-value' }, value),
    meta && React.createElement('p', { className: 'report-metric-meta' }, meta),
  );
}

function StatusDistribution({ title, items }) {
  const safeItems = items.length ? items : [{ status: 'empty', label: 'Veri yok', count: 0, percentage: 0 }];
  return React.createElement(
    'section',
    { className: 'report-distribution-card', 'aria-labelledby': `${title.replaceAll(' ', '-').toLowerCase()}-title` },
    React.createElement('h4', { id: `${title.replaceAll(' ', '-').toLowerCase()}-title` }, title),
    React.createElement(
      'div',
      { className: 'report-distribution-list' },
      safeItems.map((item) => {
        const label = item.label ?? statusLabels[item.status] ?? item.status;
        const percentage = Number(item.percentage ?? 0);
        return React.createElement(
          'div',
          { className: 'report-distribution-row', key: item.status },
          React.createElement(
            'div',
            { className: 'report-distribution-row-head' },
            React.createElement('span', null, label),
            React.createElement('strong', null, `${item.count ?? 0} · ${percentage.toFixed(1)}%`),
          ),
          React.createElement(
            'div',
            {
              className: 'report-distribution-bar',
              role: 'meter',
              'aria-label': `${label} oranı`,
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': percentage,
            },
            React.createElement('span', { style: { width: `${Math.max(0, Math.min(100, percentage))}%` } }),
          ),
        );
      }),
    ),
  );
}

function ActiveUsersByRole({ users }) {
  const roles = users.length
    ? users
    : Object.keys(roleLabels).map((role) => ({ role, label: roleLabels[role], count: 0 }));
  return React.createElement(
    'section',
    { className: 'report-distribution-card', 'aria-labelledby': 'active-users-by-role-title' },
    React.createElement('h4', { id: 'active-users-by-role-title' }, 'Aktif Kullanıcı Kapasitesi'),
    React.createElement(
      'div',
      { className: 'active-role-grid' },
      roles.map((item) =>
        React.createElement(
          'article',
          { className: 'active-role-pill', key: item.role },
          React.createElement('span', null, item.label ?? roleLabels[item.role] ?? item.role),
          React.createElement('strong', null, item.count ?? 0),
        ),
      ),
    ),
  );
}
