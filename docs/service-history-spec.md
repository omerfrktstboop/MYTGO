# MYTGO Araç Bazlı Bakım/Servis Geçmişi Spesifikasyonu

Bu doküman, backend ve frontend worker'larının ek soru sormadan TDD ile başlayabilmesi için araç bazlı bakım/servis geçmişi ekranının kapsamını, API sözleşmesini, ekran davranışını ve kabul kriterlerini netleştirir.

## 1. Hedef ve kapsam

Amaç: Müşteri, usta ve admin rollerinin yetkileri dahilinde bir araca ait geçmiş bakım/servis kayıtlarını görebilmesi; müşterinin kendi aracı için geçmiş kayıt oluşturup güncelleyebilmesi; usta/admin tarafının servis operasyonundan doğan kayıtları izleyebilmesi.

MVP kapsamı:
- Araç bazlı servis geçmişi kayıt modeli oluşturulur.
- Araç detayında ve/veya Araç panelinde seçilen aracın geçmiş kayıtları listelenir.
- Kayıtlar servis tarihine göre en yeniden eskiye sıralanır.
- 'Son işlemler' bölümü en güncel 5 kaydı gösterir.
- Liste, boş durum, hata durumu ve yetki/erişim durumları net mesajlarla gösterilir.

MVP dışında bırakılanlar:
- Dosya/fatura görseli yükleme.
- Periyodik bakım hatırlatıcıları.
- Otomatik servis kaydı üretimi için zorunlu appointment entegrasyonu. İleride `appointment_id` opsiyonel ilişki ile eklenebilir, fakat MVP bunun varlığına bağlı olmamalıdır.

## 2. Veri modeli

Yeni tablo önerisi: `vehicle_service_history_entries`.

Alanlar:
- `id`: integer primary key.
- `vehicle_id`: integer, zorunlu, `vehicles.id` foreign key, index.
- `service_date`: datetime/date, zorunlu. Kullanıcıya 'Servis tarihi' olarak gösterilir. Saat bilgisi gelmezse backend gün başlangıcı veya date olarak saklayabilir; API ISO-8601 string döndürmelidir.
- `operation_type`: enum/string, zorunlu. MVP değerleri:
  - `maintenance`: Bakım
  - `repair`: Tamir
  - `inspection`: Muayene/Kontrol
  - `cleaning`: Temizlik
  - `tire`: Lastik
  - `other`: Diğer
- `odometer_km`: integer, opsiyonel, `>= 0`. Kullanıcıya 'Kilometre' olarak gösterilir.
- `service_provider`: string, opsiyonel, max 160. Örn. 'MYTGO Sanayi', 'Bosch Car Service'.
- `description`: text, opsiyonel. Kullanıcıya 'Açıklama/Not' olarak gösterilir.
- `cost_amount_cents`: integer, opsiyonel, `>= 0`. Para tutarı kuruş/cent cinsinden saklanır.
- `cost_currency`: string, opsiyonel ama `cost_amount_cents` varsa zorunlu. Varsayılan `TRY`. ISO-4217 üç harf formatı beklenir.
- `created_by_id`: integer, zorunlu, `users.id` foreign key. Kaydı oluşturan kullanıcı.
- `updated_by_id`: integer, opsiyonel, `users.id` foreign key. Son güncelleyen kullanıcı.
- `created_at`: datetime, zorunlu, mevcut `TimestampMixin` ile.
- `updated_at`: datetime, zorunlu, mevcut `TimestampMixin` ile.

Frontend gösterim alanları:
- Araç bilgisi: plaka, marka, model, yıl ve `vehicle_id`.
- Servis tarihi.
- İşlem tipi etiketi.
- Kilometre.
- Servis sağlayıcı.
- Açıklama/not.
- Maliyet: tutar + para birimi. Tutar yoksa 'Maliyet girilmedi'.
- Oluşturan/güncelleyen: en az user id; mümkünse `full_name` + rol.
- Oluşturulma/güncellenme zaman damgaları.

## 3. Backend API sözleşmesi

Mevcut API prefix'i: `/api/v1`.

### 3.1 Listeleme: araç servis geçmişi

Endpoint:
`GET /api/v1/vehicles/{vehicle_id}/service-history?limit=20&offset=0`

