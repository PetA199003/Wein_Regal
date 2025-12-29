const mqtt = require('mqtt');
const { pool } = require('./database');

let mqttClient = null;
let isEnabled = false;

// MQTT-Client initialisieren
async function initializeMQTT() {
    try {
        // MQTT-Konfiguration aus Datenbank laden
        const [rows] = await pool.query('SELECT * FROM mqtt_config WHERE id = 1');

        if (rows.length === 0 || !rows[0].enabled) {
            console.log('MQTT ist deaktiviert');
            return null;
        }

        const config = rows[0];
        isEnabled = config.enabled;

        const options = {
            clientId: config.client_id || `wine_inventory_${Math.random().toString(16).substr(2, 8)}`,
            clean: true,
            reconnectPeriod: 5000,
        };

        if (config.username) {
            options.username = config.username;
            options.password = config.password;
        }

        const brokerUrl = `mqtt://${config.broker_url}:${config.broker_port}`;
        mqttClient = mqtt.connect(brokerUrl, options);

        mqttClient.on('connect', () => {
            console.log('✓ MQTT-Broker verbunden');
        });

        mqttClient.on('error', (error) => {
            console.error('MQTT-Fehler:', error.message);
        });

        mqttClient.on('reconnect', () => {
            console.log('MQTT-Verbindung wird wiederhergestellt...');
        });

        return mqttClient;

    } catch (error) {
        console.error('MQTT-Initialisierung fehlgeschlagen:', error.message);
        return null;
    }
}

// LED für Weinposition einschalten
async function highlightWinePosition(wineId) {
    if (!mqttClient || !isEnabled) {
        return { success: false, message: 'MQTT nicht aktiviert' };
    }

    try {
        // Positionen des Weins abrufen
        const [positions] = await pool.query(
            `SELECT rp.*, r.name as rack_name
             FROM rack_positions rp
             JOIN racks r ON rp.rack_id = r.id
             WHERE rp.wine_id = ?`,
            [wineId]
        );

        if (positions.length === 0) {
            return { success: false, message: 'Keine Position gefunden' };
        }

        const results = [];
        for (const position of positions) {
            const topic = position.mqtt_topic || `wine/rack/${position.rack_id}/row/${position.position_row}/col/${position.position_column}`;
            const payload = JSON.stringify({
                action: 'highlight',
                wine_id: wineId,
                position: {
                    rack: position.rack_name,
                    row: position.position_row,
                    column: position.position_column
                },
                led_address: position.led_address,
                timestamp: new Date().toISOString()
            });

            mqttClient.publish(topic, payload, { qos: 1 });
            results.push({ topic, position: position.position_label });
        }

        return {
            success: true,
            message: 'LED-Befehle gesendet',
            positions: results
        };

    } catch (error) {
        console.error('Fehler beim Senden der LED-Befehle:', error.message);
        return { success: false, message: error.message };
    }
}

// LED ausschalten
function turnOffLED(topic) {
    if (!mqttClient || !isEnabled) {
        return false;
    }

    const payload = JSON.stringify({
        action: 'off',
        timestamp: new Date().toISOString()
    });

    mqttClient.publish(topic, payload, { qos: 1 });
    return true;
}

// Alle LEDs ausschalten
function turnOffAllLEDs() {
    if (!mqttClient || !isEnabled) {
        return false;
    }

    const payload = JSON.stringify({
        action: 'off_all',
        timestamp: new Date().toISOString()
    });

    mqttClient.publish('wine/all', payload, { qos: 1 });
    return true;
}

// MQTT-Client beenden
function closeMQTT() {
    if (mqttClient) {
        mqttClient.end();
        console.log('MQTT-Verbindung geschlossen');
    }
}

module.exports = {
    initializeMQTT,
    highlightWinePosition,
    turnOffLED,
    turnOffAllLEDs,
    closeMQTT,
    getClient: () => mqttClient
};
