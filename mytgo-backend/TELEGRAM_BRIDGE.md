# E-Cars Telegram Bridge

## Endpointler
- `POST /api/v1/integrations/telegram/webhook`
- `GET /api/v1/integrations/telegram/health`

## Gerekli env değişkenleri
- `E-Cars_TELEGRAM_BOT_TOKEN`
- `E-Cars_TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `E-Cars_TELEGRAM_ALLOWED_CHAT_IDS`
- `E-Cars_TELEGRAM_ALLOWED_USER_IDS`
- `E-Cars_TELEGRAM_USER_MAP`

## `E-Cars_TELEGRAM_USER_MAP` formatı
Telegram hesabını E-Cars kullanıcısına bağlamak için kullanılır.

Örnek:
```bash
E-Cars_TELEGRAM_USER_MAP="123456789:1,987654321:42"
```

Bu örnekte:
- `123456789` Telegram user ID
- `1` E-Cars `users.id`

## Komutlar
- `/start` — karşılama
- `/help` — komut listesi
- `/health` — servis durumu
- `/me` — eşleşen E-Cars kullanıcısı
- `/unread` — okunmamış bildirim sayısı
- `/notifications [n]` — son bildirimler
- `/echo <metin>` — test/geri dönüş

## Webhook kurma
```bash
python scripts/setup_telegram_webhook.py set \
  --webhook-url https://english-app.bounceme.net/api/v1/integrations/telegram/webhook \
  --ip-address 152.70.22.90
```

İsteğe bağlı:
- `--drop-pending-updates`

## Webhook DNS yoksa / uzun polling
Eğer Telegram webhook alan adı DNS üzerinden çözülemiyorsa, poller servisi kullanılır:
```bash
sudo systemctl enable --now mytgo-telegram-poller
```
Bu servis webhook'u siler ve `getUpdates` ile botu ayakta tutar.

## Webhook silme
```bash
python scripts/setup_telegram_webhook.py delete
```

## Güvenlik notları
- Webhook isteği `X-Telegram-Bot-Api-Secret-Token` ile korunur.
- `E-Cars_TELEGRAM_ALLOWED_CHAT_IDS` veya `E-Cars_TELEGRAM_ALLOWED_USER_IDS` ile erişim kısıtlanır.
- Telegram hesabı ile E-Cars kullanıcı eşlemesi yoksa workflow komutları çalışmaz.
- Bot token ve secret değerleri repoya yazılmamalı; env’den okunmalı.
