// src/router.jsx
import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

// Layouts
import MarketingLayout from './marketing/MarketingLayout'
import AppLayout from './app/AppLayout'


// Marketing Pages
import Login from './marketing/pages/Login'
import Landing from './marketing/pages/Landing'

// App Pages

const router = createBrowserRouter([
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      { path: '', element: <Landing /> },
      { path: 'login', element: <Login /> }
    ]
  }
])

export default router