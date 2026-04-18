import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { WeatherProvider } from './context/WeatherContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const MapPage = lazy(() => import('./pages/MapPage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-main)',
        fontFamily: 'Kanit, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>Loading...</div>
        <div style={{ color: 'var(--text-sub)' }}>Preparing the latest air quality data.</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <WeatherProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<MapPage />} />
            <Route path="ai" element={<AIPage />} />
            <Route path="news" element={<NewsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </WeatherProvider>
  );
}

export default App;
