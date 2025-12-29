#!/bin/bash

# Weinregal-Verwaltung - Ubuntu Installationsskript
# Dieses Skript installiert alle notwendigen Abhängigkeiten und richtet die Anwendung ein

set -e  # Bei Fehlern abbrechen

# Farben für Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║   🍷 Weinregal-Verwaltung Installation   ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Root-Rechte prüfen
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Dieses Skript muss als root ausgeführt werden"
        echo "Bitte führen Sie es mit 'sudo ./install-ubuntu.sh' aus"
        exit 1
    fi
}

# System aktualisieren
update_system() {
    print_info "System wird aktualisiert..."
    apt-get update -qq
    print_success "System aktualisiert"
}

# Node.js installieren
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js ist bereits installiert ($NODE_VERSION)"
    else
        print_info "Node.js wird installiert..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        print_success "Node.js $(node -v) installiert"
    fi
}

# MySQL installieren
install_mysql() {
    if command -v mysql &> /dev/null; then
        print_success "MySQL ist bereits installiert"
    else
        print_info "MySQL wird installiert..."
        apt-get install -y mysql-server
        systemctl start mysql
        systemctl enable mysql
        print_success "MySQL installiert und gestartet"
    fi
}

# Datenbank konfigurieren
configure_database() {
    print_info "Datenbank wird konfiguriert..."

    # Datenbank-Passwort abfragen
    echo ""
    read -sp "Geben Sie ein Passwort für den Datenbankbenutzer 'wine_admin' ein: " DB_PASSWORD
    echo ""
    read -sp "Passwort bestätigen: " DB_PASSWORD_CONFIRM
    echo ""

    if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
        print_error "Passwörter stimmen nicht überein!"
        exit 1
    fi

    # Prüfen ob MySQL-Root ein Passwort benötigt
    if mysql -u root -e "SELECT 1;" &>/dev/null; then
        MYSQL_ROOT_CMD="mysql -u root"
    else
        print_info "MySQL-Root benötigt ein Passwort"
        MYSQL_ROOT_CMD="sudo mysql"
    fi

    # MySQL-Befehle ausführen
    print_info "Erstelle Datenbank und Benutzer..."
    $MYSQL_ROOT_CMD <<EOF
-- Benutzer löschen falls vorhanden (für Neuinstallation)
DROP USER IF EXISTS 'wine_admin'@'localhost';

-- Benutzer mit expliziter Authentifizierungsmethode erstellen
CREATE USER 'wine_admin'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';

-- Datenbank erstellen
DROP DATABASE IF EXISTS wine_inventory;
CREATE DATABASE wine_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rechte vergeben
GRANT ALL PRIVILEGES ON wine_inventory.* TO 'wine_admin'@'localhost';
FLUSH PRIVILEGES;
EOF

    if [ $? -ne 0 ]; then
        print_error "Fehler beim Erstellen der Datenbank"
        exit 1
    fi

    print_success "Datenbank und Benutzer erstellt"

    # Schema importieren mit sicherer Passwortübergabe
    if [ -f "database/schema.sql" ]; then
        print_info "Importiere Datenbankschema..."

        # Temporäre MySQL-Konfigurationsdatei erstellen
        MYSQL_CNF=$(mktemp)
        cat > "$MYSQL_CNF" <<EOF
[client]
user=wine_admin
password=$DB_PASSWORD
host=localhost
EOF
        chmod 600 "$MYSQL_CNF"

        # Schema importieren
        mysql --defaults-extra-file="$MYSQL_CNF" wine_inventory < database/schema.sql

        if [ $? -eq 0 ]; then
            print_success "Datenbankschema erfolgreich importiert"
        else
            print_error "Fehler beim Importieren des Schemas"
            rm -f "$MYSQL_CNF"
            exit 1
        fi

        # Temporäre Datei löschen
        rm -f "$MYSQL_CNF"
    else
        print_warning "Datenbankschema-Datei nicht gefunden"
    fi

    # .env-Datei erstellen
    cat > .env <<EOF
# Datenbank-Konfiguration
DB_HOST=localhost
DB_USER=wine_admin
DB_PASSWORD=$DB_PASSWORD
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
    print_success "Datenbank konfiguriert"
}

# NPM-Pakete installieren
install_dependencies() {
    print_info "Node.js-Abhängigkeiten werden installiert..."
    cd backend
    npm install --production
    cd ..
    print_success "Abhängigkeiten installiert"
}

# Systemd-Service erstellen
create_systemd_service() {
    print_info "Systemd-Service wird erstellt..."

    INSTALL_DIR=$(pwd)
    CURRENT_USER=${SUDO_USER:-$USER}

    cat > /etc/systemd/system/wine-inventory.service <<EOF
[Unit]
Description=Weinregal-Verwaltung Web-Anwendung
After=network.target mysql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="NODE_ENV=production"
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    print_success "Systemd-Service erstellt"
}

# Firewall konfigurieren (optional)
configure_firewall() {
    if command -v ufw &> /dev/null; then
        print_info "Möchten Sie die Firewall konfigurieren? (j/n)"
        read -r CONFIGURE_FW

        if [ "$CONFIGURE_FW" = "j" ] || [ "$CONFIGURE_FW" = "J" ]; then
            ufw allow 3000/tcp
            print_success "Firewall konfiguriert (Port 3000 geöffnet)"
        fi
    fi
}

# MQTT-Broker installieren (optional)
install_mqtt() {
    print_info "Möchten Sie einen MQTT-Broker (Mosquitto) installieren? (j/n)"
    read -r INSTALL_MQTT

    if [ "$INSTALL_MQTT" = "j" ] || [ "$INSTALL_MQTT" = "J" ]; then
        apt-get install -y mosquitto mosquitto-clients
        systemctl start mosquitto
        systemctl enable mosquitto
        print_success "MQTT-Broker (Mosquitto) installiert und gestartet"
    fi
}

# Service starten
start_service() {
    print_info "Dienst wird gestartet..."
    systemctl enable wine-inventory
    systemctl start wine-inventory

    if systemctl is-active --quiet wine-inventory; then
        print_success "Dienst erfolgreich gestartet"
    else
        print_error "Fehler beim Starten des Dienstes"
        print_info "Logs anzeigen mit: sudo journalctl -u wine-inventory -f"
        exit 1
    fi
}

# Zusammenfassung anzeigen
show_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║   Installation erfolgreich abgeschlossen!║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Die Weinregal-Verwaltung läuft nun auf:"
    echo -e "${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "Nützliche Befehle:"
    echo "  Status prüfen:      sudo systemctl status wine-inventory"
    echo "  Dienst stoppen:     sudo systemctl stop wine-inventory"
    echo "  Dienst starten:     sudo systemctl start wine-inventory"
    echo "  Dienst neustarten:  sudo systemctl restart wine-inventory"
    echo "  Logs anzeigen:      sudo journalctl -u wine-inventory -f"
    echo ""
    echo "Konfigurationsdatei: $(pwd)/.env"
    echo ""
}

# Hauptprogramm
main() {
    print_header

    check_root
    update_system
    install_nodejs
    install_mysql
    configure_database
    install_dependencies
    create_systemd_service
    configure_firewall
    install_mqtt
    start_service
    show_summary
}

# Skript ausführen
main
