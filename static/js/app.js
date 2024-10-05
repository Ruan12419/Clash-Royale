new Vue({
    el: '#app',
    data: {
        cards: [],
        battles: [],
        playerStats: null,
        mostUsedCards: [],
        winRates: {},
        currentPage: 1,
        itemsPerPage: 5,
        searchQuery: "",
        playerTag: "",
        sortOption: "none",
        startTime: '',
        endTime: '',
        percentage: 60,
        isDropdownVisible: false,
        decks: [],
        combo: [],
        losses: -1,
        cardName: '',
        trophyPercentageDifference: null,
        wins: [],
        showWinsSection: false,
    },
    computed: {
        totalPages() {
            return Math.ceil(this.filteredAndSortedCards.length / this.itemsPerPage);
        },
        paginatedCards() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = start + this.itemsPerPage;
            return this.filteredAndSortedCards.slice(start, end);
        },
        filteredAndSortedCards() {
            let filteredCards = this.cards.filter(card =>
                card.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
            if (this.sortOption === "winRateAsc") {
                return filteredCards.sort((a, b) => {
                    let winRateA = parseFloat(this.winRates[a.name]) || 0;
                    let winRateB = parseFloat(this.winRates[b.name]) || 0;
                    return winRateA - winRateB;
                });
            } else if (this.sortOption === "winRateDesc") {
                return filteredCards.sort((a, b) => {
                    let winRateA = parseFloat(this.winRates[a.name]) || 0;
                    let winRateB = parseFloat(this.winRates[b.name]) || 0;
                    return winRateB - winRateA;
                });
            }
            return filteredCards;
        }
    },
    watch: {
        searchQuery() {
            this.currentPage = 1;
        }
    },
    methods: {
        insertCards() {
            axios.get('/insert-cards')
                .then(response => {
                    this.cards = response.data;
                    this.currentPage = 1;
                    this.fetchWinRatesForAllCards();
                })
                .catch(error => {
                    console.error('Erro ao buscar cartas:', error);
                });
        },
        fetchCards() {
            axios.get('/get-cards')
                .then(response => {
                    this.cards = response.data;
                    this.currentPage = 1;
                    this.fetchWinRatesForAllCards();
                })
                .catch(error => {
                    console.error('Erro ao buscar cartas:', error);
                });
        },
        fetchBattles() {
            const playerTag = this.playerTag;
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
        fetchPlayer() {
            const playerTag = this.playerTag;
            axios.get(`/insert-stats/${playerTag}`)
                .then({})
                .catch(error => {
                    console.error('Erro ao buscar estatísticas do jogador:', error);
                });
        },
        fetchPlayerStats() {
            const playerTag = this.playerTag;
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
        fetchCardWinRate(cardName) {
            axios.get(`/get-card-win-rate/${cardName}`)
                .then(response => {
                    const cardWinRate = response.data[0];
                    if (cardWinRate) {
                        alert(`A taxa de vitória da carta ${cardName} é ${(cardWinRate.win_rate * 100).toFixed(2)}% em ${cardWinRate.total_battles} batalhas.`);
                    } else {
                        alert(`Nenhuma informação de taxa de vitória encontrada para a carta ${cardName}.`);
                    }
                })
                .catch(error => {
                    console.error(`Erro ao buscar a taxa de vitória da carta ${cardName}:`, error);
                });
        },
        fetchWinRatesForAllCards() {
            this.cards.forEach(card => {
                axios.get(`/get-card-win-rate/${card.name}`)
                    .then(response => {
                        const cardWinRate = response.data[0];
                        if (cardWinRate) {
                            this.$set(this.winRates, card.name, (cardWinRate.win_rate * 10).toFixed(2));
                        } else {
                            this.$set(this.winRates, card.name, "Sem dados");
                        }
                    })
                    .catch(error => {
                        console.error(`Erro ao buscar a taxa de vitória da carta ${card.name}:`, error);
                        this.$set(this.winRates, card.name, "Erro");
                    });
            });
        },
        fetchCardWinRateInTimeRange(cardName) {
            if (!this.startTime || !this.endTime) {
                alert("Por favor, insira o intervalo de tempo.");
                return;
            }

            axios.get(`/get-card-win-rate-in-time-range/${cardName}`, {
                params: {
                    start_time: `${this.startTime}Z`,
                    end_time: `${this.endTime}Z`
                }
            })
                .then(response => {
                    const cardWinRate = response.data[0];
                    if (cardWinRate) {
                        alert(`A taxa de vitória da carta ${cardName} é ${(cardWinRate.win_rate * 100).toFixed(2)}% em ${cardWinRate.total_battles} batalhas.`);
                    } else {
                        alert(`Nenhuma informação de taxa de vitória encontrada para a carta ${cardName} no intervalo de tempo selecionado.`);
                    }
                })
                .catch(error => {
                    console.error(`Erro ao buscar a taxa de vitória da carta ${cardName} no intervalo de tempo:`, error);
                });
        },
        getDecks() {
            if (!this.startTime || !this.endTime) {
                alert("Por favor, insira o intervalo de tempo.");
                return;
            }

            axios.get(`/get-decks-win-in-timerange`, {
                params: {
                    percentage: this.percentage,
                    start_time: `${this.startTime}Z`,
                    end_time: `${this.endTime}Z`
                }
            })
                .then(response => {
                    this.decks = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar decks:', error);
                });
        },
        toggleDropdown() {
            this.isDropdownVisible = !this.isDropdownVisible;
        },
        getLosses() {
            if (!this.startTime || !this.endTime) {
                alert('Por favor, selecione as datas de início e fim.');
                return;
            }

            const startTime = `${this.startTime}Z`;
            const endTime = `${this.endTime}Z`;

            if (this.combo.length === 0) {
                alert('Por favor, selecione pelo menos uma carta.');
                return;
            }

            const url = `/get-losses-in-timerange?combo=${this.combo.join(',')}&start_time=${startTime}&end_time=${endTime}`;

            axios.get(url)
                .then(response => {
                    this.losses = response.data.losses;
                })
                .catch(error => {
                    console.error('Erro ao buscar derrotas:', error);
                    alert('Ocorreu um erro ao buscar as derrotas.');
                });
        },
        toggleWinsSection() {
            this.showWinsSection = !this.showWinsSection;
        },
        async getWinsWithConditions() {
            if (!this.cardName || this.trophyPercentageDifference === null) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                const response = await fetch(`/get-wins-with-conditions?card_name=${encodeURIComponent(this.cardName)}&trophy_percentage_difference=${this.trophyPercentageDifference}`);
                const data = await response.json();

                if (response.ok) {
                    this.wins = data;
                } else {
                    alert(data.error || 'Erro ao buscar vitórias.');
                    this.wins = [];
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao buscar vitórias.');
            }
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
