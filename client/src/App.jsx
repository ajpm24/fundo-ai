import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import GrantSearch from './pages/GrantSearch'
import GrantDetail from './pages/GrantDetail'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Profile from './pages/Profile'
import Alerts from './pages/Alerts'

export default function App() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, marginLeft: 220, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/grants" element={<GrantSearch />} />
          <Route path="/grants/:id" element={<GrantDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </main>
    </div>
  )
}
