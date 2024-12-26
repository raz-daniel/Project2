"use strict";

(() => {

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
                        <h5 class="card-title">${name}</h5>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault${id}">
                            <label class="form-check-label" for="flexSwitchCheckDefault${id}"></label>
                        </div>
                    </div>
                    <p class="card-text">${symbol}</p>
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

    async function runProgram(url) {
        try {
            const coinsData = await collectData(url)
            const coinsHTML = generateCoinsHTML(coinsData)
            renderCoinsHTML(coinsHTML)
            addToMoreInfoEventListeners();
        } catch (error) {
            console.warn(error)
            document.getElementById('main').innerHTML = `<p>Error loading data</p>`;
        }
    }

    runProgram(`https://api.coingecko.com/api/v3/coins/list`)

})()