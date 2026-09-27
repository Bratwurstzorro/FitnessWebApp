import React from 'react'
import { createRoot } from 'react-dom/client'
import TrainingApp from './features/training/TrainingApp'
import './styles.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><TrainingApp /></React.StrictMode>)