Yetki:
- `customer`: sadece kendi aracının kayıtlarını görür.
- `mechanic`: kendisine atanmış veya boşta olan randevularla ilişkili araç kayıtlarını görebilir. MVP'de appointment ilişkisi yoksa mekanik için sadece admin benzeri tüm liste değil; 403 yerine net erişim kuralı uygulanmalıdır. En güvenli MVP: mekanik yalnızca kendisinin oluşturduğu servis geçmişi kayıtlarını veya kendisine atanmış appointment bulunan araçları görür.
- `admin`: tüm araç kayıtlarını görür.
- `valet`: servis geçmişine erişemez; 403.

Query parametreleri:
- `limit`: integer, default 20, min 1, max 100.
- `offset`: integer, default 0, min 0.

Sıralama:
- Öncelik: `service_date DESC`.
- Eşitlik: `id DESC`.

Başarılı yanıt: `200 OK`

```json
{
  "vehicle": {
    "id": 1,
    "owner_id": 1,
    "plate_number": "34MYTGO34",
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2020
  },
  "items": [
    {
      "id": 10,
      "vehicle_id": 1,
      "service_date": "2026-06-20T09:00:00Z",
      "operation_type": "maintenance",
      "odometer_km": 45200,
      "service_provider": "MYTGO Sanayi",
      "description": "Yağ, filtre ve genel kontrol yapıldı.",
      "cost_amount_cents": 325000,
      "cost_currency": "TRY",
      "created_by_id": 1,
      "updated_by_id": 2,
      "created_at": "2026-06-20T09:20:00Z",
      "updated_at": "2026-06-20T10:10:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Hata yanıtları:
- `401 Unauthorized`: token yok/geçersiz.
- `403 Forbidden`: rol veya araç erişimi yok.
- `404 Not Found`: araç yok veya müşteri kendi aracı olmayan aracı görmeye çalışıyor. Mevcut `get_owned_vehicle` davranışıyla müşteri için 404 kabul edilir.
- `422 Unprocessable Entity`: limit/offset geçersiz.

### 3.2 Son işlemler

Endpoint:
`GET /api/v1/vehicles/{vehicle_id}/service-history/recent`

Davranış:
- Her zaman en güncel 5 kaydı döndürür.
- Sıralama `service_date DESC, id DESC`.
- Yanıt gövdesi listeleme endpoint'iyle aynı shape'i kullanabilir; `limit` her zaman 5 olmalıdır.

Başarılı yanıt: `200 OK`.

### 3.3 Kayıt oluşturma

Endpoint:
`POST /api/v1/vehicles/{vehicle_id}/service-history`

Yetki:
- `customer`: kendi aracı için oluşturabilir.
- `mechanic`: erişebildiği araç için oluşturabilir; `created_by_id` mekanik olur.
- `admin`: tüm araçlar için oluşturabilir.
- `valet`: oluşturamaz; 403.

Request body:
```json
{
  "service_date": "2026-06-20T09:00:00Z",
  "operation_type": "maintenance",
  "odometer_km": 45200,
  "service_provider": "MYTGO Sanayi",
  "description": "Yağ, filtre ve genel kontrol yapıldı.",
  "cost_amount_cents": 325000,
  "cost_currency": "TRY"
}
```

Validasyon:
- `service_date` zorunlu ve geçerli ISO-8601 olmalı.
- `operation_type` izinli değerlerden biri olmalı.
- `odometer_km` varsa `>= 0` olmalı.
- `cost_amount_cents` varsa `>= 0` olmalı.
- `cost_amount_cents` varsa `cost_currency` zorunlu; yoksa backend `TRY` kullanabilir.
- `cost_currency` varsa üç harf uppercase ISO-4217 formatında olmalı.
- `service_provider` boş string gelirse `null` olarak normalize edilebilir.
- `description` boş string gelirse `null` olarak normalize edilebilir.

Başarılı yanıt: `201 Created`, oluşturulan kayıt.

### 3.4 Kayıt güncelleme

Endpoint:
`PATCH /api/v1/vehicles/{vehicle_id}/service-history/{entry_id}`

Yetki:
- `customer`: kendi aracındaki kayıtları güncelleyebilir.
- `mechanic`: kendi oluşturduğu veya erişebildiği araç kayıtlarını güncelleyebilir.
- `admin`: tüm kayıtları güncelleyebilir.
- `valet`: güncelleyemez; 403.

Request body: create body alanlarının tamamı opsiyonel.

Davranış:
- `vehicle_id` ve `entry_id` eşleşmezse 404.
- `updated_by_id` current user id olur.
- `updated_at` otomatik güncellenir.

Başarılı yanıt: `200 OK`, güncellenen kayıt.

### 3.5 Silme

MVP için fiziksel silme zorunlu değildir. Worker'lar silme eklememelidir. Gereksinim çıkarsa ayrı task açılmalıdır.

## 4. Frontend ekran davranışı

### 4.1 Navigasyon ve yerleşim

Mevcut uygulama sol sidebar kullanıyor. Bu çizgi korunmalıdır.

Müşteri rolü için öneri:
- Sidebar'a `Servis Geçmişi` veya Araç panelinde araç kartı içi `Geçmiş` aksiyonu eklenir.
- MVP için en düşük riskli seçenek: `Araçlar` panelinde her araç kartında servis geçmişi bölümü/expand davranışı göstermek.

Usta/admin rolü için öneri:
- Randevu/Panel detaylarında araç bilgisi üzerinden servis geçmişi kısa listesi gösterilir.
- Usta sadece erişebildiği araçlar için geçmişi görür.

### 4.2 Listeleme

Her servis geçmişi kartında gösterilecek alanlar:
- Başlık: işlem tipi etiketi + servis tarihi.
- Meta: araç plakası + marka/model/yıl.
- Detay satırları:
  - Kilometre: `45.200 km` veya `Kilometre girilmedi`.
  - Servis sağlayıcı: değer veya `Servis sağlayıcı yok`.
  - Not: değer veya `Not yok`.
  - Maliyet: `₺3.250` veya `Maliyet girilmedi`.
  - Oluşturan: ad/rol biliniyorsa `MYTGO Customer (Müşteri)`, değilse `#1`.
  - Güncelleyen: değer yoksa `Henüz güncellenmedi`.
  - Oluşturulma/Güncellenme: `tr-TR` tarih/saat formatı.

