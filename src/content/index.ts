// Content Script for Smart Scraper v2

console.log('Smart Scraper v2 content script loaded')

// Capture page HTML and store it
function capturePageHTML() {
  const htmlContent = document.documentElement.outerHTML
  const pageData = {
    title: document.title,
    url: window.location.href,
    html: htmlContent,
    htmlSize: htmlContent.length,
    timestamp: new Date().toISOString()
  }

  // Store in chrome storage (Chrome has a 10MB limit per item)
  chrome.storage.local.set({ currentPageHTML: pageData }, () => {
    console.log('Page HTML captured and stored:', pageData.title, 'Size:', pageData.htmlSize, 'bytes')
  })

  return pageData
}

// Capture HTML when page loads
window.addEventListener('load', () => {
  setTimeout(() => {
    capturePageHTML()
    chrome.runtime.sendMessage({ type: 'PAGE_LOADED', url: window.location.href }).catch(err => {
      console.log('Background not ready yet')
    })
  }, 500)
})

// Also capture on DOMContentLoaded in case page is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(capturePageHTML, 1000)
  })
} else {
  setTimeout(capturePageHTML, 500)
}

// Element selection mode
let isSelectionMode = false
let highlightOverlay: HTMLElement | null = null

function startSelectionMode() {
  console.log('[SELECTION MODE] Started')
  isSelectionMode = true

  // Create overlay containers for hierarchy
  const overlayContainer = document.createElement('div')
  overlayContainer.id = 'smart-scraper-overlays'
  overlayContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999998;
  `
  document.body.appendChild(overlayContainer)

  // Add instruction tooltip
  const tooltip = document.createElement('div')
  tooltip.id = 'smart-scraper-tooltip'
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    background: #1b5e20;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `
  tooltip.innerText = '💭 Hover to highlight • Click to select • Esc to cancel'
  document.body.appendChild(tooltip)

  // Mouse move listener
  const handleMouseMove = (e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)

    // Clear previous overlays
    const overlayContainer = document.getElementById('smart-scraper-overlays')
    if (overlayContainer) {
      overlayContainer.innerHTML = ''
    }

    if (el && el !== document.body && el !== document.documentElement && el.id !== 'smart-scraper-tooltip') {
      // Build element hierarchy
      const hierarchy: Element[] = []
      let current: Element | null = el

      while (current && current !== document.body && current !== document.documentElement) {
        hierarchy.push(current)
        current = current.parentElement
      }

      // Draw overlays for each level in hierarchy
      hierarchy.forEach((element, index) => {
        const rect = element.getBoundingClientRect()
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          pointer-events: none;
          z-index: ${999999 - index};
        `

        // Current element (0) = solid, parent (1) = dashed, grandparent (2+) = dotted
        if (index === 0) {
          // Direct element - solid green border
          overlay.style.border = '3px solid #1b5e20'
          overlay.style.background = 'rgba(27, 94, 32, 0.1)'
        } else if (index === 1) {
          // Parent - dashed green border
          overlay.style.border = '3px dashed #2d5016'
          overlay.style.background = 'rgba(45, 80, 22, 0.05)'
        } else {
          // Grandparent and beyond - dotted green border
          overlay.style.border = '2px dotted #1b5e20'
          overlay.style.background = 'transparent'
        }

        if (overlayContainer) {
          overlayContainer.appendChild(overlay)
        }
      })
    }
  }

  // Click listener
  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    if (el && el !== document.body && el !== document.documentElement) {
      selectElement(el as Element)
    }
  }

  // Escape listener
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelSelectionMode()
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('keydown', handleKeyDown)

  // Store listeners for cleanup
  ;(window as any).smartScraperListeners = { handleMouseMove, handleClick, handleKeyDown }
}

function cancelSelectionMode() {
  console.log('[SELECTION MODE] Cancelled')
  isSelectionMode = false

  // Remove overlay container
  const overlayContainer = document.getElementById('smart-scraper-overlays')
  if (overlayContainer) {
    overlayContainer.remove()
  }

  if (highlightOverlay) {
    highlightOverlay.remove()
    highlightOverlay = null
  }

  const tooltip = document.getElementById('smart-scraper-tooltip')
  if (tooltip) tooltip.remove()

  // Remove the green selection border if it exists
  const selectionBorder = document.getElementById('smart-scraper-selection-border')
  if (selectionBorder) {
    selectionBorder.remove()
    console.log('[SELECTION] Green border removed')
  }

  const listeners = (window as any).smartScraperListeners
  if (listeners) {
    document.removeEventListener('mousemove', listeners.handleMouseMove)
    document.removeEventListener('click', listeners.handleClick, true)
    document.removeEventListener('keydown', listeners.handleKeyDown)
  }
}

function selectElement(element: Element) {
  console.log('[SELECTION MODE] Element selected:', element.tagName, element)

  // Remove any previous selection border
  const previousBorder = document.getElementById('smart-scraper-selection-border')
  if (previousBorder) {
    previousBorder.remove()
  }

  // Generate CSS selector
  const selector = generateCSSSelector(element)
  const visibleText = (element.innerText || element.textContent || '').trim().substring(0, 500)

  // Get relevant attributes
  const attributes: Record<string, string> = {}
  const relevantAttrs = ['id', 'class', 'alt', 'title', 'aria-label', 'src', 'href', 'data-testid', 'name', 'type', 'placeholder']
  relevantAttrs.forEach(attr => {
    const value = element.getAttribute(attr)
    if (value) attributes[attr] = value
  })

  // Capture full outer HTML (all children included)
  const fullOuterHTML = element.outerHTML
  const outerHTML_snippet = fullOuterHTML.length > 50000 ? fullOuterHTML.substring(0, 50000) + '...' : fullOuterHTML

  console.log('[SELECTION] Full HTML size:', fullOuterHTML.length, 'bytes')
  console.log('[SELECTION] Element has', element.children.length, 'direct children')

  const payload = {
    tagName: element.tagName.toLowerCase(),
    visibleText,
    attributes,
    outerHTML_snippet,
    fullHTMLSize: fullOuterHTML.length,
    childrenCount: element.children.length,
    robustSelector: selector,
    boundingRect: {
      x: element.getBoundingClientRect().x,
      y: element.getBoundingClientRect().y,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height
    },
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  }

  // Remove highlight overlay and tooltip first
  if (highlightOverlay) {
    highlightOverlay.remove()
    highlightOverlay = null
  }

  const tooltip = document.getElementById('smart-scraper-tooltip')
  if (tooltip) tooltip.remove()

  // Remove event listeners
  const listeners = (window as any).smartScraperListeners
  if (listeners) {
    document.removeEventListener('mousemove', listeners.handleMouseMove)
    document.removeEventListener('click', listeners.handleClick, true)
    document.removeEventListener('keydown', listeners.handleKeyDown)
  }

  isSelectionMode = false

  // Create persistent selection border AFTER cleanup
  setTimeout(() => {
    console.log('[SELECTION] Creating border, element:', element, 'visible:', element.offsetParent !== null)

    const rect = element.getBoundingClientRect()
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft
    const scrollTop = window.scrollY || document.documentElement.scrollTop

    console.log('[SELECTION] Element rect:', { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    console.log('[SELECTION] Scroll offset:', { scrollLeft, scrollTop })

    const selectionBorder = document.createElement('div')
    selectionBorder.id = 'smart-scraper-selection-border'

    // For position: absolute, add scroll values to convert viewport coords to document coords
    selectionBorder.style.position = 'absolute'
    selectionBorder.style.left = (rect.left + scrollLeft) + 'px'
    selectionBorder.style.top = (rect.top + scrollTop) + 'px'
    selectionBorder.style.width = rect.width + 'px'
    selectionBorder.style.height = rect.height + 'px'
    selectionBorder.style.border = '4px solid #28a745'
    selectionBorder.style.background = 'rgba(40, 167, 69, 0.15)'
    selectionBorder.style.pointerEvents = 'none'
    selectionBorder.style.zIndex = '2147483647' // Max z-index
    selectionBorder.style.boxShadow = '0 0 10px rgba(40, 167, 69, 0.8)'

    console.log('[SELECTION] Border styles set, appending to document.documentElement')
    document.documentElement.appendChild(selectionBorder)

    const checkBorder = document.getElementById('smart-scraper-selection-border')
    console.log('[SELECTION] Border in DOM after append:', checkBorder !== null, checkBorder)
    console.log('[SELECTION] Border computed style:', window.getComputedStyle(selectionBorder).position, window.getComputedStyle(selectionBorder).zIndex)
  }, 50)

  // Send to background script
  chrome.runtime.sendMessage({ type: 'ELEMENT_SELECTED', payload }, response => {
    console.log('[SELECTION MODE] Element payload sent to background')
  })
}

function generateCSSSelector(element: Element): string {
  if (element.id) return `#${element.id}`

  let path: string[] = []
  let el: Element | null = element

  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.tagName.toLowerCase()

    if (el.id) {
      selector = `#${el.id}`
      path.unshift(selector)
      break
    } else {
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c).slice(0, 2)
        if (classes.length > 0) {
          selector += '.' + classes.join('.')
        }
      }

      let sibling = el.previousElementSibling
      let nth = 1
      while (sibling) {
        if (sibling.tagName.toLowerCase() === selector.split('.')[0]) {
          nth++
        }
        sibling = sibling.previousElementSibling
      }
      if (nth > 1) {
        selector += `:nth-of-type(${nth})`
      }

      path.unshift(selector)
    }

    el = el.parentElement
  }

  return path.join(' > ')
}

// Listen for messages from sidebar/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script message:', request)

  if (request.type === 'GET_PAGE_HTML') {
    const pageData = {
      title: document.title,
      url: window.location.href,
      html: document.documentElement.outerHTML,
    }
    sendResponse(pageData)
  } else if (request.type === 'START_SELECTION') {
    startSelectionMode()
    sendResponse({ status: 'selection_mode_started' })
  } else if (request.type === 'CANCEL_SELECTION') {
    cancelSelectionMode()
    sendResponse({ status: 'selection_mode_cancelled' })
  } else if (request.type === 'CLEAR_HIGHLIGHTS') {
    // Remove the green selection border when element is removed
    const selectionBorder = document.getElementById('smart-scraper-selection-border')
    if (selectionBorder) {
      selectionBorder.remove()
    }
    sendResponse({ status: 'highlights_cleared' })
  }
})
