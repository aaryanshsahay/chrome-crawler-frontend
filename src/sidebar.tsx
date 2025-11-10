import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('app')

if (root) {
  // Add styling to the root container
  root.style.width = '100%'
  root.style.height = '100%'
  root.style.display = 'flex'
  root.style.flexDirection = 'column'

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
