# MYTGO Telegram Bridge

## Endpointler
- `POST /api/v1/integrations/telegram/webhook`
- `GET /api/v1/integrations/telegram/health`

## Gerekli env değişkenleri
- `MYTGO_TELEGRAM_BOT_TOKEN`
- `MYTGO_TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `MYTGO_TELEGRAM_ALLOWED_CHAT_IDS`
- `MYTGO_TELEGRAM_ALLOWED_USER_IDS`
- `MYTGO_TELEGRAM_USER_MAP`

## `MYTGO_TELEGRAM_USER_MAP` formatı
Telegram hesabını MYTGO kullanıcısına bağlamak için kullanılır.

Örnek:
```bash
MYTGO_TELEGRAM_USER_MAP="123456789:1,987654321:42"
```

Bu örnekte:
- `123456789` Telegram user ID
- `1` MYTGO `users.id`

## Komutlar
- `/start` — karşılama
- `/help` — komut listesi
- `/health` — servis durumu
- `/me` — eşleşen MYTGO kullanıcısı
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
- `MYTGO_TELEGRAM_ALLOWED_CHAT_IDS` veya `MYTGO_TELEGRAM_ALLOWED_USER_IDS` ile erişim kısıtlanır.
- Telegram hesabı ile MYTGO kullanıcı eşlemesi yoksa workflow komutları çalışmaz.
- Bot token ve secret değerleri repoya yazılmamalı; env’den okunmalı.
