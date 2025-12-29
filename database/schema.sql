-- Weinregal Datenbank Schema
-- Erstellt: 2025-12-29

CREATE DATABASE IF NOT EXISTS wine_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wine_inventory;

-- Tabelle für Regalstrukturen
CREATE TABLE IF NOT EXISTS racks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rows INT NOT NULL DEFAULT 1,
    columns INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle für Weinflaschen
CREATE TABLE IF NOT EXISTS wines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    producer VARCHAR(255),
    region VARCHAR(255),
    country VARCHAR(100),
    vintage_year INT,
    grape_variety VARCHAR(255),
    wine_type ENUM('Rot', 'Weiß', 'Rosé', 'Schaumwein', 'Dessertwein') NOT NULL,
    bottle_size VARCHAR(50) DEFAULT '0.75L',
    alcohol_content DECIMAL(4,2),
    purchase_location VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    quantity INT DEFAULT 1,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    tasting_notes TEXT,
    food_pairing TEXT,
    optimal_drinking_from INT,
    optimal_drinking_to INT,
    image_url VARCHAR(500),
    barcode VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_wine_type (wine_type),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle für Regalpositionen
CREATE TABLE IF NOT EXISTS rack_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rack_id INT NOT NULL,
    wine_id INT,
    row_number INT NOT NULL,
    column_number INT NOT NULL,
    position_label VARCHAR(50),
    mqtt_topic VARCHAR(255),
    led_address VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rack_id) REFERENCES racks(id) ON DELETE CASCADE,
    FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE SET NULL,
    UNIQUE KEY unique_position (rack_id, row_number, column_number),
    INDEX idx_wine_id (wine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle für Kaufhistorie
CREATE TABLE IF NOT EXISTS purchase_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wine_id INT NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_location VARCHAR(255),
    quantity INT NOT NULL,
    price_per_bottle DECIMAL(10,2),
    total_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE CASCADE,
    INDEX idx_purchase_date (purchase_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle für Verkostungsnotizen
CREATE TABLE IF NOT EXISTS tasting_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wine_id INT NOT NULL,
    tasting_date DATE NOT NULL,
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    appearance TEXT,
    aroma TEXT,
    taste TEXT,
    finish TEXT,
    overall_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE CASCADE,
    INDEX idx_tasting_date (tasting_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabelle für MQTT-Konfiguration
CREATE TABLE IF NOT EXISTS mqtt_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    broker_url VARCHAR(255) NOT NULL,
    broker_port INT DEFAULT 1883,
    username VARCHAR(100),
    password VARCHAR(100),
    client_id VARCHAR(100),
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Beispieldaten einfügen
INSERT INTO racks (name, rows, columns, description) VALUES
('Hauptregal', 5, 6, 'Hauptweinregal im Keller'),
('Kleines Regal', 3, 4, 'Zusätzliches Regal');

-- Beispiel MQTT-Konfiguration
INSERT INTO mqtt_config (broker_url, broker_port, enabled) VALUES
('localhost', 1883, FALSE);

-- Ansicht für schnellen Überblick
CREATE OR REPLACE VIEW wine_inventory_overview AS
SELECT
    w.id,
    w.name,
    w.producer,
    w.wine_type,
    w.vintage_year,
    w.quantity,
    w.rating,
    w.purchase_price,
    GROUP_CONCAT(CONCAT(r.name, ' - ', 'Reihe ', rp.row_number, ', Spalte ', rp.column_number) SEPARATOR '; ') AS positions
FROM wines w
LEFT JOIN rack_positions rp ON w.id = rp.wine_id
LEFT JOIN racks r ON rp.rack_id = r.id
GROUP BY w.id;
