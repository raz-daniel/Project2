"use strict";

(() => {

    const API_CONFIG = {
        COIN_LIST: 'https://api.coingecko.com/api/v3/coins/list',
        COIN_DETAILS: 'https://api.coingecko.com/api/v3/coins/',
        MULTI_PRICE: 'https://min-api.cryptocompare.com/data/pricemulti'
    };

    const MESSAGES = {
        LOADING: 'Loading Data.',
        ERROR: {
            FETCH: 'Error loading data. Please try again.',
            SERVER: 'Server error occurred.',
            NETWORK: 'Network connection error.'
        }
    };

    const apiTracker = {
        requestCount: 0,
        roundNumber: 0,
        lastRequestTime: 0,
        lastRoundTime: 0
    }

    const selectedCoins = new Map();

    const setupToggleSwitches = () => {
        document.querySelectorAll('.form-check-input').forEach(toggle => {
            toggle.addEventListener('change', handleCoinToggle);
        });
    }

    function handleCoinToggle(event) {
        const toggle = event.target;
        const coinId = toggle.dataset.coinId;
        const coinSymbol = toggle.dataset.coinSymbol;
        const coinName = toggle.dataset.coinName;

        if (toggle.checked) {

            if (selectedCoins.size >= 5) {
                toggle.checked = false;
                showMaxCoinModal(coinId, coinSymbol, coinName, toggle)
                return;
            }
            selectedCoins.set(coinId, {
                symbol: coinSymbol,
                name: coinName
            });
        } else {
            selectedCoins.delete(coinId);
        }
        console.log('selected coins:', Array.from(selectedCoins.entries()));
    }

    const showMaxCoinModal = (newCoinId, newCoinSymbol, newCoinName, newToggle) => {
        if (!document.getElementById('maxCoinsModal')) {
            const modalHTML = `
                <div class="modal fade" id="maxCoinsModal" tabindex="-1" aria-labelledby="maxCoinsModalLabel" aria-hidden="true">
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
        const modal = new bootstrap.Modal(document.getElementById('maxCoinsModal'));
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

        const modal = bootstrap.Modal.getInstance(document.getElementById('maxCoinsModal'))
        modal.hide();
    }

    const collectCoinData = async coinId => {
        try {
            const collapseId = `collapse${coinId}`;
            document.getElementById(collapseId).innerHTML = `
                <div class="card card-body" style="width: 300px;">
                    <div class="loading">${MESSAGES.LOADING}</div>
                </div>
            `;
            const coinApi = `https://api.coingecko.com/api/v3/coins/${coinId}`;
            const response = await fetch(coinApi)
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const coin = await response.json()
            displayMoreInfo(coin, coinId);
            return coin;
        } catch (error) {
            console.error('Error fetching coin data:', error);
            document.getElementById(collapseId).innerHTML = `
                <div class="card card-body" style="width: 300px;">
                    <div class="error">${MESSAGES.ERROR.FETCH}</div>
                </div>
            `;
            return null;
        } 
    }

    const generateCoinCollapse = coin => {
        return `
                            <div class="card card-body" style="width: 300px;">
                                <img class="collapseImg" src="${coin.image.thumb}" alt="${coin.name}">
                                <br>
                                <p>Current Price (EUR): ${coin.market_data.current_price.eur} €</p>
                                <p>Current Price (USD): ${coin.market_data.current_price.usd} $</p>
                                <p>Current Price (ILS): ₪ ${coin.market_data.current_price.ils}</p>
                            </div>
                 `
    }

    const renderCoinCollapse = (coinHTML, coinId) => document.getElementById(coinId).innerHTML = coinHTML

    const isSingleCoinCacheValid = timestamp => {
        const now = Date.now();
        const twoMinutes = 1000 * 60 * 2;
        return (now - timestamp) < twoMinutes
    }

    const getSingleCoinCachedData = coinId => {
        try {
            const cached = localStorage.getItem(`crypto${coinId}`)
            if (!cached) return null

            const { data, timestamp } = JSON.parse(cached);

            if (!isSingleCoinCacheValid(timestamp)) {
                localStorage.removeItem(`crypto${coinId}`)
                return null
            }

            return data;

        } catch (error) {
            console.warn('Error reading from cache:', error)
            return null;
        }
    }

    const saveSingleCoinToCache = (coinId, data) => {
        try {
            const cacheData = {
                data,
                timestamp: Date.now()
            }
            localStorage.setItem(`crypto${coinId}`, JSON.stringify(cacheData))
        } catch (error) {
            console.warn('Error Saving to catch', error)
        }
    }

    const displayMoreInfo = (coinData, coinId) => {
        const coinCollapse = generateCoinCollapse(coinData)
        const coinIdCollapse = `collapse${coinId}`;
        renderCoinCollapse(coinCollapse, coinIdCollapse);
    }

    const calculateWaitTime = () => {
        const now = Date.now();

        if (apiTracker.roundNumber >= 2) {
            const timeSinceLastRound = now - apiTracker.lastRoundTime;
            const minute = 60000
            if (timeSinceLastRound < minute) {
                return minute - timeSinceLastRound
            }
            apiTracker.requestCount = 0;
            apiTracker.roundNumber = 0;
            return 0
        }

        if (apiTracker.requestCount >= 3) {
            const timeSinceLastRound = now - apiTracker.lastRoundTime;
            const twentySec = 20000;
            if (timeSinceLastRound < twentySec) {
                return twentySec - timeSinceLastRound
            }
            apiTracker.requestCount = 0;
            apiTracker.roundNumber++;
            apiTracker.lastRequestTime = now;
            return 0
        }

        const timeSinceLastRequest = now - apiTracker.lastRequestTime;
        const threeSec = 3000;
        if (timeSinceLastRequest < threeSec) {
            return threeSec - timeSinceLastRequest
        }
        return 0;
    }

    const moreInfo = async coinId => {
        try {
            const cachedData = getSingleCoinCachedData(coinId);
            if (cachedData) {
                displayMoreInfo(cachedData, coinId)
            } else {
                const waitTime = calculateWaitTime();
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime))
                }
                apiTracker.lastRequestTime = Date.now()
                apiTracker.requestCount++
                if (apiTracker.requestCount === 3) {
                    apiTracker.lastRoundTime = Date.now()
                }

                const coinData = await collectCoinData(coinId)
                if (coinData) saveSingleCoinToCache(coinId, coinData)
                
            }
        } catch (error) {
            console.warn(error)
            const coinIdCollapse = `collapse${coinId}`;
            document.getElementById(coinIdCollapse).innerHTML = `
            <div class="card card-body" style="width: 300px;">
                <p>${MESSAGES.ERROR.FETCH}</p>
            </div>
            `
        }
    }

    const collectData = async url => {
        try {
            document.getElementById('coins').innerHTML = `<div class="loading">${MESSAGES.LOADING}</div>`;
            const response = await fetch(url)
            if (!response.ok) console.error(`HTTP error! status: ${response.status}`);
            const coins = await response.json()
            const limitCoins = coins.slice(0, 100);
            return limitCoins;
        } catch (error) {
            if (error.name === 'typeError') {
                console.error('Network error:', error);
                document.getElementById('coins').innerHTML = '<div class="error">Unable to connect to Server. Please check your internet connection.</div>'
            } else {
                console.error('Error fetching coins:', error);
                document.getElementById('coins').innerHTML = '<div class="error">Failed to load coins. Please try again later.</div>';
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
                        <div class="form-check form-switch">
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
                        class="btn btn-primary" 
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

const renderCoinsHTML = coinsHTML => document.getElementById('coins').innerHTML = coinsHTML;

const addToMoreInfoEventListeners = () => {
    document.querySelectorAll('.btn-primary').forEach(button => {
        button.addEventListener('click', function () {
            const coinId = this.getAttribute('data-coin-id')
            moreInfo(coinId)
        })
    })
}

const saveMainPageToCache = data => {
    try {
        const cache = {
            data,
            timestamp: Date.now()
        }
        localStorage.setItem('load', JSON.stringify(cache))
    } catch (error) {
        console.warn('Error Saving initial load to catch', error)
    }
}

const onLoadCacheIsValid = timestamp => {
    const now = Date.now();
    const numOfSeconds = 1000 * 8
    return (now - timestamp) < numOfSeconds;
}

const loadMainPageFromCache = () => {
    try {
        const cache = localStorage.getItem('load');
        if (!cache) return null

        const { data, timestamp } = JSON.parse(cache);
        if (onLoadCacheIsValid(timestamp)) {
            return data
        } else {
            return null
        }
    } catch (error) {
        console.warn('Error reading from cache:', error);
        return null;
    }


}

const displayCoins = coinsData => {
    const coinsHTML = generateCoinsHTML(coinsData)
    renderCoinsHTML(coinsHTML)
    addToMoreInfoEventListeners();
    setupToggleSwitches();

}

async function runProgram(url) {
    try {
        const cache = loadMainPageFromCache()
        if (cache) {
            displayCoins(cache)
        } else {
            const coinsData = await collectData(url)
            apiTracker.requestCount = 1;
            apiTracker.lastRequestTime = Date.now();
            saveMainPageToCache(coinsData)
            displayCoins(coinsData)
        }
    } catch (error) {
        console.warn(error)
        document.getElementById('main').innerHTML = `<p>${MESSAGES.ERROR.FETCH}</p>`;
    }
}

runProgram(`https://api.coingecko.com/api/v3/coins/list`)

}) ()