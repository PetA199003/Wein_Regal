# 🍷 Weinregal-Verwaltung

Eine moderne, responsive Web-Anwendung zur Verwaltung Ihrer Weinsammlung mit optionaler MQTT-Integration für LED-Anzeige der Flaschenposition.

## ✨ Features

### Kernfunktionen
- **Inventarverwaltung**: Vollständige Verwaltung Ihrer Weinsammlung
- **Detaillierte Informationen**: Name, Produzent, Region, Jahrgang, Rebsorte, Typ, etc.
- **Positionsverfolgung**: Genaue Regalposition jeder Flasche
- **Kaufinformationen**: Kaufort, -datum, -preis
- **Bewertungssystem**: 5-Sterne-Bewertung mit Verkostungsnotizen
- **Responsive Design**: Optimiert für Desktop, Tablet und Smartphone (iPhone, etc.)
- **Suchfunktion**: Schnelle Suche nach Name, Produzent oder Region
- **Filter**: Nach Weintyp und Bewertung filtern
- **Statistiken**: Übersicht über Ihre Sammlung, Gesamtwert, etc.

### Regalverwaltung
- **Visuelle Regalansicht**: Grafische Darstellung Ihrer Weinregale
- **Mehrere Regale**: Unbegrenzte Anzahl von Regalen
- **Flexible Größen**: Konfigurierbare Reihen und Spalten
- **Schnellzugriff**: Direkter Zugriff auf Weindetails aus der Regalansicht

### MQTT-Integration (Optional)
- **LED-Anzeige**: Zeigen Sie die Position einer Flasche per LED an
- **Broker-Unterstützung**: Verbindung zu jedem MQTT-Broker
- **Flexible Topics**: Konfigurierbare MQTT-Topics pro Position
- **Auto-Discovery**: Automatische Generierung von Standard-Topics

### Technologie-Stack
- **Backend**: Node.js mit Express
- **Frontend**: Vue.js 3 mit modernem, mobilem Design
- **Datenbank**: MySQL mit UTF-8 Unterstützung
- **MQTT**: mqtt.js für IoT-Integration
- **Responsive**: Mobile-first Design mit CSS Grid/Flexbox

## 📋 Voraussetzungen

- **Ubuntu** 20.04 oder neuer (oder kompatible Linux-Distribution)
- **Root-Zugriff** oder sudo-Rechte
- **Internetverbindung** für die Installation

## 🚀 Installation

### Automatische Installation (empfohlen)

1. Repository klonen oder herunterladen:
```bash
git clone <repository-url>
cd Wein_Regal
```

2. Installationsskript ausführen:
```bash
sudo ./install-ubuntu.sh
```

Das Skript wird automatisch:
- Node.js installieren
- MySQL installieren und konfigurieren
- Datenbank einrichten
- Alle Abhängigkeiten installieren
- Systemd-Service erstellen
- Anwendung starten

3. Nach der Installation ist die Anwendung verfügbar unter:
```
http://localhost:3000
```

### Manuelle Installation

#### 1. Node.js installieren
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

#### 2. MySQL installieren
```bash
sudo apt-get install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 3. Datenbank einrichten
```bash
# MySQL-Client starten
sudo mysql -u root

# Datenbank und Benutzer erstellen
CREATE USER 'wine_admin'@'localhost' IDENTIFIED BY 'IhrPasswort';
CREATE DATABASE wine_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON wine_inventory.* TO 'wine_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Schema importieren
mysql -u wine_admin -p wine_inventory < database/schema.sql
```

#### 4. Konfiguration erstellen
```bash
cp .env.example .env
# Bearbeiten Sie .env und tragen Sie Ihre Datenbankzugangsdaten ein
nano .env
```

#### 5. Abhängigkeiten installieren
```bash
cd backend
npm install
```

#### 6. Anwendung starten
```bash
npm start
```

## 🔧 Konfiguration

### Datenbank (.env)
```env
DB_HOST=localhost
DB_USER=wine_admin
DB_PASSWORD=IhrPasswort
DB_NAME=wine_inventory
```

### Server
```env
PORT=3000
NODE_ENV=production
```

### MQTT (Optional)
```env
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_ENABLED=false
```

Die MQTT-Konfiguration kann auch über die Web-Oberfläche vorgenommen werden.

## 📱 Benutzung

### Wein hinzufügen
1. Klicken Sie auf "Wein hinzufügen" in der Navigation
2. Füllen Sie die Formulardaten aus
3. Klicken Sie auf "Speichern"

### Wein suchen
1. Verwenden Sie die Suchleiste am oberen Bildschirmrand
2. Geben Sie Name, Produzent oder Region ein
3. Nutzen Sie die Filter für Weintyp und Bewertung

### Regalansicht
1. Wechseln Sie zur "Regal"-Ansicht
2. Sehen Sie eine grafische Darstellung Ihrer Regale
3. Klicken Sie auf eine Position für Details

### LED-Anzeige aktivieren (MQTT)
1. Öffnen Sie die Weindetails
2. Klicken Sie auf "Position anzeigen (LED)"
3. Die zugehörige LED wird aktiviert

## 🛠️ Systemverwaltung

### Service-Befehle
```bash
# Status prüfen
sudo systemctl status wine-inventory

# Dienst stoppen
sudo systemctl stop wine-inventory

# Dienst starten
sudo systemctl start wine-inventory

# Dienst neustarten
sudo systemctl restart wine-inventory

