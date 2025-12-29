const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { highlightWinePosition, turnOffAllLEDs } = require('../mqtt');

// Alle Weine abrufen mit Filteroptionen
router.get('/', async (req, res) => {
    try {
        const { type, min_rating, search } = req.query;
        let query = 'SELECT * FROM wine_inventory_overview WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND wine_type = ?';
            params.push(type);
        }

        if (min_rating) {
            query += ' AND rating >= ?';
            params.push(parseFloat(min_rating));
        }

        if (search) {
            query += ' AND (name LIKE ? OR producer LIKE ? OR region LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY name';

        const [wines] = await pool.query(query, params);
        res.json(wines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Einzelnen Wein abrufen
router.get('/:id', async (req, res) => {
    try {
        const [wines] = await pool.query('SELECT * FROM wines WHERE id = ?', [req.params.id]);

        if (wines.length === 0) {
            return res.status(404).json({ error: 'Wein nicht gefunden' });
        }

        // Positionen abrufen
        const [positions] = await pool.query(
            `SELECT rp.*, r.name as rack_name
             FROM rack_positions rp
             JOIN racks r ON rp.rack_id = r.id
             WHERE rp.wine_id = ?`,
            [req.params.id]
        );

        // Verkostungsnotizen abrufen
        const [tastings] = await pool.query(
            'SELECT * FROM tasting_notes WHERE wine_id = ? ORDER BY tasting_date DESC',
            [req.params.id]
        );

        const wine = wines[0];
        wine.positions = positions;
        wine.tasting_history = tastings;

        res.json(wine);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Neuen Wein anlegen
router.post('/', async (req, res) => {
    try {
        const {
            name, producer, region, country, vintage_year, grape_variety,
            wine_type, bottle_size, alcohol_content, purchase_location,
            purchase_date, purchase_price, current_price, quantity, rating,
            tasting_notes, food_pairing, optimal_drinking_from,
            optimal_drinking_to, image_url, barcode, notes
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO wines (
                name, producer, region, country, vintage_year, grape_variety,
                wine_type, bottle_size, alcohol_content, purchase_location,
                purchase_date, purchase_price, current_price, quantity, rating,
                tasting_notes, food_pairing, optimal_drinking_from,
                optimal_drinking_to, image_url, barcode, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, producer, region, country, vintage_year, grape_variety,
                wine_type, bottle_size, alcohol_content, purchase_location,
                purchase_date, purchase_price, current_price, quantity, rating,
                tasting_notes, food_pairing, optimal_drinking_from,
                optimal_drinking_to, image_url, barcode, notes
            ]
        );

        res.status(201).json({
            id: result.insertId,
            message: 'Wein erfolgreich angelegt'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Wein aktualisieren
router.put('/:id', async (req, res) => {
    try {
        const fields = [];
        const values = [];

        // Dynamisch nur die übergebenen Felder aktualisieren
        const allowedFields = [
            'name', 'producer', 'region', 'country', 'vintage_year', 'grape_variety',
            'wine_type', 'bottle_size', 'alcohol_content', 'purchase_location',
            'purchase_date', 'purchase_price', 'current_price', 'quantity', 'rating',
            'tasting_notes', 'food_pairing', 'optimal_drinking_from',
            'optimal_drinking_to', 'image_url', 'barcode', 'notes'
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'Keine zu aktualisierenden Felder angegeben' });
        }

        values.push(req.params.id);
        const [result] = await pool.query(
            `UPDATE wines SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Wein nicht gefunden' });
        }

        res.json({ message: 'Wein erfolgreich aktualisiert' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Wein löschen
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM wines WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Wein nicht gefunden' });
        }

        res.json({ message: 'Wein erfolgreich gelöscht' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Regalübersicht abrufen
router.get('/racks/overview', async (req, res) => {
    try {
        const [racks] = await pool.query('SELECT * FROM racks');
        const racksWithPositions = [];

        for (const rack of racks) {
            const [positions] = await pool.query(
                `SELECT rp.*, w.name as wine_name, w.wine_type, w.vintage_year
                 FROM rack_positions rp
                 LEFT JOIN wines w ON rp.wine_id = w.id
                 WHERE rp.rack_id = ?
                 ORDER BY rp.row_number, rp.column_number`,
                [rack.id]
            );

            racksWithPositions.push({
                ...rack,
                positions: positions
            });
        }

        res.json(racksWithPositions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Position zuweisen
router.post('/positions', async (req, res) => {
    try {
        const { rack_id, wine_id, row_number, column_number, position_label, mqtt_topic, led_address } = req.body;

        const [result] = await pool.query(
            `INSERT INTO rack_positions (rack_id, wine_id, row_number, column_number, position_label, mqtt_topic, led_address)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE wine_id = ?, position_label = ?, mqtt_topic = ?, led_address = ?`,
            [rack_id, wine_id, row_number, column_number, position_label, mqtt_topic, led_address,
             wine_id, position_label, mqtt_topic, led_address]
        );

        res.status(201).json({
            message: 'Position erfolgreich zugewiesen',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LED-Anzeige für Wein aktivieren
router.post('/:id/highlight', async (req, res) => {
    try {
        const result = await highlightWinePosition(req.params.id);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Alle LEDs ausschalten
router.post('/leds/off', async (req, res) => {
    try {
        const result = turnOffAllLEDs();
        res.json({
            success: result,
            message: result ? 'LEDs ausgeschaltet' : 'MQTT nicht verfügbar'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verkostungsnotiz hinzufügen
router.post('/:id/tasting', async (req, res) => {
    try {
        const { tasting_date, rating, appearance, aroma, taste, finish, overall_notes } = req.body;

        const [result] = await pool.query(
            `INSERT INTO tasting_notes (wine_id, tasting_date, rating, appearance, aroma, taste, finish, overall_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, tasting_date, rating, appearance, aroma, taste, finish, overall_notes]
        );

        // Durchschnittliche Bewertung aktualisieren
        const [avgResult] = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM tasting_notes WHERE wine_id = ?',
            [req.params.id]
        );

        if (avgResult[0].avg_rating) {
            await pool.query(
                'UPDATE wines SET rating = ? WHERE id = ?',
                [avgResult[0].avg_rating, req.params.id]
            );
        }

        res.status(201).json({
            message: 'Verkostungsnotiz erfolgreich hinzugefügt',
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistiken abrufen
router.get('/stats/overview', async (req, res) => {
    try {
        const [totalWines] = await pool.query('SELECT COUNT(*) as count FROM wines');
        const [totalBottles] = await pool.query('SELECT SUM(quantity) as total FROM wines');
        const [byType] = await pool.query(
            'SELECT wine_type, COUNT(*) as count, SUM(quantity) as bottles FROM wines GROUP BY wine_type'
        );
        const [topRated] = await pool.query(
            'SELECT name, producer, rating FROM wines WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 5'
        );
        const [totalValue] = await pool.query(
            'SELECT SUM(current_price * quantity) as total FROM wines WHERE current_price IS NOT NULL'
        );

        res.json({
            total_wines: totalWines[0].count,
            total_bottles: totalBottles[0].total || 0,
            by_type: byType,
            top_rated: topRated,
            total_value: totalValue[0].total || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