Sıralama:
- UI backend sırasına güvenebilir ama testte `service_date DESC, id DESC` beklentisi doğrulanmalıdır.

### 4.3 Son işlemler

`Son işlemler` bölümü:
- En güncel 5 kaydı gösterir.
- Başlık: `Son işlemler`.
- Alt metin: `Servis tarihine göre en güncel 5 kayıt`.
- 5'ten fazla kayıt varsa `Tüm geçmişi görüntüle` aksiyonu gösterilebilir.
- Kayıt yoksa bu bölüm de boş durum mesajı göstermelidir.

### 4.4 Form davranışı

Müşteri/admin için oluşturma formu:
- Araç seçimi veya araç kartından geliyorsa seçili araç sabit.
- Servis tarihi zorunlu.
- İşlem tipi zorunlu select.
- Kilometre opsiyonel number, min 0.
- Servis sağlayıcı opsiyonel input.
- Açıklama/not opsiyonel textarea/input.
- Maliyet opsiyonel number, min 0. Frontend TL girer, backend'e cents gönderir.
- Para birimi default `TRY`.

Başarılı create/update sonrası:
- Form temizlenir.
- Liste ve son işlemler yeniden yüklenir.
- Yeşil notice: `Servis geçmişi kaydedildi` veya `Servis geçmişi güncellendi`.

### 4.5 Boş durum

Liste boşsa:
- Başlık: `Bu araç için servis geçmişi yok`.
- Açıklama: `İlk bakım veya servis kaydını ekleyerek geçmişi oluşturmaya başlayın.`
- Yetkisi olan rollerde form/CTA görünür.
- Yetkisi olmayan rollerde CTA gösterilmez.

### 4.6 Hata durumu

API hata mesajları kullanıcı dostu gösterilir:
- 401: `Oturum süresi doldu. Lütfen tekrar giriş yapın.`
- 403: `Bu aracın servis geçmişine erişim yetkiniz yok.`
- 404: `Araç veya servis kaydı bulunamadı.`
- 422: `Lütfen servis tarihi, işlem tipi ve tutar alanlarını kontrol edin.`
- Network/genel: `Servis geçmişi yüklenemedi. Tekrar deneyin.`

## 5. Backend worker için TDD başlangıç planı

Önerilen dosyalar:
- Create: `mytgo-backend/app/models/service_history.py`
- Modify: `mytgo-backend/app/models/__init__.py`
- Modify: `mytgo-backend/app/models/enums.py`
- Create: `mytgo-backend/app/schemas/service_history.py`
- Create: `mytgo-backend/app/services/service_history.py`
- Create: `mytgo-backend/app/routers/service_history.py`
- Modify: `mytgo-backend/app/routers/api.py`
- Modify: `mytgo-backend/app/db/init_db.py`
- Test: `mytgo-backend/tests/test_service_history.py`

