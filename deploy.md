# iFastX WA Gateway Production Deployment Guide (Live Server / VPS)

This document outlines the steps to deploy the WhatsApp Instance Manager Pro to a live dedicated server (VPS or Dedicated Server) with a public IP.

## Recommended OS
**Ubuntu 22.04 LTS** or **Ubuntu 20.04 LTS** are the best choices for both the Official Meta Cloud API and Baileys (Web API). They provide stable versions of Node.js, PostgreSQL, and Redis out of the box, and have excellent community support.

---

## 1. Backend Infrastructure (Live Server)

### Prerequisites
- Ubuntu 22.04 LTS
- Node.js 18+ or 20+
- PostgreSQL 14+
- Redis (Required for BullMQ message queue)
- PM2 (Process Manager)
- Nginx

### Step 1: Clone and Install
SSH into your server and run:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Create directory
mkdir -p /var/www/wa-api
cd /var/www/wa-api

# [Transfer your files here, e.g., via Git, SCP, or FTP]

# Install Node dependencies
npm install
```

### Step 2: Environment Configuration (`.env`)
Create a `.env` file in the backend root. **Crucial for fixing 401/500 errors.**

```env
PORT=3000
JWT_SECRET=ifastx_internal_secure_2024_09_v2  # MUST MATCH ALL SERVICES
DATABASE_URL=postgres://user:password@localhost:5432/wa_gateway
REDIS_URL=redis://127.0.0.1:6379
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Database Schema
Execute the SQL found in `components/CodeSnippets.tsx` (database.sql) on your PostgreSQL instance to create the required tables.

### Step 4: Start Backend with PM2
```bash
# Start your backend server (make sure package.json has "start": "node server.cjs")
pm2 start server.cjs --name "wa-api"
pm2 save
pm2 startup
```

---

## 2. Nginx Reverse Proxy Config (For Public IP / Domain)

To point your public domain (e.g., `wa-api.yourdomain.com`) to your backend on the live server:

1. Install Nginx and Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx
```

2. Create an Nginx configuration file (`/etc/nginx/sites-available/wa-api`):
```nginx
server {
    listen 80;
    server_name wa-api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Enable the site and request an SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/wa-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d wa-api.yourdomain.com
```
*Note: Make sure your domain's DNS A Record points to your server's Public IP.*

---

## 3. Frontend Deployment

### Step 1: Build Configuration
Update your `vite.config.ts` if you are hosting in a subfolder, otherwise leave it as default.
Update `API_BASE` in your `App.tsx` or `.env` to point to `https://wa-api.yourdomain.com`.

### Step 2: Build and Upload
```bash
npm run build
```
Copy the contents of the `dist/` folder to your web root (e.g., `/var/www/html/wa` or `/var/www/wa-frontend`). Configure another Nginx server block to serve these static files.

---

## 4. Meta Webhook Setup

Since you are on a live server, you can now connect the Official Meta Cloud API.
In your Meta App Dashboard > WhatsApp > Configuration, set the Webhook URL to:
`https://wa-api.yourdomain.com/api/meta/webhook`

Subscribe to the `messages` event.

---

## 5. Troubleshooting 401 & 500 Errors

### Fixing 401 (Unauthorized)
- **Check Headers**: The frontend sends `X-User-ID` and `X-API-Key`.
- **Login Session**: Ensure the user has a valid role and API key in the database.

### Fixing 500 (Internal Server Error)
- **Redis Connection**: Check if Redis is running (`sudo systemctl status redis`). If `server.cjs` cannot connect to Redis, the `outboundQueue` will be `undefined`, causing crashes on `/api/send`.
- **Database Connectivity**: Ensure PostgreSQL is running and credentials in `.env` are correct.
- **View Logs**: Run `pm2 logs wa-api` to see exact error messages.
