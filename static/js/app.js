new Vue({
    el: '#app',
    data: {
        cards: [],
        battles: [],
        playerStats: null,
        mostUsedCards: [],
        currentPage: 1,
        itemsPerPage: 5
    },
    computed: {
        totalPages() {
            return Math.ceil(this.cards.length / this.itemsPerPage);
        },
        paginatedCards() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.cards.slice(start, end);
        }
    },
    methods: {
        fetchCards() {
            axios.get('/get-cards')
                .then(response => {
                    this.cards = response.data;
                    this.currentPage = 1; 
                })
                .catch(error => {
                    console.error('Erro ao buscar cartas:', error);
                });
        },
        fetchBattles() {
            const playerTag = 'YOUR_PLAYER_TAG';
            axios.get(`/insert-battles/${playerTag}`)
                .then(() => {
                    axios.get('/get-battles')
                        .then(res => {
                            this.battles = res.data;
                        })
                        .catch(err => {
                            console.error('Erro ao buscar batalhas:', err);
                        });
                })
                .catch(error => {
                    console.error('Erro ao atualizar batalhas:', error);
                });
        },
        fetchPlayerStats() {
            const playerTag = 'PUQQGVU80';
            axios.get(`/get-player-stats/${playerTag}`)
                .then(response => {
                    this.playerStats = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar estatísticas do jogador:', error);
                });
        },
        fetchMostUsedCards() {
            axios.get('/get-most-used-cards')
                .then(response => {
                    this.mostUsedCards = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar cartas mais usadas:', error);
                });
        },
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        }
    },
    mounted() {
        this.fetchCards();
    }
});
