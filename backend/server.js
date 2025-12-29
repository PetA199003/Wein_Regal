const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./database');
const { initializeMQTT, closeMQTT } = require('./mqtt');
const winesRouter = require('./routes/wines');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Statische Dateien für Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API-Routen
app.use('/api/wines', winesRouter);

// Hauptseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health-Check
app.get('/api/health', async (req, res) => {
    const dbOk = await testConnection();
    res.json({
        status: 'ok',
        database: dbOk ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Fehlerbehandlung
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Interner Serverfehler',
        message: err.message
    });
});

// Server starten
async function startServer() {
    try {
        // Datenbankverbindung testen
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.warn('⚠ Server startet ohne Datenbankverbindung');
        }

        // MQTT initialisieren
        await initializeMQTT();

        // Server starten
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════╗
║   🍷 Weinregal-Verwaltung Server          ║
╚═══════════════════════════════════════════╝

Server läuft auf: http://localhost:${PORT}
API-Endpunkt:     http://localhost:${PORT}/api
Datenbank:        ${dbConnected ? '✓ Verbunden' : '✗ Nicht verbunden'}

Drücke Strg+C zum Beenden
            `);
        });

        // Graceful Shutdown
        process.on('SIGINT', () => {
            console.log('\n\nServer wird beendet...');
            closeMQTT();
            process.exit(0);
        });

    } catch (error) {
        console.error('Fehler beim Starten des Servers:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
