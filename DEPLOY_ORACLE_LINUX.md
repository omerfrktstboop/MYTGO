# E-Cars Oracle Linux Deploy Guide

This guide deploys E-Cars on an Oracle Linux server with:

- FastAPI/Uvicorn backend behind Nginx
- React production build served by Nginx
- WebSocket proxy support for valet tracking and chat
- SQLite database stored on the server

## 1. Install Server Packages

```bash
sudo dnf update -y
sudo dnf install -y git nginx python3 python3-pip python3-virtualenv
sudo systemctl enable --now nginx
```

Install Node.js 20:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v
npm -v
```

## 2. Clone The Private Repo

Create an app directory:

```bash
cd /opt
sudo mkdir -p /opt/mytgo
sudo chown -R $USER:$USER /opt/mytgo
```

Clone the repository:

```bash
git clone https://github.com/omerfrktstboop/E-Cars.git /opt/mytgo
cd /opt/mytgo
```

Because the repository is private, configure GitHub access on the server with a GitHub token or deploy key before cloning.

## 3. Configure Backend

```bash
cd /opt/mytgo/mytgo-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env
```

Use production-oriented values:

```env
E-Cars_ENVIRONMENT=production
E-Cars_DATABASE_URL=sqlite+aiosqlite:////opt/mytgo/mytgo-backend/mytgo.db
E-Cars_JWT_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
E-Cars_JWT_ALGORITHM=HS256
E-Cars_ACCESS_TOKEN_EXPIRE_MINUTES=60
E-Cars_LOG_LEVEL=INFO
E-Cars_SQL_ECHO=false
E-Cars_DEMO_PASSWORD=DemoPass123!
```

Initialize database and demo users:

```bash
source .venv/bin/activate
python -m app.seed
```

## 4. Create Backend systemd Service

Create the service file:

```bash
sudo nano /etc/systemd/system/mytgo-backend.service
```

Use this content. Replace `opc` with your Linux username if different.

```ini
[Unit]
Description=E-Cars FastAPI Backend
After=network.target

[Service]
User=opc
WorkingDirectory=/opt/mytgo/mytgo-backend
EnvironmentFile=/opt/mytgo/mytgo-backend/.env
ExecStart=/opt/mytgo/mytgo-backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mytgo-backend
sudo systemctl status mytgo-backend
```

## 5. Build Frontend

```bash
cd /opt/mytgo/mytgo-frontend
cp .env.example .env
nano .env
```

For IP-only deployment:

```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP
VITE_WS_BASE_URL=ws://YOUR_SERVER_IP
```

For domain and HTTPS:

```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_BASE_URL=wss://your-domain.com
```

Build and publish the static files:

```bash
npm install
npm run build
sudo mkdir -p /var/www/mytgo
sudo rsync -a --delete dist/ /var/www/mytgo/
```

## 6. Configure Nginx

Create the Nginx config:

```bash
sudo nano /etc/nginx/conf.d/mytgo.conf
```

Use this config. For a domain, replace `_` with your domain.

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/mytgo;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000/health;
    }
}
```

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Open Firewall Ports

In the Oracle Cloud console, open ingress rules for:

- TCP `80`
- TCP `443` if using HTTPS

If `firewalld` is active on the server:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 8. Verify Deployment

Backend locally:

```bash
curl http://127.0.0.1:8000/health
```

Through Nginx:

```bash
curl http://YOUR_SERVER_IP/health
```

Watch backend logs:

```bash
sudo journalctl -u mytgo-backend -f
```

Open the app:

```text
http://YOUR_SERVER_IP
```

Demo login:

- `customer@mytgo.local`
- `mechanic@mytgo.local`
- `valet@mytgo.local`
- `admin@mytgo.local`

Development password:

```text
DemoPass123!
```

## 9. Optional HTTPS With Let's Encrypt

After your domain points to the server:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then rebuild the frontend with:

```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WS_BASE_URL=wss://your-domain.com
```

Rebuild and republish:

```bash
cd /opt/mytgo/mytgo-frontend
npm run build
sudo rsync -a --delete dist/ /var/www/mytgo/
```
