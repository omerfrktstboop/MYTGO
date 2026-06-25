# MYTGO Admin Rapor Paneli - Metrik ve Veri Sözleşmesi

## Amaç

Admin rapor panelinin frontend ve backend ekipleri tarafından aynı anlamla uygulanabilmesi için metrik hesaplarını ve `GET /api/v1/admin/reports/overview` response sözleşmesini tanımlar.

Mevcut kaynaklar:

- `appointments` (`app.models.appointment.Appointment`)
- `valet_transfers` (`app.models.valet.ValetTransfer`)
- `users` (`app.models.user.User`)
- Status enumları: `AppointmentStatus`, `ValetStatus`, `UserRole`
- Para alanı: `appointments.quote_amount_cents` kuruş cinsinden TRY

Not: Bu endpoint mevcut router'larda henüz yoktur; doküman backend ve frontend implementasyonu için hedef sözleşmedir. FastAPI tarafında `from` query parametresi Python keyword olduğu için implementasyonda ör. `from_: datetime | None = Query(default=None, alias="from")` kullanılmalıdır.

## Endpoint sözleşmesi

### GET `/api/v1/admin/reports/overview`

Yetki: sadece `admin` rolü.

Query parametreleri:

| Parametre | Tip | Zorunlu | Varsayılan | Açıklama |
| --- | --- | --- | --- | --- |
| `from` | ISO-8601 datetime/date | Hayır | içinde bulunulan ayın başlangıcı | Tarih aralığı başlangıcı, dahil. Date gelirse `00:00:00` kabul edilir. |
| `to` | ISO-8601 datetime/date | Hayır | şimdi | Tarih aralığı bitişi, hariç. Date gelirse bir sonraki gün `00:00:00` kabul edilir. |
| `timezone` | IANA timezone | Hayır | `Europe/Istanbul` | Date-only parametreleri ve trend bucket etiketleri için kullanılır. DB filtreleri UTC/DB zamanı ile normalize edilir. |
| `include_zero_statuses` | boolean | Hayır | `true` | `true` ise tüm bilinen statüler `0` ile response içinde döner. |

Tarih filtresi davranışı:

- Ana sayım metriklerinde kayıt yaratılma zamanı kullanılır: `created_at >= from` ve `created_at < to`.
- Operasyonel aktif kartlarda zaman filtresi yine `created_at` ile uygulanır; panel seçilen dönemde açılmış aktif işleri gösterir.
- Tamamlanma zamanı ayrı kolon olarak tutulmadığı için `completed_jobs` metrikleri şu an `status` + `created_at` üzerinden hesaplanır. İleride `completed_at` eklenirse bu metrik `completed_at` filtresine taşınmalıdır.
- `from >= to` geçersizdir ve `422` döner.

## Status eşlemesi

### Randevu (`AppointmentStatus`)

| Ham statü | TR label | Grup | Açıklama |
| --- | --- | --- | --- |
| `pending` | Bekliyor | `open` | Yeni randevu, teklif bekliyor. |
| `quote_sent` | Teklif Gönderildi | `open` | Usta fiyat verdi, müşteri onayı bekliyor. |
| `approved` | Onaylandı | `active` | Müşteri teklifi onayladı, iş başlatılabilir. |
| `in_progress` | İşlemde | `active` | İş devam ediyor. |
| `completed` | Tamamlandı | `completed` | Tamamlanan iş. |
| `cancelled` | İptal | `cancelled` | İptal edilen randevu. |

### Vale (`ValetStatus`)

| Ham statü | TR label | Grup | Açıklama |
| --- | --- | --- | --- |
| `requested` | Talep | `open` | Vale talebi alındı, atama bekliyor. |
| `assigned` | Atandı | `active` | Vale atanmış. |
| `picking_up` | Alıma Gidiyor | `active` | Vale aracı almaya gidiyor. |
| `in_transit_to_service` | Servise Gidiyor | `active` | Araç servise taşınıyor. |
| `at_service` | Serviste | `active` | Araç serviste. |
| `returning` | Dönüşte | `active` | Araç müşteriye geri götürülüyor. |
| `delivered` | Teslim | `completed` | Vale işi tamamlandı. |
| `cancelled` | İptal | `cancelled` | İptal edilen vale talebi. |

## Metrik tanımları

### 1. Toplam randevu sayısı

