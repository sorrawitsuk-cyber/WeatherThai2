import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// นำเข้าไฟล์หน้าต่างๆ (เช็คชื่อไฟล์ให้ตรงกับในโฟลเดอร์ pages ของคุณนะครับ)
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import ForecastPage from './pages/ForecastPage';
import ClimatePage from './pages/ClimatePage'; // <- ไฟล์นี้คือหน้าเตือนภัยที่เราทำไว้

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* หน้าหลัก ภาพรวม */}
        <Route index element={<Dashboard />} />
        
        {/* หน้าแผนที่ */}
        <Route path="map" element={<MapPage />} />
        
        {/* หน้า AI ผู้ช่วย */}
        <Route path="forecast" element={<ForecastPage />} />
        
        {/* 🚨 หน้าเตือนภัย (คือเส้นทางที่มันหาไม่เจอ) */}
        <Route path="alerts" element={<ClimatePage />} />
      </Route>
    </Routes>
  );
}

export default App;