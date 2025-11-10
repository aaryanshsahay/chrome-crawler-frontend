import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { askOpenAI } from '../../services/openai'
import { AuthForm } from '../../components/AuthForm'
import { onAuthStateChange, saveSearchMetrics, getCredits, decrementCredits } from '../../services/supabase'

const SidebarApp = () => {
  const [isScraperActive, setIsScraperActive] = useState(false)
  const [scrapedData, setScrapedData] = useState<Array<{ title: string; url: string }>>([])
  const [searchInput, setSearchInput] = useState('')
  const [closeButtonHovered, setCloseButtonHovered] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<any>(null)
  const [responseView, setResponseView] = useState<'data' | 'raw'>('data')
  const [editableTable, setEditableTable] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchBoxHovered, setSearchBoxHovered] = useState(false)
  const [hasSelectedElement, setHasSelectedElement] = useState(false)
  const [elementPreview, setElementPreview] = useState<any>(null)
  const [selectButtonHovered, setSelectButtonHovered] = useState(false)
  const [credits, setCredits] = useState<{ credits_used: number; credits_remaining: number } | null>(null)
  const [creditsExhausted, setCreditsExhausted] = useState(false)

  // Add custom logging function
  const addLog = (message: string) => {
    console.log('[SIDEBAR]', message)
  }

  // Subscribe to auth state changes
  useEffect(() => {
    // addLog('🔐 Setting up auth state listener')
    const subscription = onAuthStateChange(async (currentUser) => {
      // addLog(currentUser ? `✅ User authenticated: ${currentUser.email}` : '❌ User logged out')
      setUser(currentUser)
      setAuthLoading(false)

      // Load credits when user logs in
      if (currentUser) {
        const creditsData = await getCredits()
        if (creditsData) {
          setCredits(creditsData)
          setCreditsExhausted(creditsData.credits_remaining === 0)
          // addLog(`💳 Credits loaded: ${creditsData.credits_used}/${creditsData.credits_remaining}`)
        }
      } else {
        setCredits(null)
        setCreditsExhausted(false)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Handle ESC key to cancel selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        // addLog('🔑 ESC pressed - cancelling selection mode')
        handleCancelElementSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelectionMode])

  // Check if element has been selected
  useEffect(() => {
    const checkSelectedElement = async () => {
      const result = await new Promise<{ selectedElement?: any }>((resolve) => {
        chrome.storage.local.get('selectedElement', (result) => {
          resolve(result)
        })
      })
      if (result.selectedElement) {
        setHasSelectedElement(true)
        setElementPreview(result.selectedElement)
      } else {
        setHasSelectedElement(false)
        setElementPreview(null)
      }
    }

    checkSelectedElement()

    // Set up a listener for storage changes
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes.selectedElement) {
        const newValue = changes.selectedElement.newValue
        setHasSelectedElement(!!newValue)
        setElementPreview(newValue || null)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  // Parse JSON and get table data
  const parseJSONForTable = (jsonStr: string): { headers: string[], rows: any[][] } | null => {
    try {
      const json = JSON.parse(jsonStr)

      // Handle array of objects
      if (Array.isArray(json)) {
        if (json.length === 0) return null
        const headers = Object.keys(json[0])
        const rows = json.map(obj => headers.map(key => obj[key]))
        return { headers, rows }
      }

      // Handle object with nested data
      if (json.data) {
        if (Array.isArray(json.data)) {
          if (json.data.length === 0) return null
          const headers = Object.keys(json.data[0])
          const rows = json.data.map(obj => headers.map(key => obj[key]))
          return { headers, rows }
        } else if (typeof json.data === 'object') {
          const headers = Object.keys(json.data)
          const rows = [headers.map(key => json.data[key])]
          return { headers, rows }
        }
      }

      return null
    } catch (e) {
      return null
    }
  }

  // Handle cell value change
  const handleCellChange = (rowIdx: number, cellIdx: number, newValue: string) => {
    if (!editableTable) return

    const updatedRows = [...editableTable.rows]
    updatedRows[rowIdx][cellIdx] = newValue
    setEditableTable({ ...editableTable, rows: updatedRows })
  }

  // Download as CSV
  const downloadAsCSV = () => {
    if (!editableTable) return

    const { headers, rows } = editableTable
    let csvContent = headers.join(',') + '\n'

    rows.forEach(row => {
      const escapedRow = row.map(cell => {
        const stringValue = typeof cell === 'object' ? JSON.stringify(cell) : String(cell)
        return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
      })
      csvContent += escapedRow.join(',') + '\n'
    })

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent))
    element.setAttribute('download', `data-${new Date().getTime()}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Render table component
  const renderTable = (jsonStr: string) => {
    const tableData = parseJSONForTable(jsonStr)

    if (!tableData) {
      return (
        <div style={csvContainerStyle}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {jsonStr}
          </pre>
        </div>
      )
    }

    // Initialize editable table on first render
    if (!editableTable) {
      setEditableTable(tableData)
    }

    const currentTable = editableTable || tableData

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={csvContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {currentTable.headers.map((header, idx) => (
                  <th key={idx} style={tableHeaderStyle}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.rows.map((row, rowIdx) => (
                <tr key={rowIdx} style={rowIdx % 2 === 1 ? tableRowAltStyle : {}}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} style={{ ...tableCellStyle, padding: '4px' }}>
                      <input
                        type="text"
                        value={typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                        onChange={(e) => handleCellChange(rowIdx, cellIdx, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '3px',
                          color: '#fff',
                          fontSize: '12px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Start element selection mode
  const handleStartElementSelection = async () => {
    // addLog('🎯 Starting element selection mode')
    setIsSelectionMode(true)

    // Get current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SELECTION' }, response => {
        // addLog('✅ Selection mode activated')
      })
    }
  }

  // Cancel element selection mode
  const handleCancelElementSelection = async () => {
    // addLog('❌ Cancelling element selection')
    setIsSelectionMode(false)
    setSelectButtonHovered(false)

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      try {
        await chrome.tabs.sendMessage(tabs[0].id, { type: 'CANCEL_SELECTION' })
        // addLog('✅ Selection mode cancelled')
      } catch (err) {
        // addLog('⚠️ Failed to send cancel message to content script')
      }
    }
  }

  // Remove selected element
  const handleRemoveElement = async () => {
    // addLog('🗑️ Removing selected element')

    // Clear highlights from the page
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      try {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CLEAR_HIGHLIGHTS' })
      } catch (err) {
        // addLog('⚠️ Failed to clear highlights from page')
      }
    }

    chrome.storage.local.remove('selectedElement', () => {
      setHasSelectedElement(false)
      setElementPreview(null)
      setSearchInput('')
      setAiResponse('')
    })
  }

  const handleSearch = async () => {
    if (!hasSelectedElement) {
      // addLog('⚠️ Please select an element first')
      return
    }

    // Check if credits are exhausted before searching
    if (credits && credits.credits_used >= credits.credits_remaining) {
      // addLog('❌ Daily credit limit reached. Cannot perform search.')
      setCreditsExhausted(true)
      return
    }

    if (searchInput.trim()) {
      setIsLoading(true)
      // addLog('🔍 Starting search with query: ' + searchInput)
      try {
        // addLog('📦 Checking for selected element...')
        // First check if there's a selected element
        const selectedElementData = await new Promise<{ selectedElement?: any }>((resolve) => {
          chrome.storage.local.get('selectedElement', (result) => {
            resolve(result)
          })
        })

        let htmlToAnalyze = ''
        let htmlSource = ''

        if (selectedElementData.selectedElement) {
          // Use the selected element's HTML
          htmlToAnalyze = selectedElementData.selectedElement.outerHTML_snippet
          htmlSource = 'selected element'
          // addLog(`✅ Using selected element HTML. Size: ${htmlToAnalyze.length} bytes`)
          // addLog(`📄 Element tag: ${selectedElementData.selectedElement.tagName}`)
          // addLog(`📝 Element text: ${selectedElementData.selectedElement.visibleText.substring(0, 100)}...`)
        } else {
          // Fall back to entire page HTML
          // addLog('⚠️ No selected element, using full page HTML...')
          const pageData = await new Promise<{ currentPageHTML?: any }>((resolve) => {
            chrome.storage.local.get('currentPageHTML', (result) => {
              resolve(result)
            })
          })

          htmlToAnalyze = pageData.currentPageHTML?.html
          htmlSource = 'full page'
          const htmlSize = htmlToAnalyze?.length || 0
          // addLog(`✅ Page HTML fetched. Size: ${htmlSize} bytes`)
          // addLog(`📄 Page title: ${pageData.currentPageHTML?.title}`)
          // addLog(`🌐 Page URL: ${pageData.currentPageHTML?.url}`)
        }

        if (!htmlToAnalyze) {
          // addLog('❌ No HTML data found!')
          setAiResponse('No HTML data found. Please select an element or make sure you are on a webpage.')
          setIsLoading(false)
          return
        }

        // addLog(`🤖 Sending ${htmlSource} to OpenAI API...`)
        const response = await askOpenAI(searchInput, htmlToAnalyze)
        // addLog('✅ OpenAI Response received')
        setAiResponse(response)
        setEditableTable(null) // Reset editable table for new response
        setResponseView('data') // Auto-switch to data view

        // Save metrics to Supabase
        try {
          const selectedElement = selectedElementData.selectedElement?.visibleText || ''
          // Extract domain from the page URL stored in selectedElement
          let domain = 'unknown'
          if (selectedElementData.selectedElement?.pageURL) {
            try {
              const url = new URL(selectedElementData.selectedElement.pageURL)
              domain = url.hostname
            } catch (e) {
              domain = 'unknown'
            }
          }
          await saveSearchMetrics({
            user_input: searchInput,
            domain: domain,
            selected_element: selectedElement,
            output: response
          })
          // addLog('📊 Metrics saved to Supabase')

          // Decrement credits after successful search
          try {
            const updatedCredits = await decrementCredits()
            if (updatedCredits && updatedCredits[0]) {
              setCredits({
                credits_used: updatedCredits[0].credits_used,
                credits_remaining: updatedCredits[0].credits_remaining
              })
              setCreditsExhausted(updatedCredits[0].credits_remaining === 0)
              // addLog(`💳 Credits updated - Used: ${updatedCredits[0].credits_used}, Remaining: ${updatedCredits[0].credits_remaining}`)
              if (updatedCredits[0].credits_remaining === 0) {
                // addLog('⚠️ Daily credit limit reached!')
              }
            }
          } catch (creditError) {
            // addLog('⚠️ Failed to update credits: ' + (creditError instanceof Error ? creditError.message : String(creditError)))
          }
        } catch (metricsError) {
          console.error('Full metrics error:', metricsError)
          const errorMessage = metricsError instanceof Error
            ? metricsError.message
            : typeof metricsError === 'object' && metricsError !== null
            ? JSON.stringify(metricsError)
            : String(metricsError)
          // addLog('⚠️ Failed to save metrics: ' + errorMessage)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        // addLog('❌ Error: ' + errorMsg)
        setAiResponse('Error: ' + errorMsg)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleStartScraping = () => {
    setIsScraperActive(true)
    setTimeout(() => {
      setScrapedData([
        { title: 'Sample Data 1', url: 'https://example.com' },
        { title: 'Sample Data 2', url: 'https://example.org' },
        { title: 'Sample Data 3', url: 'https://example.net' }
      ])
      setIsScraperActive(false)
    }, 2000)
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#a5a58d',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
    color: '#333',
  }

  const headerStyle: React.CSSProperties = {
    background: '#a5a58d',
    padding: '20px',
    boxShadow: 'none',
    textAlign: 'center',
  }

  const headerTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '24px',
    color: '#fff',
    fontWeight: 600,
  }

  const headerSubtitleStyle: React.CSSProperties = {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#e0e0e0',
    fontWeight: 400,
  }

  const mainStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'hidden',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
  }

  const sectionStyle: React.CSSProperties = {
    background: '#a5a58d',
    borderRadius: '0',
    padding: '20px',
    marginBottom: '0',
    boxShadow: 'none',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'hidden',
  }

  const infoBoxStyle: React.CSSProperties = {
    background: '#f0f4ff',
    borderLeft: '4px solid #667eea',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
  }

  const infoBoxTextStyle: React.CSSProperties = {
    margin: 0,
    color: '#555',
    fontSize: '14px',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: isScraperActive ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: isScraperActive ? 0.7 : 1,
    transform: isScraperActive ? 'none' : 'translateY(0)',
  }

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: 'white',
    animation: 'spin 0.8s linear infinite',
  }

  const resultsSectionStyle: React.CSSProperties = {
    marginTop: '20px',
    animation: 'slideIn 0.3s ease',
  }

  const resultsTitleStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    fontSize: '16px',
    color: '#333',
  }

  const dataItemStyle: React.CSSProperties = {
    background: '#f8f9fa',
    padding: '12px',
    borderRadius: '6px',
    borderLeft: '3px solid #667eea',
    marginBottom: '10px',
  }

  const dataItemTitleStyle: React.CSSProperties = {
    margin: '0 0 6px 0',
    fontSize: '13px',
    color: '#333',
    fontWeight: 600,
  }

  const dataItemLinkStyle: React.CSSProperties = {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '12px',
    wordBreak: 'break-all',
  }

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    background: '#f0f4ff',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  const featuresListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  }

  const featureItemStyle: React.CSSProperties = {
    padding: '8px 0',
    fontSize: '13px',
    color: '#555',
    borderBottom: '1px solid #eee',
  }

  const footerStyle: React.CSSProperties = {
    background: '#a5a58d',
    padding: '12px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#333',
    borderTop: 'none',
  }

  const footerTextStyle: React.CSSProperties = {
    margin: 0,
  }

  const searchContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '0 16px',
    border: '1px solid #e0e0e0',
    height: '44px',
    boxSizing: 'border-box',
  }

  const searchInputStyle: React.CSSProperties = {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    color: '#333',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const searchIconStyle: React.CSSProperties = {
    color: '#a5a58d',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const responseBoxStyle: React.CSSProperties = {
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1.5',
    wordWrap: 'break-word',
    overflowY: 'hidden',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  }

  const loadingTextStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '14px',
    fontStyle: 'italic',
  }

  const selectElementButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0 4px',
    background: isSelectionMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.15)',
    color: '#fff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '44px',
    boxSizing: 'border-box',
  }

  const viewToggleContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    marginBottom: '12px',
  }

  const viewToggleButtonStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 12px',
    background: active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    border: active ? '2px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  })

  const csvContainerStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    padding: '12px',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#fff',
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  }

  const tableHeaderStyle: React.CSSProperties = {
    background: '#a5a58d',
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    fontSize: '12px',
  }

  const tableCellStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    fontSize: '12px',
    wordBreak: 'break-word',
    maxWidth: '200px',
  }

  const tableRowAltStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
  }

  const elementPreviewStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
    marginBottom: '12px',
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const previewHeaderStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  }

  const previewCodeStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '11px',
    color: '#fff',
    fontFamily: 'monospace',
    overflow: 'auto',
    flex: 1,
    lineHeight: '1.4',
    wordBreak: 'break-all',
  }

  const previewTagStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#e0e0e0',
    marginTop: '6px',
  }

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
        }
        html, body, #app {
          margin: 0;
          padding: 0;
          border: 0;
        }
        button {
          outline: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        button:focus {
          outline: none;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={containerStyle}>
        <header style={{ ...headerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {user && !authLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/icons/spider.png" alt="Chrome Crawler" style={{ width: '32px', height: '32px' }} />
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>Chrome Crawler</h1>
            </div>
          )}
          {user && !authLoading && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', paddingTop: '4px' }}>
              <img
                src="/icons/user.png"
                alt="User"
                style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                onClick={() => setShowUserMenu(!showUserMenu)}
              />
              {showUserMenu && (
                <div style={{ position: 'absolute', top: '40px', right: 0, background: 'rgba(0, 0, 0, 0.6)', padding: '12px 16px', borderRadius: '6px', minWidth: '200px', zIndex: 1000 }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#fff', marginBottom: '8px' }}>{user.email}</p>
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '8px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#e0e0e0', marginBottom: '4px' }}>Credits Used</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
                      {credits ? `${credits.credits_used}/${credits.credits_remaining}` : 'Loading...'}
                    </p>
                    <a href="mailto:support@chromecrawler.com" style={{ fontSize: '11px', color: '#b8b6a3', textDecoration: 'underline', cursor: 'pointer' }}>Request more "support@chromecrawler.com"</a>
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.2)', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          const { signOut } = await import('../../services/supabase')
                          await signOut()
                          setShowUserMenu(false)
                          // addLog('👋 Signed out')
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ff6b6b',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <main style={mainStyle}>
          <section style={sectionStyle}>
            {authLoading ? (
              <div style={{ ...responseBoxStyle, marginTop: 0, marginBottom: '16px' }}>
                <p style={loadingTextStyle}>Loading authentication...</p>
              </div>
            ) : (
              <AuthForm user={user} onAuthSuccess={() => addLog('✅ Auth state updated')} />
            )}

            {user && (
              <>
            <button
              style={{
                ...selectElementButtonStyle,
                margin: 0,
                marginTop: '12px',
                border: (searchBoxHovered && !hasSelectedElement) || selectButtonHovered
                  ? '2px solid #fff'
                  : selectElementButtonStyle.border,
                width: '100%'
              }}
              onClick={() => {
                if (isSelectionMode) {
                  handleCancelElementSelection()
                } else if (hasSelectedElement) {
                  handleRemoveElement()
                } else {
                  handleStartElementSelection()
                }
              }}
              onMouseEnter={() => setSelectButtonHovered(true)}
              onMouseLeave={() => setSelectButtonHovered(false)}
            >
              {isSelectionMode ? 'Cancel Selection' : (hasSelectedElement ? 'Remove' : 'Select Element')}
            </button>

            <div style={elementPreviewStyle}>
              <p style={previewHeaderStyle}>Selected Element</p>
              <div style={previewCodeStyle}>
                {elementPreview && hasSelectedElement ? (
                  <>
                    {elementPreview.outerHTML_snippet ? elementPreview.outerHTML_snippet.substring(0, 500) : 'No preview available'}
                  </>
                ) : (
                  'Select an element to get started'
                )}
              </div>
              {elementPreview && hasSelectedElement && (
                <p style={previewTagStyle}>
                  <strong>Tag:</strong> {elementPreview.tagName || 'unknown'}
                  {elementPreview.className && ` | Class: ${elementPreview.className}`}
                </p>
              )}
            </div>

            {creditsExhausted && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(220, 53, 69, 0.15)',
                borderLeft: '4px solid #dc3545',
                borderRadius: '6px',
                color: '#fff'
              }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Daily limit reached</p>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', marginBottom: '8px' }}>
                  Credits will reset at 00:00 UTC time. You can request for more credits at <a href="mailto:support@chromecrawler.com" style={{ color: '#b8b6a3', textDecoration: 'underline' }}>support@chromecrawler.com</a>
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'stretch' }}>
              <div
                style={{ ...searchContainerStyle, marginTop: 0, flex: 1, opacity: hasSelectedElement ? 1 : 0.5 }}
                onMouseEnter={() => !hasSelectedElement && setSearchBoxHovered(true)}
                onMouseLeave={() => setSearchBoxHovered(false)}
              >
              <img
                src="/icons/search.png"
                alt="Search"
                style={{
                  ...searchIconStyle,
                  width: '16px',
                  height: '16px',
                  opacity: hasSelectedElement ? 1 : 0.5,
                  cursor: hasSelectedElement ? 'pointer' : 'not-allowed'
                }}
                onClick={() => hasSelectedElement && handleSearch()}
                title={hasSelectedElement ? "Search" : "Select an element first"}
              />
              <input
                type="text"
                style={{
                  ...searchInputStyle,
                  opacity: hasSelectedElement ? 1 : 0.5,
                  cursor: hasSelectedElement ? 'text' : 'not-allowed',
                  pointerEvents: hasSelectedElement ? 'auto' : 'none'
                }}
                placeholder={hasSelectedElement ? "Extract Data..." : "Select an element first"}
                value={searchInput}
                onChange={(e) => {
                  if (hasSelectedElement) {
                    setSearchInput(e.target.value)
                  }
                }}
                onKeyPress={(e) => {
                  if (hasSelectedElement) {
                    handleSearchKeyPress(e)
                  }
                }}
                disabled={!hasSelectedElement}
              />
              {searchInput && (
                <img
                  src="/icons/close.png"
                  alt="Clear"
                  style={{
                    ...searchIconStyle,
                    width: '16px',
                    height: '16px',
                    opacity: closeButtonHovered ? 1 : 0.6,
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={() => setSearchInput('')}
                  onMouseEnter={() => setCloseButtonHovered(true)}
                  onMouseLeave={() => setCloseButtonHovered(false)}
                  title="Clear"
                />
              )}
              </div>
            </div>

            <p style={{ margin: '-8px 0 0 0', fontSize: '10px', color: '#e0e0e0', lineHeight: '1', textAlign: 'right' }}>
              Credits remaining: {credits ? credits.credits_remaining - credits.credits_used : 'Loading...'}
            </p>

            {(isLoading || aiResponse) && (
              <div style={responseBoxStyle}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    style={viewToggleButtonStyle(responseView === 'data')}
                    onClick={() => setResponseView('data')}
                    disabled={!aiResponse}
                  >
                    Result
                  </button>
                  <button
                    style={{ ...viewToggleButtonStyle(false), flex: 0 }}
                    onClick={downloadAsCSV}
                    disabled={!editableTable}
                    title={editableTable ? "Download as CSV" : "No data to download"}
                    onMouseEnter={(e) => {
                      if (editableTable) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    Download
                  </button>
                  <button
                    style={{ ...viewToggleButtonStyle(responseView === 'raw'), flex: 0 }}
                    onClick={() => setResponseView('raw')}
                    disabled={!aiResponse}
                  >
                    Raw
                  </button>
                </div>

                {isLoading && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 0 }}>
                    <div style={{ ...spinnerStyle, width: '30px', height: '30px', borderWidth: '3px' }}></div>
                  </div>
                )}

                {!isLoading && aiResponse && (
                  <>
                    {responseView === 'data' ? (
                      renderTable(aiResponse)
                    ) : (
                      <div style={csvContainerStyle}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(aiResponse);
                              return JSON.stringify(parsed, null, 2);
                            } catch (e) {
                              return aiResponse;
                            }
                          })()}
                        </pre>
                      </div>
                    )}
                  </>
                )}

              </div>
            )}

            {scrapedData.length > 0 && (
              <div style={resultsSectionStyle}>
                <h2 style={resultsTitleStyle}>Scraped Data</h2>
                <div>
                  {scrapedData.map((item, index) => (
                    <div key={index} style={dataItemStyle}>
                      <h3 style={dataItemTitleStyle}>{item.title}</h3>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={dataItemLinkStyle}>
                        {item.url}
                      </a>
                    </div>
                  ))}
                </div>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => setScrapedData([])}
                >
                  Clear Results
                </button>
              </div>
            )}
              </>
            )}
          </section>


        </main>

        <footer style={footerStyle}>
          <p style={footerTextStyle}>ChromeCrawler © 2025 v0.1. Made with ❤️</p>
        </footer>
      </div>
    </>
  )
}

const root = document.getElementById('app')

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidebarApp />
    </React.StrictMode>
  )
}