- Response alanı: `summary.total_appointments`
- Kaynak: `appointments`
- Hesap: `COUNT(appointments.id)`
- Filtre: seçilen tarih aralığında `appointments.created_at`
- Statü dahil: tüm statüler (`pending`, `quote_sent`, `approved`, `in_progress`, `completed`, `cancelled`)
- Boş veri: `0`

### 2. Toplam vale talebi

- Response alanı: `summary.total_valet_requests`
- Kaynak: `valet_transfers`
- Hesap: `COUNT(valet_transfers.id)`
- Filtre: seçilen tarih aralığında `valet_transfers.created_at`
- Statü dahil: tüm statüler (`requested`, `assigned`, `picking_up`, `in_transit_to_service`, `at_service`, `returning`, `delivered`, `cancelled`)
- Boş veri: `0`

### 3. Durum dağılımı

- Response alanları:
  - `status_distribution.appointments[]`
  - `status_distribution.valet_requests[]`
- Kaynak:
  - `appointments.status`
  - `valet_transfers.status`
- Hesap: statü bazında `COUNT(id)` ve toplam içindeki yüzde
- Filtre: seçilen tarih aralığında ilgili tablonun `created_at` alanı
- Yüzde hesaplama: `count / total * 100`, 1 ondalık basamak; total `0` ise `0.0`
- Boş veri: `include_zero_statuses=true` ise tüm enumlar `count: 0, percentage: 0.0`; değilse boş liste

### 4. Tamamlanan işler

- Response alanları:
  - `completed_jobs.appointments`
  - `completed_jobs.valet_deliveries`
  - `completed_jobs.total`
- Kaynak:
  - `appointments.status == completed`
  - `valet_transfers.status == delivered`
- Hesap:
  - `appointments`: tamamlanan randevu sayısı
  - `valet_deliveries`: teslim edilen vale transferi sayısı
  - `total`: iki sayının toplamı
- Filtre: seçilen tarih aralığında ilgili tablonun `created_at` alanı
- Boş veri: tüm alanlar `0`

### 5. Temel ciro kartları

Mevcut sistemde tahsilat veya fatura tablosu yoktur; ciro kartları randevu teklif tutarı (`quote_amount_cents`) üzerinden raporlanır. Tüm para alanları kuruş cinsinden saklanır, response içinde hem `*_cents` hem formatlanmış TRY string döner.

#### 5.1 Onaylı teklif hacmi

- Response alanı: `revenue.approved_quote_amount_cents`
- Kaynak: `appointments.quote_amount_cents`
- Hesap: `SUM(quote_amount_cents)`
- Filtre:
  - tarih aralığı: `appointments.created_at`
  - `quote_amount_cents IS NOT NULL`
  - `status IN ('approved', 'in_progress', 'completed')`
- Anlam: müşteri tarafından onaylanmış veya tamamlanmış işlerin teklif toplamı
- Boş veri: `0`, format: `₺0`

#### 5.2 Tamamlanan iş cirosu

- Response alanı: `revenue.completed_amount_cents`
- Kaynak: `appointments.quote_amount_cents`
- Hesap: `SUM(quote_amount_cents)`
- Filtre:
  - tarih aralığı: `appointments.created_at`
  - `quote_amount_cents IS NOT NULL`
  - `status == 'completed'`
- Anlam: tamamlanan randevuların teklif toplamı
- Boş veri: `0`, format: `₺0`

#### 5.3 Bekleyen teklif hacmi

- Response alanı: `revenue.pending_quote_amount_cents`
- Kaynak: `appointments.quote_amount_cents`
- Hesap: `SUM(quote_amount_cents)`
- Filtre:
  - tarih aralığı: `appointments.created_at`
  - `quote_amount_cents IS NOT NULL`
  - `status == 'quote_sent'`
- Anlam: müşteriden onay bekleyen tekliflerin toplamı
- Boş veri: `0`, format: `₺0`

#### 5.4 Ortalama tamamlanan iş tutarı

- Response alanı: `revenue.average_completed_amount_cents`
- Kaynak: `appointments.quote_amount_cents`
- Hesap: `completed_amount_cents / completed appointment count with quote`
- Filtre: `status == 'completed'` ve `quote_amount_cents IS NOT NULL`
- Boş veri/payda 0: `0`, format: `₺0`

Para formatlama:

