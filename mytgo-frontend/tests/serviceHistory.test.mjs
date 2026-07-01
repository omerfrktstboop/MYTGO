import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ServiceHistoryPanel,
  fetchServiceHistory,
  getRecentServiceHistoryEntries,
  getServiceHistoryErrorMessage,
} from '../src/serviceHistory.js';

const vehicle = {
  id: 7,
  plate_number: '34E-Cars34',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2020,
};

const entries = [
  {
    id: 11,
    vehicle_id: 7,
    service_date: '2026-06-20T09:00:00Z',
    operation_type: 'maintenance',
    odometer_km: 45200,
    service_provider: 'E-Cars Sanayi',
    description: 'Yağ, filtre ve genel kontrol yapıldı.',
    cost_amount_cents: 325000,
    cost_currency: 'TRY',
    created_by_id: 1,
    updated_by_id: 2,
    created_at: '2026-06-20T09:20:00Z',
    updated_at: '2026-06-20T10:10:00Z',
  },
  {
    id: 12,
    vehicle_id: 7,
    service_date: '2026-06-20T09:00:00Z',
    operation_type: 'repair',
    odometer_km: null,
    service_provider: null,
    description: '',
    cost_amount_cents: null,
    cost_currency: 'TRY',
    created_by_id: 3,
    updated_by_id: null,
    created_at: '2026-06-20T09:10:00Z',
    updated_at: '2026-06-20T09:10:00Z',
  },
];

function render(props) {
  return renderToStaticMarkup(React.createElement(ServiceHistoryPanel, { vehicle, ...props }));
}

test('ServiceHistoryPanel renders an accessible loading state', () => {
  const html = render({ status: 'loading' });

  assert.match(html, /role="status"/);
  assert.match(html, /Servis geçmişi yükleniyor/);
});

test('ServiceHistoryPanel renders vehicle service history records with core fields', () => {
  const html = render({ status: 'success', items: entries });

  assert.match(html, /34E-Cars34/);
  assert.match(html, /Toyota Corolla 2020/);
  assert.match(html, /Bakım/);
  assert.match(html, /Tamir/);
  assert.match(html, /45\.200 km/);
  assert.match(html, /E-Cars Sanayi/);
  assert.match(html, /Yağ, filtre ve genel kontrol yapıldı\./);
  assert.match(html, /₺3\.250/);
  assert.match(html, /#1/);
  assert.match(html, /#2/);
});

test('ServiceHistoryPanel renders a recent operations area with the latest five entries', () => {
  const manyEntries = Array.from({ length: 6 }, (_, index) => ({
    ...entries[0],
    id: index + 1,
    service_date: `2026-06-${String(index + 1).padStart(2, '0')}T09:00:00Z`,
    operation_type: index === 5 ? 'tire' : 'maintenance',
  }));

  const recent = getRecentServiceHistoryEntries(manyEntries);
  const html = render({ status: 'success', items: manyEntries });

  assert.equal(recent.length, 5);
  assert.deepEqual(recent.map((entry) => entry.id), [6, 5, 4, 3, 2]);
  assert.match(html, /Son işlemler/);
  assert.match(html, /Servis tarihine göre en güncel 5 kayıt/);
  assert.doesNotMatch(html, /recent-entry-1/);
});

test('ServiceHistoryPanel renders empty state copy and call to action', () => {
  const html = render({ status: 'success', items: [] });

  assert.match(html, /Bu araç için servis geçmişi yok/);
  assert.match(html, /İlk bakım veya servis kaydını ekleyerek geçmişi oluşturmaya başlayın\./);
  assert.match(html, /Servis Kaydı Ekle/);
});

test('ServiceHistoryPanel renders friendly error states', () => {
  assert.equal(
    getServiceHistoryErrorMessage({ status: 403 }),
    'Bu aracın servis geçmişine erişim yetkiniz yok.',
  );
  assert.match(render({ status: 'error', error: { status: 404 } }), /Araç veya servis kaydı bulunamadı\./);
});

test('fetchServiceHistory calls the API with the selected vehicle id', async () => {
  const calls = [];
  const fakeApiRequest = async (path, options) => {
    calls.push([path, options]);
    return { vehicle, items: entries, total: entries.length, limit: 20, offset: 0 };
  };

  const result = await fetchServiceHistory({ apiRequest: fakeApiRequest, token: 'token-123', vehicleId: 7 });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/api/v1/vehicles/7/service-history?limit=20&offset=0');
  assert.equal(calls[0][1].token, 'token-123');
  assert.equal(result.items.length, 2);
});