# Logs anzeigen
sudo journalctl -u wine-inventory -f
```

### Backup erstellen
```bash
# Datenbank-Backup
mysqldump -u wine_admin -p wine_inventory > backup_$(date +%Y%m%d).sql

# Gesamtes System-Backup
tar -czf wine_backup_$(date +%Y%m%d).tar.gz .
```

### Datenbank wiederherstellen
```bash
mysql -u wine_admin -p wine_inventory < backup_YYYYMMDD.sql
```

## 🌐 Zugriff von anderen Geräten

### Im lokalen Netzwerk
1. Server-IP-Adresse ermitteln:
```bash
hostname -I
```

2. Von anderen Geräten aus aufrufen:
```
http://<server-ip>:3000
```

3. Firewall-Regel hinzufügen (falls nötig):
```bash
sudo ufw allow 3000/tcp
```

### Reverse Proxy mit Nginx (für HTTPS)
```bash
sudo apt-get install nginx

# Nginx-Konfiguration erstellen
sudo nano /etc/nginx/sites-available/wine-inventory
```

Beispiel-Konfiguration:
```nginx
server {
    listen 80;
    server_name ihr-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Konfiguration aktivieren
sudo ln -s /etc/nginx/sites-available/wine-inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔌 MQTT / LED-Integration

### MQTT-Broker installieren (Mosquitto)
```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

### Topic-Struktur
Die Anwendung verwendet folgende Topic-Struktur:
```
wine/rack/{rack_id}/row/{row_number}/col/{column_number}
```

Beispiel-Payload:
```json
{
  "action": "highlight",
  "wine_id": 123,
  "position": {
    "rack": "Hauptregal",
    "row": 3,
    "column": 5
  },
  "led_address": "0x15",
  "timestamp": "2025-12-29T10:30:00Z"
}
```

### ESP32/Arduino-Integration
Ein Beispiel für einen ESP32-basierten LED-Controller:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <FastLED.h>

const char* ssid = "IhrWiFi";
const char* password = "IhrPasswort";
const char* mqtt_server = "192.168.1.100";

WiFiClient espClient;
PubSubClient client(espClient);

#define NUM_LEDS 30
#define DATA_PIN 5
CRGB leds[NUM_LEDS];

void callback(char* topic, byte* payload, unsigned int length) {
  // JSON parsen und LED ansteuern
  // Implementierung je nach Hardware
}

void setup() {
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);
  // WiFi und MQTT-Verbindung einrichten
  client.setCallback(callback);
  client.subscribe("wine/#");
}
```

## 📊 API-Dokumentation

Die Anwendung bietet eine REST-API:

### Weine
- `GET /api/wines` - Alle Weine abrufen
- `GET /api/wines/:id` - Einzelnen Wein abrufen
- `POST /api/wines` - Neuen Wein anlegen
- `PUT /api/wines/:id` - Wein aktualisieren
- `DELETE /api/wines/:id` - Wein löschen

### Regal
- `GET /api/wines/racks/overview` - Regalübersicht
- `POST /api/wines/positions` - Position zuweisen

### LED/MQTT
- `POST /api/wines/:id/highlight` - LED aktivieren
- `POST /api/wines/leds/off` - Alle LEDs ausschalten

### Statistiken
- `GET /api/wines/stats/overview` - Statistiken abrufen

## 🐛 Fehlerbehebung

### Dienst startet nicht
```bash
# Logs prüfen
sudo journalctl -u wine-inventory -n 50

# Konfiguration prüfen
cd backend && node server.js
```

### Datenbankverbindung fehlgeschlagen
```bash
# MySQL-Status prüfen
sudo systemctl status mysql

# Verbindung testen
mysql -u wine_admin -p -e "USE wine_inventory; SHOW TABLES;"
```

### Port bereits belegt
```bash
# Prozess auf Port 3000 finden
sudo lsof -i :3000

# Port in .env ändern
nano .env
# PORT=3001
sudo systemctl restart wine-inventory
```

## 🔒 Sicherheit

### Produktionsumgebung
- Ändern Sie alle Standard-Passwörter
- Verwenden Sie HTTPS (Nginx mit Let's Encrypt)
- Beschränken Sie Datenbankzugriff auf localhost
- Aktivieren Sie die Firewall
- Halten Sie das System aktualisiert

### Benutzer-Authentifizierung (zukünftig)
Die aktuelle Version hat keine Benutzer-Authentifizierung. Für den Produktionseinsatz im Internet sollte eine Authentifizierung implementiert werden.

## 📝 Lizenz

MIT License - Freie Nutzung für private und kommerzielle Zwecke

## 🤝 Beitragen

Feedback und Beiträge sind willkommen! Öffnen Sie ein Issue oder Pull Request.

## 📧 Support

Bei Fragen oder Problemen:
- GitHub Issues erstellen
- Logs prüfen: `sudo journalctl -u wine-inventory -f`

## 🎯 Roadmap

Geplante Features:
- [ ] Benutzer-Authentifizierung
- [ ] Mehrsprachigkeit (Deutsch/Englisch)
- [ ] Import/Export (CSV, Excel)
- [ ] Barcode-Scanner-Integration
- [ ] Weinempfehlungen basierend auf Bewertungen
- [ ] Mobile Apps (iOS/Android)
- [ ] Erweiterte Statistiken und Charts
- [ ] Teilen von Weinen mit Freunden
- [ ] Integration mit Wein-APIs (Vivino, etc.)

---

Viel Spaß mit Ihrer digitalen Weinverwaltung! 🍷
