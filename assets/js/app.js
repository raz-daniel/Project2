"use strict";

(() => {

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

    const renderCoinCollapse = (coinHTML, coinId) => {
        console.log("Rendering collapse for:", coinId);
        const collapseElement = document.getElementById(coinId);
        if (!collapseElement) {
            console.warn(`Element with id ${coinId} not found in the DOM`)
            return
        }
        collapseElement.innerHTML = coinHTML
    }

    const moreInfo = async coinID => {
        try {
            const coinApi = `https://api.coingecko.com/api/v3/coins/${coinID}`
            const coinData = await collectCoinData(coinApi)
            const coinCollapse = generateCoinCollapse(coinData)
            const coinId = `collapse${coinData.id}`
            renderCoinCollapse(coinCollapse, coinId)
        } catch (error) {
            console.warn(error)
            document.getElementById('main').innerHTML = `<p>Error loading data</p>`;
        }

    }

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