Minimum test senaryoları:
1. Müşteri kendi aracına servis geçmişi kaydı oluşturur: `201`, alanlar doğru, `created_by_id` current user.
2. Müşteri kendi aracının geçmişini listeler: `200`, `vehicle`, `items`, `total`, `limit`, `offset` shape doğru.
3. Liste sırası `service_date DESC, id DESC`.
4. Recent endpoint yalnızca 5 kayıt döndürür.
5. Başka müşteri araca erişmeye çalışır: 404 veya 403; mevcut araç erişim pattern'i nedeniyle müşteri için 404 kabul.
6. Valet liste/create/update yapamaz: 403.
7. Negatif kilometre veya negatif maliyet: 422.
8. `cost_amount_cents` verilip currency eksikse default `TRY` veya schema kararı doğrulanır.
9. PATCH `updated_by_id` set eder ve alanı değiştirir.
10. `vehicle_id` ile `entry_id` eşleşmezse 404.

Çalıştırma:
- Backend: `cd mytgo-backend && pytest tests/test_service_history.py -q`
- Tam regresyon: `cd mytgo-backend && pytest -q`

## 6. Frontend worker için TDD başlangıç planı

Önerilen dosyalar:
- Modify/Create helper: `mytgo-frontend/src/appDetails.js`
- Modify: `mytgo-frontend/src/App.jsx`
- Test: `mytgo-frontend/tests/serviceHistory.test.mjs`

Minimum test senaryoları:
1. `formatCurrencyFromCents(325000)` benzeri helper TRY formatını doğru üretir veya mevcut helper yeniden kullanılır.
2. Service history detail rows boş değerleri doğru fallback metinleriyle gösterir.
3. Recent records helper/sıralama UI tarafında bozulmadan en fazla 5 kayıt gösterir.
4. Error state mapping 401/403/404/422 için beklenen Türkçe mesajları üretir.
5. Create form TL tutarını cents'e çevirir.

Çalıştırma:
- Frontend unit: `cd mytgo-frontend && npm test`
- Build: `cd mytgo-frontend && npm run build`

## 7. Test edilebilir kabul kriterleri

Backend kabul kriterleri:
- Yeni servis geçmişi API'leri `/api/v1/vehicles/{vehicle_id}/service-history` ve `/recent` altında çalışır.
- Response shape bu dokümandaki sözleşmeyle uyumludur.
- Tüm kayıtlar vehicle bazlı filtrelenir; başka müşterinin aracı sızmaz.
- Recent endpoint tam olarak en güncel 5 kaydı `service_date DESC, id DESC` sıralamasıyla döndürür.
- Create/update validasyonları negatif km/maliyet ve geçersiz enum/currency durumlarını 422 yapar.
- Yetkisiz roller 401/403/404 kurallarına göre engellenir.
- `created_by_id`, `updated_by_id`, `created_at`, `updated_at` alanları doğru set edilir.
- Backend testleri ve mevcut MVP regresyon testi geçer.

Frontend kabul kriterleri:
- Müşteri kendi araçlarının servis geçmişini görebilir.
- Servis geçmişi kartlarında araç bilgisi, servis tarihi, işlem tipi, km, sağlayıcı, not, maliyet/para birimi, oluşturan/güncelleyen ve zaman damgaları görünür.
- `Son işlemler` bölümü en güncel 5 kaydı gösterir ve sıralama backend sözleşmesiyle uyumludur.
- Boş durumda Türkçe açıklama ve yetkili kullanıcı için kayıt ekleme CTA/formu görünür.
- 401/403/404/422 ve network hatalarında kullanıcı dostu Türkçe hata mesajı görünür.
- Kayıt ekleme/güncelleme sonrası liste yenilenir ve başarı notice'i gösterilir.
- Frontend unit testleri ve build geçer.

## 8. Net kararlar

- 'Son işlemler' kayıt sayısı: 5.
- Sıralama: `service_date DESC`, eşitlikte `id DESC`.
- Varsayılan para birimi: `TRY`.
- Maliyet backend'e cents olarak gider, frontend TL olarak gösterir/girer.
- Silme MVP kapsamı dışıdır.
- Appointment entegrasyonu MVP için zorunlu değildir; servis geçmişi araç bazlı bağımsız kayıt olarak uygulanır.
