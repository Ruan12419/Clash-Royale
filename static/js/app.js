new Vue({
    el: '#app',
    data: {
        sections: {
            cards: false,
            playerInfo: false,
            stats: false,
            mostUsedCards: false, 
            decks: false,
            lossesSection: false,
            winsSection: false,
            highWin: false, 
            highDefeat: false, 
            cardPerformance: false, 
            trendingCards: false
        },
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
        wins: -1,
        showWinsSection: false,
        comboSize: "",
        winRate: "",
        cardCombos: [],
        lossRate: "",
        highDefeatCards: [],
        opponentCard: "",
        cardPerformance: [],
        opponentCardAll: "",
        cardPerformanceAll: [],
        trendingCards: []
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
            if (this.checkDateInput()) {
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
            if (this.checkDateInput()) {
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
        fetchCardCombos() {
            if (this.checkDateInput()) {
                return;
            }

            const startTime = `${this.startTime}Z`;
            const endTime = `${this.endTime}Z`;

            if (this.comboSize === 0) {
                alert('Por favor, digite o tamanho do combo.');
                return;
            }
            if (this.winRate < 0.1) {
                alert('Por favor, digite a porcentagem de vitórias.');
                return;
            }

            const url = `/get-card-combos-win-rate?n=${this.comboSize}&percentage=${this.winRate}&start_time=${startTime}&end_time=${endTime}`;

            axios.get(url)
                .then(response => {
                    this.cardCombos = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar combo:', error);
                    alert('Ocorreu um erro ao buscar o combo.');
                });
        },
        fetchHighDefeatCards() {
            if (this.checkDateInput()) {
                return;
            }
            
            if (!this.lossRate) {
                alert("Insira uma porcentagem de derrota!")
                return;
            }

            const url = `/get-high-loss-rate-cards?percentage=${this.lossRate}&start_time=${this.startTime}&end_time=${this.endTime}`;

            axios.get(url)
                .then(response => {
                    this.highDefeatCards = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar derrotas.', error);
                    alert('Ocorreu um erro ao buscar as derrotas da carta!');
                });

        },
        fetchCardPerformance() {
            if (this.checkDateInput()) {
                return;
            }
            
            if (!this.cardName) {
                alert("Insira o nome da sua carta!")
                return;
            }
            if (!this.opponentCard) {
                alert("Insira o nome da carta oponente!")
                return;
            }


            const url = `/get-card-performance?card_name=${this.cardName}&opponent_card=${this.opponentCard}&start_time=${this.startTime}&end_time=${this.endTime}`;

            axios.get(url)
                .then(response => {
                    this.cardPerformance = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar desempenho da carta.', error);
                    alert('Ocorreu um erro ao buscar o desempenho da carta!');
                });

        },
        fetchAllCardsPerformance() {
            if (this.checkDateInput()) {
                return;
            }
            
            if (!this.opponentCardAll) {
                alert("Insira o nome da carta oponente!")
                return;
            }


            const url = `/get-all-card-performance?opponent_card=${this.opponentCardAll}&start_time=${this.startTime}&end_time=${this.endTime}`;

            axios.get(url)
                .then(response => {
                    this.cardPerformanceAll = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar desempenho da carta.', error);
                    alert('Ocorreu um erro ao buscar o desempenho da carta!');
                });
        },
        fetchTrendingCards() {
            if (this.checkDateInput()) {
                return;
            }

            const url = `/get-trending-cards-usage?start_time=${this.startTime}&end_time=${this.endTime}`;

            axios.get(url)
                .then(response => {
                    this.trendingCards = response.data;
                })
                .catch(error => {
                    console.error('Erro ao buscar cartas tendencia nesse intervalo de tempo.', error);
                    alert('Ocorreu um erro ao buscar cartas tendencia nesse intervalo de tempo!');
                });
        },
        toggleSection(section) {
            for (let key in this.sections) {
                this.sections[key] = (key === section) ? !this.sections[key] : false;
            }
        },
        checkDateInput() {
            if (!this.startTime || !this.endTime) {
                alert('Por favor, selecione as datas de início e fim.');
                return true;
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
