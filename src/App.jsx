import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { WeatherProvider } from './context/WeatherContext';
import LoadingScreen from './components/LoadingScreen';

import Dashboard from './pages/Dashboard';
const MapPage = lazy(() => import('./pages/MapPage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));

function RouteFallback() {
  return <LoadingScreen title="กำลังเปิดหน้า" subtitle="เตรียมข้อมูลล่าสุดให้พร้อมแสดงผล" />;
}

function App() {
  return (
    <WeatherProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<Suspense fallback={<RouteFallback />}><MapPage /></Suspense>} />
          <Route path="ai" element={<Suspense fallback={<RouteFallback />}><AIPage /></Suspense>} />
          <Route path="news" element={<Suspense fallback={<RouteFallback />}><NewsPage /></Suspense>} />
        </Route>
      </Routes>
    </WeatherProvider>
  );
}

export default App;