- `currency`: `TRY`
- Backend ham değerleri kuruş olarak döndürür: integer `*_cents`
- Backend ayrıca admin UI için `formatted` alanında `tr-TR` para formatı verebilir: ör. `₺12.500`
- Frontend isterse mevcut `formatCurrencyFromCents` yaklaşımıyla aynı değeri yeniden formatlayabilir.

### 6. Operasyon kartları

#### 6.1 Aktif randevular

- Response alanı: `operations.active_appointments`
- Kaynak: `appointments.status`
- Hesap: `COUNT(id)`
- Filtre:
  - tarih aralığı: `appointments.created_at`
  - `status IN ('pending', 'quote_sent', 'approved', 'in_progress')`
- Boş veri: `0`

#### 6.2 Aktif vale işleri

- Response alanı: `operations.active_valet_transfers`
- Kaynak: `valet_transfers.status`
- Hesap: `COUNT(id)`
- Filtre:
  - tarih aralığı: `valet_transfers.created_at`
  - `status IN ('requested', 'assigned', 'picking_up', 'in_transit_to_service', 'at_service', 'returning')`
- Boş veri: `0`

#### 6.3 Atama bekleyen işler

- Response alanları:
  - `operations.unassigned_appointments`
  - `operations.unassigned_valet_transfers`
- Kaynak:
  - `appointments.mechanic_id`
  - `valet_transfers.valet_id`
- Hesap:
  - randevu: `mechanic_id IS NULL` ve aktif randevu statüsü
  - vale: `valet_id IS NULL` ve aktif vale statüsü
- Filtre: seçilen tarih aralığı + aktif statüler
- Boş veri: `0`

#### 6.4 İptal oranı

- Response alanları:
  - `operations.appointment_cancellation_rate`
  - `operations.valet_cancellation_rate`
- Kaynak:
  - `appointments.status == cancelled`
  - `valet_transfers.status == cancelled`
- Hesap: `cancelled_count / total_count * 100`, 1 ondalık basamak
- Payda 0: `0.0`

#### 6.5 Rol bazlı aktif kullanıcı sayısı

- Response alanı: `operations.active_users_by_role[]`
- Kaynak: `users.role`, `users.is_active`
- Hesap: `COUNT(users.id)` rol bazında
- Filtre: `users.is_active == true`; tarih aralığı uygulanmaz, çünkü bu kart dönemsel iş değil güncel kapasite göstergesidir.
- Rollerin boş davranışı: `customer`, `mechanic`, `valet`, `admin` için `0` döndürülür.

## Örnek JSON response

```json
{
  "range": {
    "from": "2026-06-01T00:00:00+03:00",
    "to": "2026-07-01T00:00:00+03:00",
    "timezone": "Europe/Istanbul"
  },
  "summary": {
    "total_appointments": 42,
    "total_valet_requests": 18
  },
  "status_distribution": {
    "appointments": [
      { "status": "pending", "label": "Bekliyor", "group": "open", "count": 6, "percentage": 14.3 },
      { "status": "quote_sent", "label": "Teklif Gönderildi", "group": "open", "count": 5, "percentage": 11.9 },
      { "status": "approved", "label": "Onaylandı", "group": "active", "count": 8, "percentage": 19.0 },
      { "status": "in_progress", "label": "İşlemde", "group": "active", "count": 7, "percentage": 16.7 },
      { "status": "completed", "label": "Tamamlandı", "group": "completed", "count": 14, "percentage": 33.3 },
      { "status": "cancelled", "label": "İptal", "group": "cancelled", "count": 2, "percentage": 4.8 }
    ],
    "valet_requests": [
      { "status": "requested", "label": "Talep", "group": "open", "count": 2, "percentage": 11.1 },
      { "status": "assigned", "label": "Atandı", "group": "active", "count": 3, "percentage": 16.7 },
      { "status": "picking_up", "label": "Alıma Gidiyor", "group": "active", "count": 2, "percentage": 11.1 },
      { "status": "in_transit_to_service", "label": "Servise Gidiyor", "group": "active", "count": 1, "percentage": 5.6 },
      { "status": "at_service", "label": "Serviste", "group": "active", "count": 2, "percentage": 11.1 },
      { "status": "returning", "label": "Dönüşte", "group": "active", "count": 1, "percentage": 5.6 },
      { "status": "delivered", "label": "Teslim", "group": "completed", "count": 6, "percentage": 33.3 },
      { "status": "cancelled", "label": "İptal", "group": "cancelled", "count": 1, "percentage": 5.6 }
    ]
  },
  "completed_jobs": {
    "appointments": 14,
    "valet_deliveries": 6,
    "total": 20
  },
  "revenue": {
    "currency": "TRY",
    "approved_quote_amount_cents": 1850000,
    "completed_amount_cents": 1240000,
    "pending_quote_amount_cents": 420000,
    "average_completed_amount_cents": 88571,
    "formatted": {
      "approved_quote_amount": "₺18.500",
      "completed_amount": "₺12.400",
      "pending_quote_amount": "₺4.200",
      "average_completed_amount": "₺886"
    }
  },
  "operations": {
    "active_appointments": 26,
    "active_valet_transfers": 11,
    "unassigned_appointments": 3,
    "unassigned_valet_transfers": 2,
    "appointment_cancellation_rate": 4.8,
    "valet_cancellation_rate": 5.6,
    "active_users_by_role": [
      { "role": "customer", "label": "Müşteri", "count": 128 },
      { "role": "mechanic", "label": "Usta", "count": 9 },
      { "role": "valet", "label": "Vale", "count": 5 },
      { "role": "admin", "label": "Admin", "count": 2 }
    ]
  },
  "meta": {
    "generated_at": "2026-06-25T09:15:00+03:00",
    "data_freshness": "realtime",
    "notes": [
      "Revenue is quote-based; no payment collection table exists yet.",
      "Completed metrics use created_at until completed_at is introduced."
    ]
  }
}
```

