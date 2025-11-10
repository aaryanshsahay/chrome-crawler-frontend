import { useState } from 'react'
import './App.css'

function App() {
  const [isScraperActive, setIsScraperActive] = useState(false)
  const [scrapedData, setScrapedData] = useState([])

  const handleStartScraping = () => {
    setIsScraperActive(true)
    // Simulate scraping
    setTimeout(() => {
      setScrapedData([
        { title: 'Sample Data 1', url: 'https://example.com' },
        { title: 'Sample Data 2', url: 'https://example.org' },
        { title: 'Sample Data 3', url: 'https://example.net' }
      ])
      setIsScraperActive(false)
    }, 2000)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>🔍 Smart Scraper v2</h1>
          <p className="subtitle">Intelligent Web Data Extraction</p>
        </div>
      </header>

      <main className="app-main">
        <section className="scraper-section">
          <div className="info-box">
            <p>Extract and organize data from any webpage with ease.</p>
          </div>

          <button
            className={`action-button ${isScraperActive ? 'loading' : ''}`}
            onClick={handleStartScraping}
            disabled={isScraperActive}
          >
            {isScraperActive ? (
              <>
                <span className="spinner"></span>
                Scraping...
              </>
            ) : (
              '▶ Start Scraping Current Page'
            )}
          </button>

          {scrapedData.length > 0 && (
            <div className="results-section">
              <h2>Scraped Data</h2>
              <div className="data-list">
                {scrapedData.map((item, index) => (
                  <div key={index} className="data-item">
                    <h3>{item.title}</h3>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.url}
                    </a>
                  </div>
                ))}
              </div>
              <button className="secondary-button" onClick={() => setScrapedData([])}>
                Clear Results
              </button>
            </div>
          )}
        </section>

        <section className="features-section">
          <h3>Features</h3>
          <ul className="features-list">
            <li>⚡ Fast and efficient scraping</li>
            <li>🎯 Smart data selection</li>
            <li>📊 Export capabilities</li>
            <li>🔒 Privacy focused</li>
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <p>Smart Scraper v2.0 • Made for you</p>
      </footer>
    </div>
  )
}

export default App
