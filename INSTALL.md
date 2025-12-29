# Manuelle Installation - Weinregal-Verwaltung

Falls das automatische Installationsskript Probleme macht, folgen Sie dieser manuellen Anleitung.

## Schritt 1: Node.js installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Version prüfen
node -v
npm -v
```

## Schritt 2: MySQL installieren und sichern

```bash
sudo apt-get update
sudo apt-get install -y mysql-server

# MySQL starten
sudo systemctl start mysql
sudo systemctl enable mysql

# MySQL absichern (optional aber empfohlen)
sudo mysql_secure_installation
```

## Schritt 3: Datenbank einrichten

### Option A: Mit sudo mysql (empfohlen für Ubuntu)

```bash
sudo mysql
```

Dann in der MySQL-Konsole:

```sql
-- Benutzer erstellen
DROP USER IF EXISTS 'wine_admin'@'localhost';
CREATE USER 'wine_admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'IhrSicheresPasswort';

-- Datenbank erstellen
DROP DATABASE IF EXISTS wine_inventory;
CREATE DATABASE wine_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rechte vergeben
GRANT ALL PRIVILEGES ON wine_inventory.* TO 'wine_admin'@'localhost';
FLUSH PRIVILEGES;

-- Beenden
EXIT;
```

### Option B: Mit mysql -u root -p

Falls Ihr MySQL-Root ein Passwort hat:

```bash
mysql -u root -p
```

Dann dieselben SQL-Befehle wie oben ausführen.

## Schritt 4: Datenbankschema importieren

### Methode 1: Mit temporärer Konfigurationsdatei (sicher)

```bash
cd /pfad/zu/Wein_Regal

# Temporäre MySQL-Konfiguration erstellen
cat > /tmp/mysql-temp.cnf <<EOF
[client]
user=wine_admin
password=IhrSicheresPasswort
host=localhost
EOF

chmod 600 /tmp/mysql-temp.cnf

# Schema importieren
mysql --defaults-extra-file=/tmp/mysql-temp.cnf wine_inventory < database/schema.sql

# Temporäre Datei löschen
rm /tmp/mysql-temp.cnf
```

### Methode 2: Mit direkter Passwortübergabe

```bash
mysql -u wine_admin -p wine_inventory < database/schema.sql
# Passwort eingeben wenn gefragt
```

## Schritt 5: .env-Datei erstellen

```bash
cd /pfad/zu/Wein_Regal

cat > .env <<EOF
# Datenbank-Konfiguration
DB_HOST=localhost
DB_USER=wine_admin
DB_PASSWORD=IhrSicheresPasswort
DB_NAME=wine_inventory

# Server-Konfiguration
PORT=3000
NODE_ENV=production

# MQTT-Konfiguration (Optional)
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_ENABLED=false
EOF

chmod 600 .env
```

## Schritt 6: Node.js-Abhängigkeiten installieren

```bash
cd backend
npm install --production
cd ..
```

## Schritt 7: Anwendung testen

```bash
cd backend
node server.js
```

Die Anwendung sollte nun starten. Öffnen Sie im Browser:
```
http://localhost:3000
```

Wenn alles funktioniert, drücken Sie `Strg+C` um den Server zu stoppen.

## Schritt 8: Systemd-Service einrichten (optional)

### Service-Datei erstellen

```bash
sudo nano /etc/systemd/system/wine-inventory.service
```

Inhalt:

```ini
[Unit]
Description=Weinregal-Verwaltung Web-Anwendung
After=network.target mysql.service

[Service]
Type=simple
User=IhrBenutzername
WorkingDirectory=/pfad/zu/Wein_Regal/backend
Environment="NODE_ENV=production"
EnvironmentFile=/pfad/zu/Wein_Regal/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Wichtig:** Ersetzen Sie:
- `IhrBenutzername` mit Ihrem tatsächlichen Benutzernamen
- `/pfad/zu/Wein_Regal` mit dem vollständigen Pfad

### Service aktivieren und starten

```bash
sudo systemctl daemon-reload
sudo systemctl enable wine-inventory
sudo systemctl start wine-inventory

# Status prüfen
sudo systemctl status wine-inventory

# Logs anzeigen
sudo journalctl -u wine-inventory -f
```

## Fehlerbehebung

### Problem: "Access denied for user 'wine_admin'"

**Lösung 1:** Authentifizierungsmethode prüfen

```bash
sudo mysql

SELECT user, host, plugin FROM mysql.user WHERE user='wine_admin';

-- Falls plugin nicht 'mysql_native_password' ist:
ALTER USER 'wine_admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'IhrPasswort';
FLUSH PRIVILEGES;
EXIT;
```

**Lösung 2:** Benutzer neu erstellen

```bash
sudo mysql

DROP USER IF EXISTS 'wine_admin'@'localhost';
CREATE USER 'wine_admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'NeuesPasswort';
GRANT ALL PRIVILEGES ON wine_inventory.* TO 'wine_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Problem: "Can't connect to MySQL server"

```bash
# MySQL-Status prüfen
sudo systemctl status mysql

# MySQL starten falls gestoppt
sudo systemctl start mysql

# MySQL-Logs prüfen
sudo journalctl -u mysql -n 50
```

### Problem: Port 3000 bereits belegt

```bash
# Prozess finden
sudo lsof -i :3000

# In .env einen anderen Port eintragen
nano .env
# PORT=3001

# Anwendung neu starten
sudo systemctl restart wine-inventory
```

### Problem: "Cannot find module 'express'"

```bash
cd backend
rm -rf node_modules
npm install
```

## Verbindung testen

### Datenbank-Verbindung testen

```bash
mysql -u wine_admin -p -e "USE wine_inventory; SHOW TABLES;"
```

### API testen

```bash
# Server muss laufen
curl http://localhost:3000/api/health

# Sollte zurückgeben:
# {"status":"ok","database":"connected","timestamp":"..."}
```

## Weitere Konfiguration

### Firewall öffnen (für Zugriff von anderen Geräten)

```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

### MQTT-Broker installieren (optional)

```bash
sudo apt-get install -y mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Testen
mosquitto_sub -t "wine/#" -v
```

### Nginx als Reverse Proxy (optional, für HTTPS)

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Nginx-Konfiguration
sudo nano /etc/nginx/sites-available/wine-inventory
```

Inhalt:

```nginx
server {
    listen 80;
    server_name ihre-domain.de;

    location / {
        proxy_pass http://localhost:3000;
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

```bash
# Aktivieren
sudo ln -s /etc/nginx/sites-available/wine-inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL-Zertifikat (Let's Encrypt)
sudo certbot --nginx -d ihre-domain.de
```

## Backup erstellen

```bash
# Datenbank-Backup
mysqldump -u wine_admin -p wine_inventory > backup_$(date +%Y%m%d_%H%M%S).sql

# Vollständiges Backup
tar -czf wine_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    .env \
    backend/ \
    frontend/ \
    database/
```

## Restore aus Backup

```bash
# Datenbank wiederherstellen
mysql -u wine_admin -p wine_inventory < backup_20250129_123456.sql
```

## Support

Bei weiteren Problemen:
1. Logs prüfen: `sudo journalctl -u wine-inventory -n 100`
2. MySQL-Logs prüfen: `sudo journalctl -u mysql -n 100`
3. Datenbankverbindung testen (siehe oben)
4. GitHub Issues erstellen mit Fehlermeldungen

---

Nach erfolgreicher Installation sollte die Anwendung unter http://localhost:3000 erreichbar sein! 🍷
