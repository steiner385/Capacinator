# Local HTTPS Setup for Capacinator

This guide documents how to access Capacinator locally via HTTPS at `https://local.capacinator.com`.

## Setup Overview

The application is configured to run with:
- **Backend API**: Port 3110 (HTTP)
- **Frontend Dev Server**: Port 3120 (HTTPS)
- **Nginx Reverse Proxy**: Port 443 (HTTPS) serving at `local.capacinator.com`

## Configuration Details

### 1. Hosts File
The domain `local.capacinator.com` is mapped to `127.0.0.1` in `/etc/hosts`:
```
127.0.0.1   local.capacinator.com
```

### 2. SSL Certificate
A self-signed certificate is installed at:
- Certificate: `/etc/nginx/ssl/local.capacinator.com.crt`
- Private Key: `/etc/nginx/ssl/local.capacinator.com.key`

### 3. Nginx Configuration
Located at: `/home/tony/GitHub/Capacinator/nginx/local.capacinator.com.conf`

Key features:
- HTTP to HTTPS redirect
- Proxies `/api/*` requests to backend (port 3110)
- Proxies all other requests to Vite dev server (port 3120)
- WebSocket support for Socket.IO and Vite HMR
- Modern SSL configuration with TLS 1.2+

### 4. Vite Configuration
Updated to support the domain:
- HMR configured to use `wss://local.capacinator.com:443`
- Added `local.capacinator.com` to allowed hosts
- Babel plugin for React JSX transformation installed

## Accessing the Application

1. Start the development servers:
   ```bash
   npm run dev
   ```

2. Access the application at:
   ```
   https://local.capacinator.com
   ```

3. **Certificate Warning**: Your browser will show a security warning because the certificate is self-signed. This is normal for local development:
   - Click "Advanced" 
   - Click "Proceed to local.capacinator.com (unsafe)"

## Troubleshooting

### WebSocket Connection Issues
If you see WebSocket errors in the console:
1. Ensure the dev servers are running (`npm run dev`)
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache and cookies for the domain

### Certificate Issues
If the certificate expires or needs regeneration:
```bash
sudo ./scripts/setup-nginx.sh
```

### Eliminating Browser Security Warnings

To completely eliminate Chrome's security warnings for the self-signed certificate:

1. **Regenerate certificate with proper SAN (Subject Alternative Names):**
   ```bash
   # Remove old certificate
   sudo rm -f /etc/nginx/ssl/local.capacinator.com.crt /etc/nginx/ssl/local.capacinator.com.key
   
   # Create temporary config file
   cat > /tmp/local.capacinator.com.conf << EOF
   [req]
   distinguished_name = req_distinguished_name
   req_extensions = v3_req
   prompt = no

   [req_distinguished_name]
   C = US
   ST = State
   L = City
   O = Organization
   CN = local.capacinator.com

   [v3_req]
   keyUsage = keyEncipherment, dataEncipherment
   extendedKeyUsage = serverAuth
   subjectAltName = @alt_names

   [alt_names]
   DNS.1 = local.capacinator.com
   DNS.2 = *.local.capacinator.com
   IP.1 = 127.0.0.1
   IP.2 = ::1
   EOF
   
   # Generate new certificate with SAN
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout /etc/nginx/ssl/local.capacinator.com.key \
       -out /etc/nginx/ssl/local.capacinator.com.crt \
       -config /tmp/local.capacinator.com.conf \
       -extensions v3_req
   
   # Clean up
   rm -f /tmp/local.capacinator.com.conf
   ```

2. **Add certificate to system trust store:**
   ```bash
   sudo cp /etc/nginx/ssl/local.capacinator.com.crt /usr/local/share/ca-certificates/
   sudo update-ca-certificates
   ```

3. **Add certificate to Chrome's trust store (optional, for complete elimination of warnings):**
   - Open Chrome and go to `chrome://settings/certificates`
   - Click "Authorities" tab
   - Click "Import"
   - Select `/etc/nginx/ssl/local.capacinator.com.crt`
   - Check "Trust this certificate for identifying websites"
   - Click "OK"

4. **Restart nginx and test:**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

After these steps, Chrome should show a green lock icon for `https://local.capacinator.com`.

### Nginx Issues
To test nginx configuration:
```bash
sudo nginx -t
```

To reload nginx:
```bash
sudo systemctl reload nginx
```

To view nginx logs:
```bash
sudo tail -f /var/log/nginx/local.capacinator.com.error.log
```

## Quick Setup Script

A setup script is available at `scripts/setup-nginx.sh` that automates:
- Adding domain to /etc/hosts
- Generating SSL certificate
- Enabling nginx site
- Testing and reloading nginx

Run with:
```bash
sudo ./scripts/setup-nginx.sh
```