## Hata durumları

| HTTP | Durum | Body örneği |
| --- | --- | --- |
| `401` | Token yok/geçersiz | `{ "detail": "Not authenticated" }` |
| `403` | Kullanıcı admin değil | `{ "detail": "Insufficient role" }` |
| `422` | `from >= to` veya geçersiz tarih/timezone | `{ "detail": "Invalid report range" }` |
| `500` | Beklenmeyen DB/servis hatası | `{ "detail": "Report generation failed" }` |

Hata response'ları FastAPI/Pydantic standardıyla uyumlu olabilir; frontend sadece `detail` alanını kullanıcıya gösterecek şekilde tasarlanmalıdır.

## Edge case'ler

- Hiç kayıt yoksa tüm sayısal alanlar `0`, yüzdeler `0.0`, liste alanları sıfırlı enum satırlarıyla döner.
- `quote_amount_cents = null` olan randevular ciro toplamına girmez; count metriklerine girer.
- `quote_amount_cents = 0` geçerli teklif olarak kabul edilir ve ciro toplamına `0` katkı yapar.
- İptal edilen randevular ciro metriklerine girmez; sadece toplam ve iptal oranına girer.
- Vale talebi bir randevuya bağlı olmayabilir (`appointment_id = null`); toplam/operasyon metriklerine yine dahil edilir.
- Admin paneli tüm kullanıcıların verisini görür; rol bazlı müşteri/usta filtreleri uygulanmaz.
- Bilinmeyen/yeni enum değeri DB'ye eklenirse backend response'ta `label` olarak ham değeri döndürebilir; frontend kırılmamalıdır.
- Tarih aralığı varsayılanı ay başı - şimdi olduğu için aylık panel davranışı sağlar; frontend özel dönem seçerse aynı sözleşme korunur.

## Kabul kriterleri

- Backend `GET /api/v1/admin/reports/overview` endpoint'i admin rolü dışında erişime kapalıdır.
- Response alan adları bu dokümandaki sözleşmeyle birebir uyumludur.
- Tüm count/sum/rate alanları boş veri durumunda `null` değil `0` veya `0.0` döndürür.
- Status dağılımları appointment ve valet enumlarını eksiksiz kapsar.
- Ciro metrikleri sadece `quote_amount_cents` üzerinden ve kuruş cinsinden hesaplanır; TRY formatı response içinde veya frontend helper ile tutarlı verilir.
- Tarih aralığı `from` dahil, `to` hariç uygulanır.
- `from >= to` ve geçersiz timezone için `422` döner.
- Frontend tek endpoint response'u ile özet kartları, durum dağılımı grafiklerini, ciro kartlarını ve operasyon kartlarını ek API çağrısı olmadan render edebilir.
