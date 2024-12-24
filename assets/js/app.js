"use strict";

(async () => {

    const apiUrl = "https://api.coingecko.com/api/v3/coins/list";
    

    async function collectData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch data");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn(error);
            return null;
        }
    }

    function generateHTML(data) {
        return data.map(coin => {
            const { name, symbol, id } = coin;
            return `
            <div class="card w-75 mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="card-title">${name}</h5>
                        <div class="form-check form-switch">
                            <input class="form-check-input" 
                               type="checkbox" 
                               id="toggle${id}" 
                               data-coin-id="${id}"
                               data-coin-symbol="${symbol}"
                               data-coin-name="${name}">
                        </div> 
                    </div>
                    <p class="card-text">Symbol: ${symbol.toUpperCase()}</p>
                    <button 
                        class="btn btn-primary" 
                        type="button"
                        data-coin-id="${id}" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse${id}" 
                        aria-expanded="false" 
                        aria-controls="collapse${id}">
                        More Info
                    </button>
                    <div class="collapse collapse-horizontal" id="collapse${id}">
                        <p>Loading...</p>
                    </div>
                </div>
            </div>`
        }
        ).join("");
    }


    function renderHTML(newHTML) {
        const content = document.getElementById("content");
        content.innerHTML = newHTML;
    }

    function addMoreInfoEventListeners() {
        document.querySelectorAll(".btn-primary").forEach(button => {
            button.addEventListener("click", function () {
                const coinId = this.getAttribute("data-coin-id");
                fetchMoreInfo(coinId);
            });
        });
    }


    async function fetchMoreInfo(coinId) {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}`;
        const collapseElement = document.getElementById(`collapse${coinId}`);
        collapseElement.innerHTML = `<p>Loading...</p>`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch coin details");
            const data = await response.json();

            collapseElement.innerHTML = `
                <img src="${data.image.small}" alt="${data.name}" />
                <p>Current Price (USD): $${data.market_data.current_price.usd}</p>
                <p>Market Cap: $${data.market_data.market_cap.usd}</p>
            `;
        } catch (error) {
            console.warn("Error fetching more info:", error);
            collapseElement.innerHTML = `<p>Error loading details.</p>`;
        }
    }


    async function fetchAndRenderCoins() {
        const data = await collectData("https://api.coingecko.com/api/v3/coins/list");
        const newHTML = generateHTML(data.slice(0, 100));
        renderHTML(newHTML);
        addMoreInfoEventListeners();
    }
    fetchAndRenderCoins();


})();