// =======================================
// CONFIGURATION & API SETTINGS
// =======================================
// Constants
const API_URL = 'https://api.coingecko.com/api/v3';
const MAX_COMPARISON = 5;
const UPDATE_INTERVAL = 60000; // 1 minute
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// =======================================
// APPLICATION STATE MANAGEMENT
// =======================================
// State variables that track current application data and settings
let cryptocurrencies = [];      // Stores all crypto data from API
let selectedCryptos = new Set(); // Tracks cryptos selected for comparison
let show24hChange = false;      // Toggle for showing 24h price change
let showCharts = false;         // Toggle for showing price charts
let showVolume = false;         // Toggle for showing volume data
let sortBy = 'market_cap';      // Current sort method for crypto list
let isFetching = false;         // Flag to prevent multiple simultaneous API calls
let lastUpdateTime = null;      // Timestamp of last data refresh
let favorites = new Set();      // User's favorite cryptocurrencies
let priceChart = null;          // Chart.js instance for price charts

// =======================================
// DOM ELEMENT REFERENCES
// =======================================
// Main containers
const cryptoContainer = document.getElementById('crypto-container');
const comparisonContainer = document.getElementById('comparison-container');

// Control buttons
const toggle24hButton = document.getElementById('toggle24h');
const toggleChartButton = document.getElementById('toggleChart');
const toggleVolumeButton = document.getElementById('toggleVolume');
const sortBySelect = document.getElementById('sortBy');
const themeToggle = document.getElementById('themeToggle');

// Chart modal elements
const chartModal = document.getElementById('chartModal');
const priceChartCanvas = document.getElementById('priceChart');

// Comparison controls
const clearComparisonButton = document.getElementById('clearComparison');
const exportComparisonButton = document.getElementById('exportComparison');

// Other UI elements
const favoritesList = document.getElementById('favoritesList');
const totalMarketCapElement = document.getElementById('totalMarketCap');
const totalVolumeElement = document.getElementById('totalVolume');
const btcDominanceElement = document.getElementById('btcDominance');

// =======================================
// APPLICATION INITIALIZATION
// =======================================
// Set up the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();              // Load user preferences from localStorage
    setupEventListeners();          // Set up event handlers for UI interaction
    fetchCryptocurrencies();        // Initial data fetch
    setInterval(fetchCryptocurrencies, UPDATE_INTERVAL); // Set up periodic data refresh
});

// =======================================
// EVENT HANDLERS
// =======================================
// Sets up all event listeners for user interaction
function setupEventListeners() {
    // Theme Toggle - Switch between light and dark mode
    themeToggle.addEventListener('change', toggleTheme);
    
    // Display Settings - Toggle visibility of different data sections
    toggle24hButton.addEventListener('click', () => {
        show24hChange = !show24hChange;
        updateButtonState(toggle24hButton, show24hChange, 'fa-chart-bar', '24h Change');
        savePreferences();
        renderCryptocurrencies();
    });

    toggleChartButton.addEventListener('click', () => {
        showCharts = !showCharts;
        updateButtonState(toggleChartButton, showCharts, 'fa-chart-line', 'Charts');
        savePreferences();
        renderCryptocurrencies();
    });

    toggleVolumeButton.addEventListener('click', () => {
        showVolume = !showVolume;
        updateButtonState(toggleVolumeButton, showVolume, 'fa-chart-pie', 'Volume');
        savePreferences();
        renderCryptocurrencies();
    });

    // Sort Options - Change how cryptocurrencies are sorted
    sortBySelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        savePreferences();
        renderCryptocurrencies();
    });

    // Comparison Controls - Clear or export comparison data
    clearComparisonButton.addEventListener('click', clearComparison);
    exportComparisonButton.addEventListener('click', exportComparison);

    // Chart Modal - Close modal when clicking X or outside the modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        chartModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === chartModal) {
            chartModal.style.display = 'none';
        }
    });
}

