// src/router.jsx
import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

// Layouts
import MarketingLayout from './marketing/MarketingLayout'
import AppLayout from './app/AppLayout'

// Marketing Pages
import Login from './marketing/pages/Login'
import Landing from './marketing/pages/Landing'
import Getstarted from './marketing/pages/Getstarted'

// App Pages
import AppLanding from './app/pages/AppLanding'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      { path: '', element: <Landing /> },
      { path: 'login', element: <Login /> },
      { path: 'getstarted', element: <Getstarted /> }
    ]
  },
  {
    path: '/app',
    element: <AppLayout/>,
    children: [
      {path: '', element: <AppLanding/>}
    ]
  }
])

export default router