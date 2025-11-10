export interface ElementPayload {
  tagName: string
  visibleText: string
  attributes: Record<string, string>
  outerHTML_snippet: string
  robustSelector: string
  boundingRect: {
    x: number
    y: number
    width: number
    height: number
  }
  pageURL: string
  timestamp: string
}

export function serializeElement(element: Element): ElementPayload {
  const rect = element.getBoundingClientRect()

  // Get visible text
  const visibleText = element.innerText || element.textContent || ''

  // Get relevant attributes
  const relevantAttrs = ['id', 'class', 'alt', 'title', 'aria-label', 'src', 'href', 'data-testid', 'name', 'type', 'placeholder']
  const attributes: Record<string, string> = {}

  relevantAttrs.forEach(attr => {
    const value = element.getAttribute(attr)
    if (value) {
      attributes[attr] = value
    }
  })

  // Generate CSS selector
  const selector = generateCSSSelector(element)

  // Get outer HTML snippet (max 10KB)
  const outerHTML = element.outerHTML
  const outerHTML_snippet = outerHTML.length > 10000 ? outerHTML.substring(0, 10000) + '...' : outerHTML

  return {
    tagName: element.tagName.toLowerCase(),
    visibleText: visibleText.trim().substring(0, 500),
    attributes,
    outerHTML_snippet,
    robustSelector: selector,
    boundingRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    },
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  }
}

function generateCSSSelector(element: Element): string {
  // Try to generate a unique CSS selector
  if (element.id) {
    return `#${element.id}`
  }

  let path: string[] = []
  let el: Element | null = element

  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.tagName.toLowerCase()

    if (el.id) {
      selector = `#${el.id}`
      path.unshift(selector)
      break
    } else {
      // Add class if exists
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c).slice(0, 2) // Limit to 2 classes
        if (classes.length > 0) {
          selector += '.' + classes.join('.')
        }
      }

      // Add nth-child if needed
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
