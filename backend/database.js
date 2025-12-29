const mysql = require('mysql2');
require('dotenv').config();

// Connection Pool erstellen
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'wine_admin',
    password: process.env.DB_PASSWORD || 'wine_password',
    database: process.env.DB_NAME || 'wine_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Promise-basierte Schnittstelle
const promisePool = pool.promise();

// Verbindung testen
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✓ Datenbankverbindung erfolgreich hergestellt');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ Datenbankverbindung fehlgeschlagen:', error.message);
        return false;
    }
}

module.exports = {
    pool: promisePool,
    testConnection
};
