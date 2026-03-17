import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import GrantSearch from './pages/GrantSearch'
import GrantDetail from './pages/GrantDetail'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Profile from './pages/Profile'
import Alerts from './pages/Alerts'
import Projects from './pages/Projects'
import QuickMatch from './pages/QuickMatch'

export default function App() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  if (isLanding) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, marginLeft: 220, overflowY: 'auto' }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grants" element={<GrantSearch />} />
          <Route path="/grants/:id" element={<GrantDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/quickmatch" element={<QuickMatch />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </main>
    </div>
  )
}
