const { createApp } = Vue;

createApp({
    data() {
        return {
            // Ansichten
            currentView: 'inventory',

            // Daten
            wines: [],
            filteredWines: [],
            racks: [],
            stats: null,

            // UI-Zustand
            loading: false,
            loadingRacks: false,
            showAddWine: false,
            showFilters: false,
            showStats: false,
            showSettings: false,
            selectedWine: null,
            editingWine: null,

            // Filter und Suche
            searchQuery: '',
            filterType: '',
            filterRating: '',

            // Formular
            wineForm: this.getEmptyWineForm(),

            // Toast-Benachrichtigungen
            toasts: [],
            toastId: 0
        };
    },

    mounted() {
        this.loadWines();
    },

    methods: {
        // Daten laden
        async loadWines() {
            this.loading = true;
            try {
                this.wines = await api.getWines();
                this.applyFilters();
            } catch (error) {
                this.showToast('Fehler beim Laden der Weine', 'error');
            } finally {
                this.loading = false;
            }
        },

        async loadRacks() {
            this.loadingRacks = true;
            try {
                this.racks = await api.getRacksOverview();
            } catch (error) {
                this.showToast('Fehler beim Laden der Regalansicht', 'error');
            } finally {
                this.loadingRacks = false;
            }
        },

        async loadStats() {
            try {
                this.stats = await api.getStats();
            } catch (error) {
                this.showToast('Fehler beim Laden der Statistiken', 'error');
            }
        },

        // Wein-Operationen
        async saveWine() {
            try {
                if (this.editingWine) {
                    await api.updateWine(this.editingWine.id, this.wineForm);
                    this.showToast('Wein erfolgreich aktualisiert', 'success');
                } else {
                    await api.createWine(this.wineForm);
                    this.showToast('Wein erfolgreich hinzugefügt', 'success');
                }

                this.showAddWine = false;
                this.wineForm = this.getEmptyWineForm();
                this.editingWine = null;
                await this.loadWines();
            } catch (error) {
                this.showToast('Fehler beim Speichern: ' + error.message, 'error');
            }
        },

        editWine(wine) {
            this.editingWine = wine;
            this.wineForm = { ...wine };
            this.selectedWine = null;
            this.showAddWine = true;
        },

        async deleteWine(id) {
            if (!confirm('Möchten Sie diesen Wein wirklich löschen?')) {
                return;
            }

            try {
                await api.deleteWine(id);
                this.showToast('Wein erfolgreich gelöscht', 'success');
                this.selectedWine = null;
                await this.loadWines();
            } catch (error) {
                this.showToast('Fehler beim Löschen: ' + error.message, 'error');
            }
        },

        async selectWine(wine) {
            try {
                this.selectedWine = await api.getWine(wine.id);
            } catch (error) {
                this.showToast('Fehler beim Laden der Weindetails', 'error');
            }
        },

        // LED/MQTT
        async highlightWine(wineId) {
            try {
                const result = await api.highlightWine(wineId);
                if (result.success) {
                    this.showToast('LED-Position wird angezeigt', 'success');
                } else {
                    this.showToast(result.message, 'warning');
                }
            } catch (error) {
                this.showToast('Fehler: ' + error.message, 'error');
            }
        },

        // Suche und Filter
        searchWines() {
            this.applyFilters();
        },

        applyFilters() {
            let result = [...this.wines];

            // Textsuche
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                result = result.filter(wine =>
                    wine.name?.toLowerCase().includes(query) ||
                    wine.producer?.toLowerCase().includes(query) ||
                    wine.region?.toLowerCase().includes(query)
                );
            }

            // Weintyp-Filter
            if (this.filterType) {
                result = result.filter(wine => wine.wine_type === this.filterType);
            }

            // Bewertungs-Filter
            if (this.filterRating) {
                const minRating = parseFloat(this.filterRating);
                result = result.filter(wine => wine.rating >= minRating);
            }

            this.filteredWines = result;
        },

        // Regalansicht
        getRackPositions(rack) {
            const positions = [];

            // Alle möglichen Positionen generieren
            for (let row = 1; row <= rack.row_count; row++) {
                for (let col = 1; col <= rack.column_count; col++) {
                    const existingPos = rack.positions?.find(
                        p => p.position_row === row && p.position_column === col
                    );

                    if (existingPos) {
                        positions.push({
                            ...existingPos,
                            key: `${rack.id}-${row}-${col}`
                        });
                    } else {
                        positions.push({
                            rack_id: rack.id,
                            position_row: row,
                            position_column: col,
                            wine_id: null,
                            key: `${rack.id}-${row}-${col}`
                        });
                    }
                }
            }

            return positions;
        },

        handleCellClick(position) {
            if (position.wine_id) {
                // Wein anzeigen
                this.selectWine({ id: position.wine_id });
            } else {
                // Position zuweisen (würde erweitert werden)
                this.showToast('Position-Zuweisung würde hier implementiert', 'info');
            }
        },

        // Hilfsfunktionen
        getEmptyWineForm() {
            return {
                name: '',
                producer: '',
                region: '',
                country: '',
                vintage_year: null,
                grape_variety: '',
                wine_type: 'Rot',
                bottle_size: '0.75L',
                alcohol_content: null,
                purchase_location: '',
                purchase_date: null,
                purchase_price: null,
                current_price: null,
                quantity: 1,
                rating: null,
                tasting_notes: '',
                food_pairing: '',
                optimal_drinking_from: null,
                optimal_drinking_to: null,
                image_url: '',
                barcode: '',
                notes: ''
            };
        },

        formatRating(rating) {
            const stars = Math.round(rating * 2) / 2;
            const fullStars = Math.floor(stars);
            const halfStar = stars % 1 !== 0;
            const emptyStars = 5 - Math.ceil(stars);

            return '⭐'.repeat(fullStars) +
                   (halfStar ? '⭐' : '') +
                   '☆'.repeat(emptyStars);
        },

        formatPrice(price) {
            if (!price) return '-';
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(price);
        },

        formatDate(date) {
            if (!date) return '-';
            return new Date(date).toLocaleDateString('de-DE');
        },

        // Toast-Benachrichtigungen
        showToast(message, type = 'info') {
            const icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            const toast = {
                id: this.toastId++,
                message,
                type,
                icon: icons[type]
            };

            this.toasts.push(toast);

            setTimeout(() => {
                const index = this.toasts.findIndex(t => t.id === toast.id);
                if (index > -1) {
                    this.toasts.splice(index, 1);
                }
            }, 4000);
        }
    },

    watch: {
        currentView(newView) {
            if (newView === 'rack' && this.racks.length === 0) {
                this.loadRacks();
            }
        },

        showStats(show) {
            if (show && !this.stats) {
                this.loadStats();
            }
        }
    }
}).mount('#app');
