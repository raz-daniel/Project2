"use strict";

(() => {

    const API_CONFIG = {
        COINS_LIST: 'https://api.coingecko.com/api/v3/coins/list',
        COIN_DETAILS: 'https://api.coingecko.com/api/v3/coins/',
        MULTI_PRICE: 'https://min-api.cryptocompare.com/data/pricemulti'
    };

    const MESSAGES = {
        LOADING: 'Loading Data.',
        ERROR: {
            FETCH: 'Error loading data, Please try again.',
            SERVER: 'Server error occurred.',
            NETWORK: 'Network connection error.',
            SAVING: 'Error saving data.'
        }
    };

    const apiDelay = {
        lastCallTime: 0,
        gapTime: 3000
    }

    const getDelayTime = async () => {
        try {
            const now = Date.now();
            const timeSinceLastCall = now - apiDelay.lastCallTime;

            if (timeSinceLastCall < apiDelay.gapTime) {
                await new Promise(respond => setTimeout(respond, apiDelay.gapTime - timeSinceLastCall))
            }

            apiDelay.lastCallTime = now;
        } catch (error) {
            console.warn('API delay error:', error)
            apiDelay.lastCallTime = Date.now();
        }
    }

    const selectedCoins = new Map();

    const setupToggleSwitches = () => {
        document.querySelectorAll('.toggle-edit').forEach(toggle => {
            toggle.addEventListener('change', changeCoinToggle);
        });
    }

    function changeCoinToggle(event) {
        const toggle = event.target;
        const coinId = toggle.dataset.coinId;
        const coinSymbol = toggle.dataset.coinSymbol;
        const coinName = toggle.dataset.coinName;

        if (toggle.checked) {

            if (selectedCoins.size >= 5) {
                toggle.checked = false;
                displayModal(coinId, coinSymbol, coinName, toggle)
                return;
            }
            selectedCoins.set(coinId, {
                symbol: coinSymbol,
                name: coinName
            });
        } else {
            selectedCoins.delete(coinId);
        }
    }

    const displayModal = (newCoinId, newCoinSymbol, newCoinName, newToggle) => {
        if (!document.getElementById('displayModal')) {
            const modalHTML = `
                <div class="modal fade" id="displayModal" tabindex="-1" aria-labelledby="maxCoinsModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="maxCoinsModalLabel">Maximum Coins Selected</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>You can only select up to 5 coins. Please deselect a coin to add a new one.</p>
                                <div id="selectedCoinsList">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML)
        }

        const newModalHTML = generateNewModalHTML(newCoinId, newToggle.id)
        renderNewModalHTML(newModalHTML);
        const modal = new bootstrap.Modal(document.getElementById('displayModal'));
        modal.show()

    }

    const generateNewModalHTML = (newCoinId, newToggleId) => {
        const newModal = Array.from(selectedCoins.entries())
            .map(([id, coin]) => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
                <button 
                    class="btn btn-danger btn-sm" 
                    onclick="replaceSelectedCoin('${id}', '${newCoinId}', '${newToggleId}')">
                    Replace
                </button>
            </div>
            `
            ).join('')
        return newModal;
    }

    const renderNewModalHTML = newModalHTML => document.getElementById('selectedCoinsList').innerHTML = newModalHTML;

    window.replaceSelectedCoin = function (oldCoinId, newCoinId, newToggleId) {
        selectedCoins.delete(oldCoinId);

        const oldToggle = document.querySelector(`[data-coin-id="${oldCoinId}"]`);
        if (oldToggle) oldToggle.checked = false;

        const newToggle = document.getElementById(newToggleId);
        if (newToggle) {
            newToggle.checked = true;
            selectedCoins.set(newCoinId, {
                symbol: newToggle.dataset.coinSymbol,
                name: newToggle.dataset.coinName
            });
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('displayModal'))
        modal.hide();
    }

    const renderSuccessCoinState = (coinId, message) => {
        document.getElementById(`collapse${coinId}`).innerHTML = `
                <div class="card card-body" style="width: 300px;">
                    <div class="loading">${message}</div>
                </div>
            `
    }

    const renderErrorCoinState = (coinId, message) => {
        document.getElementById(`collapse${coinId}`).innerHTML = `
                <div class="card card-body" style="width: 300px;">
                    <div>${message}</div>
                </div>
            `
    }

    const collectSingleCoinData = async coinId => {
        try {
            const singleCoinApi = API_CONFIG.COIN_DETAILS + coinId;
            const response = await fetch(singleCoinApi)
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const coin = await response.json()
            if (coin && coin.market_data) {
                displayMoreInfo(coin, coinId);
                saveSingleCoinToCache(coinId, coin)
                return coin;
            }
        } catch (error) {
            console.warn('Fetching error:', error);
            renderErrorCoinState(coinId, MESSAGES.ERROR.FETCH);
            return null;
        }
    }

    const generateCoinCollapse = coin => {
        return `
                            <div class="card card-body" style="width: 300px;">
                                <img class="collapseImg" src="${coin.image.thumb}" alt="${coin.name}">
                                <br>
                                <p>Current Price (EUR): € ${coin.market_data.current_price.eur.toFixed(5)}</p>
                                <p>Current Price (USD): $ ${coin.market_data.current_price.usd.toFixed(5)}</p>
                                <p>Current Price (ILS):  ₪ ${coin.market_data.current_price.ils.toFixed(5)}</p>
                            </div>
                 `
    }

    const renderCoinCollapse = (coinHTML, coinId) => document.getElementById(coinId).innerHTML = coinHTML

    const isSingleCoinCacheValid = timestamp => {
        const now = Date.now();
        const twoMinutes = 1000 * 60 * 2;
        return (now - timestamp) < twoMinutes
    }

    const getSingleCoinCache = coinId => {
        try {
            const cache = localStorage.getItem(`crypto${coinId}`)
            if (!cache) return null

            const { data, timestamp } = JSON.parse(cache);

            if (!isSingleCoinCacheValid(timestamp)) {
                localStorage.removeItem(`crypto${coinId}`)
                return null
            }

            return data;

        } catch (error) {
            console.warn('Fetching error:', error)
            return null;
        }
    }

    const saveSingleCoinToCache = (coinId, data) => {
        try {
            const cache = {
                data,
                timestamp: Date.now()
            }
            localStorage.setItem(`crypto${coinId}`, JSON.stringify(cache))
        } catch (error) {
            console.warn(MESSAGES.ERROR.SAVING, error)
        }
    }

    const displayMoreInfo = (coinData, coinId) => {
        const coinCollapse = generateCoinCollapse(coinData)
        const coinIdCollapse = `collapse${coinId}`;
        renderCoinCollapse(coinCollapse, coinIdCollapse);
    }

    const moreInfo = async coinId => {
        const collapseElement = document.getElementById(`collapse${coinId}`);
        const isExpanded = collapseElement.classList.contains('show');
        if (isExpanded) return;

        try {
            const cache = getSingleCoinCache(coinId);
            if (cache) {
                displayMoreInfo(cache, coinId)
            } else {
                renderSuccessCoinState(coinId, MESSAGES.LOADING)
                await getDelayTime();
                await collectSingleCoinData(coinId)
            }
        } catch (error) {
            console.warn('Fetching error:', error)
            localStorage.removeItem(`crypto${coinId}`);
            renderErrorCoinState(coinId, MESSAGES.ERROR.FETCH);
        }
    }

    const collectData = async url => {
        try {
            document.getElementById('main').innerHTML = `<div class="loading">${MESSAGES.LOADING}</div>`;
            const response = await fetch(url)
            if (!response.ok) console.warn(`HTTP error: ${response.status}`);
            const coins = await response.json()
            const limitCoins = coins.slice(0, 100);
            return limitCoins;
        } catch (error) {
            if (error.name === 'typeError') {
                console.warn('Network error:', error);
                document.getElementById('main').innerHTML = `<div class="error">${MESSAGES.ERROR.NETWORK}</div>`
            } else {
                console.warn('Fetching error:', error);
                document.getElementById('main').innerHTML = `<div class="error">${MESSAGES.ERROR.FETCH}</div>`;
            }
            return []
        }
    }


    const generateCoinsHTML = coinsHTML => {
        return coinsHTML.map(coin => {
            const { id, symbol, name } = coin
            return `
            <div class="card m-2" style="width: 18rem;">
                 <div class="card-body">
                    <div class="newDisplay">
                        <h5 class="card-title">${symbol.toUpperCase()}</h5>
                        <div class="form-check form-switch toggle-edit">
                            <input 
                                class="form-check-input" 
                                type="checkbox" 
                                id="toggle${id}"
                                data-coin-id="${id}"
                                data-coin-symbol="${symbol}"
                                data-coin-name="${name}">
                        </div>
                    </div>
                    <p class="card-text">${name}</p>
                    <button 
                        class="btn btn-primary btn-edit" 
                        data-coin-id="${id}"
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse${id}" 
                        aria-expanded="false" 
                        aria-controls="collapse${id}"
                        >More Info
                    </button>
                    <div class="collapse collapse-horizontal" id="collapse${id}">
                        <div class="card card-body" style="width: 300px;">
                            <p class="loading">${MESSAGES.LOADING}</p>
                        </div>
                    </div>
                </div>
            </div>
            `
        }).join('')

    }

    const renderCoinsHTML = coinsHTML => document.getElementById('main').innerHTML = coinsHTML;

    const addToMoreInfoEventListeners = () => {
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function () {
                const coinId = this.getAttribute('data-coin-id')
                moreInfo(coinId)
            })
        })
    }

    const saveCacheOnload = data => {
        try {
            const cache = {
                data,
                timestamp: Date.now()
            }
            localStorage.setItem('coinsData', JSON.stringify(cache))
        } catch (error) {
            console.warn(MESSAGES.ERROR.SAVING, error)
        }
    }

    const onloadCacheIsValid = timestamp => {
        const now = Date.now();
        const eightSeconds = 1000 * 8
        return (now - timestamp) < eightSeconds;
    }

    const getCacheOnload = () => {
        try {
            const cache = localStorage.getItem('coinsData');
            if (!cache) return null

            const { data, timestamp } = JSON.parse(cache);
            if (onloadCacheIsValid(timestamp)) {
                return data
            } else {
                return null
            }
        } catch (error) {
            console.warn(MESSAGES.ERROR.FETCH, error);
            return null;
        }


    }

    const displayCoins = coinsData => {
        const coinsHTML = generateCoinsHTML(coinsData)
        renderCoinsHTML(coinsHTML)
        addToMoreInfoEventListeners();
        setupToggleSwitches();

    }

    async function runCoinsOnload(url) {
        try {
            const cache = getCacheOnload()
            if (cache) {
                displayCoins(cache)
            } else {
                const coinsData = await collectData(url)
                saveCacheOnload(coinsData)
                displayCoins(coinsData)
            }
        } catch (error) {
            console.warn(error)
            document.getElementById('main').innerHTML = `<p>${MESSAGES.ERROR.FETCH}</p>`;
        }
    }

    const displayAboutPage = () => {
        const mainContent = document.getElementById('main');
        mainContent.innerHTML = `
            <div class="about-container">
                <div class="header-photo">
                    <h2>About Me</h2>
                    <img src="assets/photos/MyPhoto.jpg" alt="My Photo: Daniel Raz">
                </div>
                <div class="personal-info">
                    <p>My name is Daniel Raz. I'm married to Tal, father to Ella and Neri, and in May we are expecting our 3rd baby girl.</p>
                    <p>I am an independent professional with nearly a decade of experience in managing private clinics
                        and teaching in the field of Chinese medicine. 
                        I possess excellent interpersonal communication skills and teamwork abilities, 
                        and I am competitive with myself, always striving for improvement. 
                        I am seeking a new challenge in the tech field, 
                        particularly in Frontend development, and I am ready to face difficulties and new challenges. 
                        I believe in the power of continuous learning, 
                        which drives me to expand my knowledge in development and technology. 
                        I am excited and highly motivated to learn and grow in the tech industry and am prepared to challenge myself.
                    </p>
                </div>
                <div class="project-info">
                    <p>This project represents a comprehensive cryptocurrency tracking platform developed using modern web technologies.
                         The application enables users to monitor and analyze various digital currencies in real-time, 
                        featuring an intuitive interface for accessing detailed coin information and live market data. 
                        It demonstrates practical implementation of frontend development fundamentals, including responsive design, 
                        API integration, and dynamic data handling. 
                        The platform showcases essential web development concepts through features like real-time price tracking,
                        data caching, and interactive user controls, all while maintaining a focus on user experience and performance optimization. 
                        This project embodies the practical application of frontend development skills, 
                        combining technical expertise with user-centered design principles to create a functional and engaging web application.
                    </p>
                </div>
            </div>
        `
    }

    const displayReportsPage = () => {
        if (selectedCoins.size === 0) {
            document.getElementById('main').innerHTML = '<div class="alert alert-warning">Please select coins to display in the chart</div>';
            return;
        }

        const mainContent = document.getElementById('main');
        mainContent.innerHTML = '<canvas id="cryptoChart"></canvas>';

        const chartColors = ['#0000FF', '#FF0000', '#808080', '#008000', '#000000'];

        const ctx = document.getElementById('cryptoChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: Array.from(selectedCoins.entries()).map(([id, coin], index) => ({
                    label: coin.symbol.toUpperCase(),
                    data: [],
                    borderColor: chartColors[index],
                    tension: 0.1
                }))
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });

        async function updateChart() {
            try {
                const symbols = Array.from(selectedCoins.values()).map(coin => coin.symbol.toUpperCase()).join(',');
                const response = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbols}&tsyms=USD`);
                const prices = await response.json();

                const timestamp = new Date().toLocaleTimeString();
                chart.data.labels.push(timestamp);

                Object.entries(prices).forEach((coinData, index) => {
                    const [symbol, priceData] = coinData;
                    chart.data.datasets[index].data.push(priceData.USD);
                });

                if (chart.data.labels.length > 30) {
                    chart.data.labels.shift();
                    chart.data.datasets.forEach(dataset => dataset.data.shift());
                }

                chart.update();
            } catch (error) {
                console.error('Error fetching crypto prices:', error);
            }
        }

        updateChart();
        const interval = setInterval(updateChart, 2000);

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => clearInterval(interval));
        });
    }

    const displayNav = () => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                const page = event.target.dataset.page

                switch (page) {
                    case 'about':
                        displayAboutPage();
                        break;
                    case 'coins':
                        runCoinsOnload(API_CONFIG.COINS_LIST);
                        break;
                    case 'reports':
                        displayReportsPage();
                        break;
                }
            })
        })
    }

    const init = () => {
        runCoinsOnload(API_CONFIG.COINS_LIST)
        displayNav()
    }

    init();

    document.getElementById('searchButton')?.addEventListener('click', function(event) {
        event.preventDefault();
        const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
        
        const cards = document.querySelectorAll('#main .card');
        
        cards.forEach(card => {
            const symbol = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const name = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
            
            const isVisible = symbol.includes(searchText) || name.includes(searchText);
            card.style.display = isVisible ? '' : 'none';
        });
    });
    
    document.getElementById('searchInput')?.addEventListener('input', function(event) {
        const searchText = event.target.value.toLowerCase();
        
        const cards = document.querySelectorAll('#main .card');
        
        cards.forEach(card => {
            const symbol = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
            const name = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
            
            const isVisible = symbol.includes(searchText) || name.includes(searchText);
            card.style.display = isVisible ? '' : 'none';
        });
    });


})()