// =======================================
// THEME MANAGEMENT
// =======================================
// Toggle between light and dark theme
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'light';
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// =======================================
// API DATA FETCHING
// =======================================
// Fetch cryptocurrency data from CoinGecko API with retry mechanism
async function fetchCryptocurrencies(retryCount = 0) {
    // Prevent multiple simultaneous API calls
    if (isFetching) return;
    
    try {
        isFetching = true;
        showLoadingState();
        
        // Fetch top 100 cryptocurrencies by market cap
        const response = await fetch(`${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Process the data and update UI
        const data = await response.json();
        cryptocurrencies = data;
        lastUpdateTime = new Date();
        updateMarketStats();       // Update global market statistics
        renderCryptocurrencies();  // Rebuild the cryptocurrency list
        updateLastUpdateTime();    // Show last update timestamp
        
    } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        
        // Implement retry mechanism for failed API calls
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying in ${RETRY_DELAY/1000} seconds... (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => fetchCryptocurrencies(retryCount + 1), RETRY_DELAY);
        } else {
            showErrorState('Failed to fetch data. Please try again later.');
        }
    } finally {
        isFetching = false;
        hideLoadingState();
    }
}

// =======================================
// MARKET STATISTICS
// =======================================
// Calculate and display global market statistics
function updateMarketStats() {
    // Calculate total market cap of all cryptocurrencies
    const totalMarketCap = cryptocurrencies.reduce((sum, crypto) => sum + crypto.market_cap, 0);
    // Calculate total trading volume
    const totalVolume = cryptocurrencies.reduce((sum, crypto) => sum + crypto.total_volume, 0);
    // Find Bitcoin for dominance calculation
    const btc = cryptocurrencies.find(crypto => crypto.id === 'bitcoin');
    // Calculate Bitcoin's percentage of total market cap
    const btcDominance = btc ? (btc.market_cap / totalMarketCap * 100) : 0;

    // Update UI with formatted values
    totalMarketCapElement.textContent = `$${(totalMarketCap / 1000000000000).toFixed(2)}T`;
    totalVolumeElement.textContent = `$${(totalVolume / 1000000000).toFixed(2)}B`;
    btcDominanceElement.textContent = `${btcDominance.toFixed(2)}%`;
}

// =======================================
// CHART VISUALIZATION
// =======================================
// Display price chart for a specific cryptocurrency
function showPriceChart(cryptoId) {
    // Find the selected cryptocurrency
    const crypto = cryptocurrencies.find(c => c.id === cryptoId);
    if (!crypto) return;

    // Display the modal and set chart title
    chartModal.style.display = 'block';
    document.getElementById('chartTitle').textContent = `${crypto.name} Price Chart`;

    // Clean up previous chart if it exists
    if (priceChart) {
        priceChart.destroy();
    }

    // In a real application, you would fetch historical data here
    // For now, we'll create a sample chart
    const ctx = priceChartCanvas.getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
            datasets: [{
                label: 'Price (USD)',
                data: [crypto.current_price * 0.95, crypto.current_price * 0.98, 
                       crypto.current_price * 1.02, crypto.current_price * 1.05,
                       crypto.current_price * 1.03, crypto.current_price],
                borderColor: '#00ff9d',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// =======================================
// COMPARISON FUNCTIONALITY
// =======================================
// Clear all cryptocurrencies from comparison panel
function clearComparison() {
    selectedCryptos.clear();
    savePreferences();
    renderCryptocurrencies();
}

// Export comparison data to CSV file for download
function exportComparison() {
    // Get data for selected cryptocurrencies
    const selectedCryptoData = cryptocurrencies.filter(crypto => selectedCryptos.has(crypto.id));
    
    // Format data as CSV with headers
    const csvContent = [
        ['Name', 'Symbol', 'Price (USD)', '24h Change', 'Market Cap'],
        ...selectedCryptoData.map(crypto => [
            crypto.name,
            crypto.symbol.toUpperCase(),
            crypto.current_price,
            crypto.price_change_percentage_24h,
            crypto.market_cap
        ])
    ].map(row => row.join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crypto-comparison.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// =======================================
// FAVORITES MANAGEMENT
// =======================================
// Add or remove a cryptocurrency from favorites
function toggleFavorite(cryptoId) {
    if (favorites.has(cryptoId)) {
        favorites.delete(cryptoId);
    } else {
        favorites.add(cryptoId);
    }
    savePreferences();
    renderFavorites();
    renderCryptocurrencies();
}

// Display user's favorite cryptocurrencies in sidebar
function renderFavorites() {
    const favoriteCryptos = cryptocurrencies.filter(crypto => favorites.has(crypto.id));
    favoritesList.innerHTML = favoriteCryptos.length > 0 ? 
        favoriteCryptos.map(crypto => `
            <div class="favorite-item">
                <img src="${crypto.image}" alt="${crypto.name} logo" class="crypto-logo">
                <span>${crypto.name}</span>
                <button class="remove-favorite" onclick="toggleFavorite('${crypto.id}')">
                    <i class="fas fa-star"></i>
                </button>
            </div>
        `).join('') : 
        '<div class="no-favorites">No favorites added yet</div>';
}

// =======================================
// LOCAL STORAGE PERSISTENCE
// =======================================
// Save user preferences to localStorage
function savePreferences() {
    localStorage.setItem('selectedCryptos', JSON.stringify([...selectedCryptos]));
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
    localStorage.setItem('show24hChange', show24hChange);
    localStorage.setItem('showCharts', showCharts);
    localStorage.setItem('showVolume', showVolume);
    localStorage.setItem('sortBy', sortBy);
}

// Load user preferences from localStorage
function loadPreferences() {
    // Load selected cryptocurrencies for comparison
    const savedCryptos = localStorage.getItem('selectedCryptos');
    if (savedCryptos) {
        selectedCryptos = new Set(JSON.parse(savedCryptos));
    }

    // Load favorite cryptocurrencies
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = new Set(JSON.parse(savedFavorites));
    }
    
    // Load display preferences
    show24hChange = localStorage.getItem('show24hChange') === 'true';
    showCharts = localStorage.getItem('showCharts') === 'true';
    showVolume = localStorage.getItem('showVolume') === 'true';
    
    // Set button states to match loaded preferences
    updateButtonState(toggle24hButton, show24hChange, 'fa-chart-bar', '24h Change');
    updateButtonState(toggleChartButton, showCharts, 'fa-chart-line', 'Charts');
    updateButtonState(toggleVolumeButton, showVolume, 'fa-chart-pie', 'Volume');
    
    // Load sorting preference
    const savedSortBy = localStorage.getItem('sortBy');
    if (savedSortBy) {
        sortBy = savedSortBy;
        sortBySelect.value = sortBy;
    }

    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'light';
}

// =======================================
// UI STATE MANAGEMENT
// =======================================
// Show loading indicators while fetching data
function showLoadingState() {
    cryptoContainer.innerHTML = '<div class="loading">Loading cryptocurrency data...</div>';
    comparisonContainer.innerHTML = '<div class="loading">Loading comparison data...</div>';
}

// Hide loading indicators (called when data is loaded or error occurs)
function hideLoadingState() {
    // Loading states will be replaced by actual content in render functions
}

// Show error message when data fetching fails
function showErrorState(message) {
    cryptoContainer.innerHTML = `<div class="error">${message}</div>`;
    comparisonContainer.innerHTML = '<div class="error">Unable to load comparison data</div>';
}

// Update the timestamp showing when data was last refreshed
function updateLastUpdateTime() {
    const updateTimeElement = document.querySelector('.last-update');
    if (updateTimeElement) {
        updateTimeElement.textContent = `Last updated: ${lastUpdateTime.toLocaleTimeString()}`;
    }
}

// =======================================
// RENDERING & DISPLAY
// =======================================
// Render the main cryptocurrency list
function renderCryptocurrencies() {
    if (!cryptocurrencies.length) return;
    
    // Sort cryptocurrencies according to selected sort method
    const sortedCryptos = [...cryptocurrencies].sort((a, b) => {
        switch (sortBy) {
            case 'market_cap': return b.market_cap - a.market_cap;
            case 'price': return b.current_price - a.current_price;
            case 'name': return a.name.localeCompare(b.name);
            default: return 0;
        }
    });

    // Render the list of cryptos and update time
    cryptoContainer.innerHTML = `
        <div class="last-update">Last updated: ${lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}</div>
        ${sortedCryptos.map(crypto => createCryptoCard(crypto)).join('')}
    `;
    
    // Also update the comparison section
    renderComparison();
}

// Create HTML for a single cryptocurrency card
function createCryptoCard(crypto) {
    // Determine card state (selected for comparison, favorite)
    const isSelected = selectedCryptos.has(crypto.id);
    const isFavorite = favorites.has(crypto.id);
    
    // Format price change data and determine styling
    const priceChange = crypto.price_change_percentage_24h;
    const isPositive = priceChange >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const arrowIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    
    // Build the card HTML with conditional sections based on user preferences
    return `
        <div class="crypto-card ${isSelected ? 'selected' : ''} ${isFavorite ? 'favorite' : ''}" data-id="${crypto.id}">
            <div class="crypto-header">
                <img src="${crypto.image}" alt="${crypto.name} logo" class="crypto-logo">
                <h3>${crypto.name} <span>(${crypto.symbol.toUpperCase()})</span></h3>
            </div>
            <div class="price">
                $${crypto.current_price.toLocaleString()}
            </div>
            ${show24hChange ? `
                <div class="price-change ${changeClass}">
                    <i class="fas ${arrowIcon}"></i>
                    ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%
                </div>
            ` : ''}
            ${showVolume ? `
                <div class="volume">
                    Volume: $${(crypto.total_volume / 1000000000).toFixed(2)}B
                </div>
            ` : ''}
            <div class="market-cap">
                Market Cap: $${(crypto.market_cap / 1000000000).toFixed(2)}B
            </div>
            ${showCharts ? `
                <button onclick="showPriceChart('${crypto.id}')" class="chart-btn">
                    <i class="fas fa-chart-line"></i> View Chart
                </button>
            ` : ''}
            <div class="card-actions">
                <button class="toggle-comparison ${isSelected ? 'remove' : ''}" onclick="toggleComparison('${crypto.id}')">
                    ${isSelected ? 'Remove' : 'Add to Comparison'}
                </button>
                <button class="toggle-favorite" onclick="toggleFavorite('${crypto.id}')">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                </button>
            </div>
        </div>
    `;
}

// Render the comparison section with selected cryptocurrencies
function renderComparison() {
    const selectedCryptoData = cryptocurrencies.filter(crypto => selectedCryptos.has(crypto.id));
    comparisonContainer.innerHTML = selectedCryptoData.map(crypto => createComparisonCard(crypto)).join('');
}

// Create HTML for a single comparison card
function createComparisonCard(crypto) {
    // Similar to createCryptoCard but specifically for the comparison panel
    const isFavorite = favorites.has(crypto.id);
    const priceChange = crypto.price_change_percentage_24h;
    const isPositive = priceChange >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const arrowIcon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
    
    // Comparison cards always show all data regardless of toggle settings
    return `
        <div class="crypto-card comparison-card ${isFavorite ? 'favorite' : ''}" data-id="${crypto.id}">
            <div class="crypto-header">
                <img src="${crypto.image}" alt="${crypto.name} logo" class="crypto-logo">
                <h3>${crypto.name} <span>(${crypto.symbol.toUpperCase()})</span></h3>
            </div>
            <div class="price">
                $${crypto.current_price.toLocaleString()}
            </div>
            <div class="price-change ${changeClass}">
                <i class="fas ${arrowIcon}"></i>
                ${isPositive ? '+' : ''}${priceChange.toFixed(2)}%
            </div>
            <div class="volume">
                Volume: $${(crypto.total_volume / 1000000000).toFixed(2)}B
            </div>
            <div class="market-cap">
                Market Cap: $${(crypto.market_cap / 1000000000).toFixed(2)}B
            </div>
            <div class="card-actions">
                <button class="toggle-comparison remove" onclick="toggleComparison('${crypto.id}')">
                    Remove
                </button>
                <button class="toggle-favorite" onclick="toggleFavorite('${crypto.id}')">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                </button>
            </div>
        </div>
    `;
}

// =======================================
// COMPARISON MANAGEMENT
// =======================================
// Add or remove a cryptocurrency from comparison panel
function toggleComparison(cryptoId) {
    if (selectedCryptos.has(cryptoId)) {
        // Remove if already in comparison
        selectedCryptos.delete(cryptoId);
    } else if (selectedCryptos.size < MAX_COMPARISON) {
        // Add if under the maximum limit
        selectedCryptos.add(cryptoId);
    } else {
        // Show alert if trying to add more than the maximum
        alert(`You can only compare up to ${MAX_COMPARISON} cryptocurrencies at a time.`);
        return;
    }
    
    savePreferences();
    renderCryptocurrencies();
}

// =======================================
// UTILITY FUNCTIONS
// =======================================
// Update button text and style based on active state
function updateButtonState(button, isActive, iconClass, label) {
    button.innerHTML = `<i class="fas ${iconClass}"></i> ${isActive ? 'Hide' : 'Show'} ${label}`;
    if (isActive) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
} 