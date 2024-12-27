"use strict";

(() => {

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
            
            if (selectedCoins.size >=5) {
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

    const renderNewModalHTML= newModalHTML => document.getElementById('selectedCoinsList').innerHTML = newModalHTML;

    window.replaceSelectedCoin = function(oldCoinId, newCoinId, newToggleId) {
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

    const collectCoinData = async coinApi => {
        const response = await fetch(coinApi)
        if (!response.ok) throw new Error(`Failed to receive data from server`)
        const coin = await response.json()
        return coin;
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

    const isCacheValid = timestamp => {
        const now = Date.now();
        const twoMinutes = 1000*60*2;
        return (now - timestamp) < twoMinutes
    }

    const getCachedData = coinId => {
        try {
            const cached = localStorage.getItem(`crypto${coinId}`)
            if (!cached) return null

            const {data, timestamp} = JSON.parse(cached);

            if (!isCacheValid(timestamp)) {
                localStorage.removeItem(`crypto${coinId}`)
                return null
            }

            return data;

        } catch (error) {
            console.warn('Error reading from cache:', error)
            return null;
        }
    }

    const  saveToCache = (coinId, data) => {
        try {
            const cacheData = {
                data,
                timestamp: Date.now()
            }
            localStorage.setItem(`crypto${coinId}`, JSON.stringify(cacheData) )
        } catch (error) {
            console.warn('Error Saving to catch', error)
        }
    }

    const moreInfo = async coinId => {
        try {
            const cachedData = getCachedData(coinId);
            if (cachedData) {
                const coinCollapse = generateCoinCollapse(cachedData);
                const coinIdCollapse = `collapse${coinId}`;    
                renderCoinCollapse(coinCollapse, coinIdCollapse);
                return;
            }

            const coinApi = `https://api.coingecko.com/api/v3/coins/${coinId}`
            const coinData = await collectCoinData(coinApi)
            const coinCollapse = generateCoinCollapse(coinData)
            const coinIdCollapse = `collapse${coinId}`
            renderCoinCollapse(coinCollapse, coinIdCollapse)
            saveToCache(coinId, coinData)
        } catch (error) {
            console.warn(error)
            document.getElementById('main').innerHTML = `<p>Error loading data</p>`;
        }
    }

    const collectData = async url => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to receive data from server`)
        const coins = await response.json()
        return coins.slice(0, 100)
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
                            <p>Loading...</p>
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
        const numOfSeconds = 1000*8
        return (now - timestamp) < numOfSeconds;
    }

    const loadMainPageFromCache = () => {
        const cache = localStorage.getItem('load');
        if (!cache) return null

        const {data, timestamp} = JSON.parse(cache);
        if (onLoadCacheIsValid(timestamp)) {
            return data
        } else {
            return null
        }
        
    }

    async function runProgram(url) {
        try {
            const cache = loadMainPageFromCache()
            if (cache) {
                const coinsData = cache; 
                const coinsHTML = generateCoinsHTML(coinsData)
                renderCoinsHTML(coinsHTML)
                addToMoreInfoEventListeners();
                setupToggleSwitches();
                
            } else {
                const coinsData = await collectData(url)
                saveMainPageToCache(coinsData)
                const coinsHTML = generateCoinsHTML(coinsData)
                renderCoinsHTML(coinsHTML)
                addToMoreInfoEventListeners();
                setupToggleSwitches();
            }

            
            
        } catch (error) {
            console.warn(error)
            document.getElementById('main').innerHTML = `<p>Error loading data</p>`;
        }
    }

    runProgram(`https://api.coingecko.com/api/v3/coins/list`)

})()