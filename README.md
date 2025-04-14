# Cryptocurrency Tracker

A modern web application for tracking and comparing cryptocurrency prices, market caps, and other statistics in real-time.

## Features

- **Real-time Data**: Up-to-date cryptocurrency information fetched from CoinGecko API
- **Compare Cryptocurrencies**: Select up to 5 cryptocurrencies to compare side by side
- **Favorites System**: Save your favorite cryptocurrencies for quick access
- **Customizable Display**: Toggle 24-hour change, volume data, and price charts
- **Sorting Options**: Sort cryptocurrencies by market cap, price, or name
- **Dark/Light Theme**: Choose your preferred viewing mode
- **Data Export**: Export comparison data to CSV format
- **Market Statistics**: View total market capitalization, volume, and Bitcoin dominance

## Usage

1. Browse the list of top 100 cryptocurrencies sorted by market cap
2. Add cryptocurrencies to your comparison panel (max 5)
3. Toggle display settings using the control buttons
4. Add cryptocurrencies to favorites for quick access
5. View detailed price charts by clicking "View Chart"
6. Export comparison data to CSV for further analysis
7. Switch between dark and light themes using the toggle

## Technologies Used

- HTML5
- CSS3 (with Flexbox/Grid for responsive design)
- JavaScript (ES6+)
- Chart.js for data visualization
- CoinGecko API v3 for cryptocurrency data
- LocalStorage for persisting user preferences

## Setup

No build process or dependencies to install. Simply open `index.html` in a modern web browser.

```
git clone https://github.com/c0956274/Cryptocurrency-Tracker.git
cd cryptocurrency-tracker
open index.html
```

## Data Refresh

The application automatically refreshes cryptocurrency data every 60 seconds. The last update time is displayed at the top of the cryptocurrency list.

## API Usage Notes

This project uses the free tier of the CoinGecko API, which has rate limits. If you encounter issues with data fetching, the application will automatically retry up to 3 times. 