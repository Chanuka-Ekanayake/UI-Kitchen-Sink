import React from 'react'
import { createRoot } from 'react-dom/client'
import '../assets/main.css'
import { CheckCircle } from 'lucide-react' // Step 1: Import

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div className="p-4 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
      {/* Step 2: Use the component in your JSX */}
      <CheckCircle className="w-12 h-12 text-validator-green mb-2" />

      <h1 className="text-2xl font-bold text-brand-primary mb-1">Engine Online</h1>
      <p className="text-gray-700">Dependencies Verified & Ready!</p>
    </div>
  </React.StrictMode>,
)