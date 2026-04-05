// src/pages/MapPage.jsx
import React, { useContext, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { WeatherContext } from '../context/WeatherContext';
import 'leaflet/dist/leaflet.css';

// ฟังก์ชันดักจับการคลิกบนแผนที่
function LocationMarker({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPage() {
  const { weatherData, fetchWeatherByCoords, darkMode } = useContext(WeatherContext);
  const [clickPos, setClickPos] = useState(null);

  const handleMapClick = (lat, lon) => {
    setClickPos({ lat, lon });
    fetchWeatherByCoords(lat, lon); // ดึงข้อมูลพิกัดที่จิ้มทันที
  };

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
        
        <LocationMarker onMapClick={handleMapClick} />

        {clickPos && weatherData && (
          <Marker position={[clickPos.lat, clickPos.lon]}>
            <Popup minWidth={200}>
              <div style={{ fontFamily: 'Kanit' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0ea5e9' }}>📍 ข้อมูลพิกัดนี้</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🌡️ {weatherData.current.temp}°C</div>
                <div style={{ fontSize: '0.9rem' }}>😷 PM2.5: <b>{weatherData.current.pm25}</b></div>
                <div style={{ fontSize: '0.9rem' }}>☔ ฝน: <b>{weatherData.current.rain} mm</b></div>
                <hr style={{ margin: '10px 0', opacity: 0.2 }} />
                <div style={{ fontSize: '0.7rem', color: '#666' }}>พิกัด: {clickPos.lat.toFixed(4)}, {clickPos.lon.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* แถบแจ้งเตือนด้านล่างแผนที่ */}
      <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '10px 20px', borderRadius: '50px', fontSize: '0.8rem', pointerEvents: 'none' }}>
        🖱️ คลิกจุดไหนก็ได้บนแผนที่เพื่อดูสภาพอากาศแบบ Real-time
      </div>
    </div>
  );
}