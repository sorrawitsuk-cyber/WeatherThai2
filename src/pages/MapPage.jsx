// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { WeatherContext } from '../context/WeatherContext';
import 'leaflet/dist/leaflet.css';

// ฟังก์ชันดักจับการคลิกบนแผนที่
function LocationMarker({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPage() {
  const { weatherData, fetchWeatherByCoords, loading, darkMode } = useContext(WeatherContext);
  
  const [activeMode, setActiveMode] = useState('pm25');
  const [mapStyle, setMapStyle] = useState('dark'); 
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [clickPos, setClickPos] = useState(null);

  const modes = [
    { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#0ea5e9', type: 'leaflet' },
    { id: 'heat', label: 'Heat Index', icon: '🥵', color: '#f97316', type: 'leaflet' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️', color: '#eab308', type: 'leaflet' },
    { id: 'rain', label: 'โอกาสฝน', icon: '☔', color: '#3b82f6', type: 'leaflet' },
    { id: 'humidity', label: 'ความชื้น', icon: '💧', color: '#10b981', type: 'leaflet' },
    { id: 'wind', label: 'ความเร็วลม', icon: '🌬️', color: '#db2777', type: 'leaflet' },
    { id: 'radar', label: 'เรดาร์ฝน', icon: '⛈️', color: '#8b5cf6', type: 'windy', layer: 'rain' }
  ];

  const currentModeObj = modes.find(m => m.id === activeMode) || modes[0];
  const isWindy = currentModeObj.type === 'windy';

  const handleMapClick = (lat, lon) => {
    if (isWindy) return; // ไม่ให้คลิกตอนเปิดเรดาร์ Windy
    setClickPos({ lat, lon });
    fetchWeatherByCoords(lat, lon);
  };

  const mapBg = darkMode ? '#0f172a' : '#f8fafc';
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const getTileUrl = () => {
    if (mapStyle === 'dark' || (mapStyle === 'standard' && darkMode)) return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    if (mapStyle === 'satellite') return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: mapBg, overflow: 'hidden', fontFamily: 'Kanit' }}>
      
      {/* 🗺️ แผนที่ Leaflet หลัก */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: isWindy ? -1 : 1, opacity: isWindy ? 0 : 1 }}>
        <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={getTileUrl()} />
          <LocationMarker onMapClick={handleMapClick} />

          {/* หมุดโชว์ข้อมูลที่เราจิ้ม */}
          {clickPos && weatherData && (
            <Marker position={[clickPos.lat, clickPos.lon]}>
              <Popup closeButton={true}>
                <div style={{ padding: '10px', fontFamily: 'Kanit', minWidth: '150px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0ea5e9' }}>📍 ข้อมูลจุดนี้</h4>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🌡️ {Math.round(weatherData.current.temp)}°C</div>
                  <div style={{ fontSize: '0.9rem' }}>😷 PM2.5: <b>{weatherData.current.pm25}</b></div>
                  <div style={{ fontSize: '0.9rem' }}>☔ ฝน: <b>{weatherData.current.rain} mm</b></div>
                  <hr style={{ margin: '10px 0', opacity: 0.2 }} />
                  <div style={{ fontSize: '0.7rem', color: '#666' }}>GPS: {clickPos.lat.toFixed(2)}, {clickPos.lon.toFixed(2)}</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* 🌟 แผนที่ Windy (เฉพาะตอนกดเรดาร์ฝน) */}
      {isWindy && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, background: mapBg }}>
          <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=6&level=surface&overlay=${currentModeObj.layer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`} frameBorder="0" title="Windy Map"></iframe>
        </div>
      )}

      {/* 🎛️ Top Bar (แถบปุ่มเลเยอร์) */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 1000, display: 'flex', gap: '15px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '6px 8px', border: `1px solid ${borderColor}` }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', margin: '0 8px' }}>🎛️ เลเยอร์:</span>
          {modes.map(mode => (
            <button key={mode.id} onClick={() => setActiveMode(mode.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '50px', border: 'none', background: activeMode === mode.id ? mode.color : 'transparent', color: activeMode === mode.id ? '#fff' : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', marginRight: '4px' }}>
              <span style={{ fontSize: '1rem' }}>{mode.icon}</span>{mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 🌟 ปุ่มจัดอันดับด้านขวา */}
      <div style={{ position: 'absolute', top: 80, right: 20, zIndex: 1000 }}>
        {!isWindy && (
          <button onClick={() => setIsRankingOpen(!isRankingOpen)} style={{ background: isRankingOpen ? '#8b5cf6' : cardBg, color: isRankingOpen ? '#fff' : textColor, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
            <span style={{ fontSize: '1.2rem' }}>📈</span> {isRankingOpen ? 'ปิดหน้าต่าง' : 'เปิดข้อมูลเมือง'}
          </button>
        )}
      </div>

      {/* 🌟 แถบ Leaderboard ด้านขวา (เอาโครงเดิมกลับมา) */}
      <div style={{ 
        position: 'absolute', top: 0, bottom: 0, right: 0, width: '380px', zIndex: 9998, 
        background: cardBg, borderLeft: `1px solid ${borderColor}`,
        transform: isRankingOpen ? 'translateX(0)' : 'translateX(105%)', transition: 'transform 0.4s',
        display: 'flex', flexDirection: 'column', paddingTop: '100px', fontFamily: 'Kanit'
      }}>
        <div style={{ padding: '0 25px 15px', borderBottom: `1px solid ${borderColor}` }}>
          <h3 style={{ margin: 0, color: textColor }}>🏆 ข้อมูลจังหวัด (เร็วๆ นี้)</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>ระบบกำลังรวบรวมข้อมูล 77 จังหวัดทั่วประเทศ</p>
        </div>
      </div>

      {/* 🌟 Tooltip ช่วยสอนการใช้งาน */}
      {!isWindy && !clickPos && (
        <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#0ea5e9', color: '#fff', padding: '10px 25px', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', pointerEvents: 'none', animation: 'bounce 2s infinite' }}>
          👆 ทดลองคลิกจุดไหนก็ได้บนแผนที่เพื่อดูสภาพอากาศ ณ ตำแหน่งนั้น!
        </div>
      )}

      <style dangerouslySetInlineStyle={{__html:`@keyframes bounce { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -10px); } }`}} />
    </div>
  );
}