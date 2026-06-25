import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAppointmentTimeline,
  buildValetTimeline,
  getDetailRows,
} from '../src/appDetails.js';

test('buildAppointmentTimeline marks completed and current appointment stages', () => {
  const timeline = buildAppointmentTimeline({ status: 'in_progress' });

  assert.deepEqual(
    timeline.map((step) => [step.key, step.label, step.state]),
    [
      ['pending', 'Bekliyor', 'done'],
      ['approved', 'Onaylandı', 'done'],
      ['in_progress', 'İşlemde', 'current'],
      ['completed', 'Tamamlandı', 'upcoming'],
    ],
  );
});

test('buildValetTimeline keeps delivered transfers fully complete', () => {
  const timeline = buildValetTimeline({ status: 'delivered' });

  assert.equal(timeline.at(-1).label, 'Teslim');
  assert.ok(timeline.every((step) => step.state === 'done' || step.state === 'current'));
  assert.equal(timeline.at(-1).state, 'current');
});

test('getDetailRows formats appointment and vale records for detail cards', () => {
  assert.deepEqual(
    getDetailRows('appointment', {
      id: 42,
      service_type: 'repair',
      status: 'approved',
      service_address: 'MYTGO Sanayi',
      scheduled_at: null,
      notes: 'Fren kontrol',
      vehicle_id: 7,
      mechanic_id: 3,
    }),
    [
      ['Talep No', '#42'],
      ['Servis', 'Araç Tamir'],
      ['Durum', 'Onaylandı'],
      ['Adres', 'MYTGO Sanayi'],
      ['Planlanan Zaman', 'Henüz planlanmadı'],
      ['Araç', '#7'],
      ['Usta', '#3'],
      ['Not', 'Fren kontrol'],
    ],
  );

  assert.deepEqual(
    getDetailRows('valet', {
      id: 8,
      appointment_id: 42,
      status: 'picking_up',
      pickup_address: 'Ev',
      dropoff_address: 'Servis',
      valet_id: null,
      last_location_at: null,
    }),
    [
      ['Talep No', '#8'],
      ['Bağlı Randevu', '#42'],
      ['Durum', 'Alıma Gidiyor'],
      ['Alış', 'Ev'],
      ['Teslim', 'Servis'],
      ['Vale', 'Atama bekliyor'],
      ['Son Konum', 'Konum yok'],
    ],
  );
});
