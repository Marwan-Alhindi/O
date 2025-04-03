// src/router.jsx
import React from 'react'
import { createBrowserRouter } from 'react-router-dom'

// Layouts
import MarketingLayout from './marketing/MarketingLayout'
import AppLayout from './app/AppLayout'

// Marketing Pages
import Landing from './marketing/pages/Landing'

// App Pages

const router = createBrowserRouter([
  {
    path: '/',
    element: <MarketingLayout />,
    children: [
      { path: '', element: <Landing /> },
    //   { path: 'pricing', element: <Pricing /> }
    ]
  },
//   {
//     path: '/app',
//     element: <AppLayout />,
//     children: [
//       { path: 'dashboard', element: <Dashboard /> },
//       { path: 'profile', element: <Profile /> }
//     ]
//   }
])

export default router