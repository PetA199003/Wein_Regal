// API-Konfiguration
const API_BASE_URL = window.location.origin + '/api';

// API-Helper
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API-Fehler');
            }

            return data;
        } catch (error) {
            console.error('API-Fehler:', error);
            throw error;
        }
    },

    // Weine
    async getWines(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/wines${queryString ? '?' + queryString : ''}`);
    },

    async getWine(id) {
        return this.request(`/wines/${id}`);
    },

    async createWine(wineData) {
        return this.request('/wines', {
            method: 'POST',
            body: JSON.stringify(wineData)
        });
    },

    async updateWine(id, wineData) {
        return this.request(`/wines/${id}`, {
            method: 'PUT',
            body: JSON.stringify(wineData)
        });
    },

    async deleteWine(id) {
        return this.request(`/wines/${id}`, {
            method: 'DELETE'
        });
    },

    // Regal
    async getRacksOverview() {
        return this.request('/wines/racks/overview');
    },

    async assignPosition(positionData) {
        return this.request('/wines/positions', {
            method: 'POST',
            body: JSON.stringify(positionData)
        });
    },

    // LED/MQTT
    async highlightWine(id) {
        return this.request(`/wines/${id}/highlight`, {
            method: 'POST'
        });
    },

    async turnOffLEDs() {
        return this.request('/wines/leds/off', {
            method: 'POST'
        });
    },

    // Statistiken
    async getStats() {
        return this.request('/wines/stats/overview');
    },

    // Verkostungsnotizen
    async addTastingNote(wineId, noteData) {
        return this.request(`/wines/${wineId}/tasting`, {
            method: 'POST',
            body: JSON.stringify(noteData)
        });
    }
};
