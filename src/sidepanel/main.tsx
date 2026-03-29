import React from 'react'
import ReactDOM from 'react-dom/client'
import '../assets/main.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="p-4 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Hello Side Panel</h1>
      <p className="text-gray-700">Powered by Vite, React, and Tailwind v4!</p>
    </div>
  </React.StrictMode>,
)
