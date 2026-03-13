# Wagex Server Setup Guide (Ubuntu)

This guide explains how to set up the **Wagex project** on a fresh Ubuntu machine and configure it exactly as currently deployed.

---

# 1. Prerequisites

Ensure you have **Node.js, NPM, and Nginx installed**.  
It is recommended to install Node.js using **NVM (Node Version Manager)**.

## Install NVM and Node.js

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js
nvm install 20
```

## Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

## Install PM2

```bash
npm install -g pm2
```

---

# 2. Project Setup

Place the project folders inside:

```
~/Projects/wagex/
```

```bash
mkdir -p ~/Projects/wagex
```

Then copy the following folders into it:

```
wagex-frontend
wagex-backend
```

Final structure:

```
~/Projects/wagex
 ├── wagex-backend
 └── wagex-frontend
```

---

# 3. Launch Backend (NestJS)

```bash
cd ~/Projects/wagex/wagex-backend

npm install
npm run build

pm2 start dist/main.js --name wagex-backend
```

**Important**

Ensure the backend is configured to listen on:

```
port 8000
```

---

# 4. Launch Frontend (Next.js)

```bash
cd ~/Projects/wagex/wagex-frontend

npm install
npm run build

pm2 start "npm run start" --name wagex-frontend
```

**Important**

Ensure the frontend runs on:

```
port 3000
```

---

# 5. Configure Nginx

Create an Nginx configuration to route traffic based on the `/api/` prefix.

## Create the config file

```bash
sudo nano /etc/nginx/sites-available/wagex
```

## Paste the following configuration

```nginx
server {
    listen 80;
    server_name _; # Replace with your domain if available

    # Route /api/ requests to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Route all other traffic to frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Enable the configuration

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Enable wagex config
sudo ln -s /etc/nginx/sites-available/wagex /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

# 6. Persistence (Auto Restart on Reboot)

Ensure PM2 restarts the applications automatically after a reboot.

```bash
pm2 save
pm2 startup
```

Follow the command printed by PM2 to complete the setup.

---

# Server Changes Already Applied

The following adjustments were performed on the server:

1. **Identified Running Ports**

   - Frontend running on **port 3000**
   - Backend running on **port 8000**

2. **Checked Nginx Configurations**

   - Found the configuration file  
     `/etc/nginx/sites-available/wagex`

3. **Corrected Active Config**

   - Removed the active `wagex-backend` link which was routing all traffic to the backend.
   - Activated the `wagex` configuration instead.

4. **Verified Setup**

   - Confirmed both **frontend and backend** are responding correctly via **Nginx**.

---

# Final Architecture

```
Internet
   │
   ▼
Nginx (Port 80)
   │
   ├── /api/*  → Backend (NestJS - Port 8000)
   │
   └── /*      → Frontend (Next.js - Port 3000)
```

---
