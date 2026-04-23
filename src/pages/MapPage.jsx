import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getWeatherIcon } from '../utils/helpers';
import { getDistanceFromLatLonInKm } from '../utils/helpers';

// ─── Color Scale (module-level, pure function) ────────────────────────────────
function getLayerColor(layerId, value) {
  if (layerId === 'rain') {
    if (value > 50) return '#7f1d1d';
    if (value > 20) return '#ef4444';
    if (value > 10) return '#f59e0b';
    if (value > 2)  return '#3b82f6';
    if (value > 0.1) return '#93c5fd';
    return 'transparent';
  }
  if (layerId === 'temp') {
    if (value > 40) return '#7f1d1d';
    if (value > 35) return '#ef4444';
    if (value > 30) return '#f97316';
    if (value > 25) return '#f59e0b';
    if (value > 0)  return '#3b82f6';
    return 'transparent';
  }
  if (layerId === 'heat') {
    if (value > 52) return '#7f1d1d';
    if (value > 42) return '#ef4444';
    if (value > 33) return '#f97316';
    if (value > 27) return '#f59e0b';
    if (value > 0)  return '#3b82f6';
    return 'transparent';
  }
  if (layerId === 'pm25') {
    if (value > 150) return '#991b1b';
    if (value > 100) return '#ef4444';
    if (value > 50)  return '#f97316';
    if (value > 37.5) return '#f59e0b';
    if (value > 15)  return '#eab308';
    if (value > 0)   return '#22c55e';
    return 'transparent';
  }
  if (layerId === 'wind') {
    if (value > 60) return '#ef4444';
    if (value > 40) return '#f97316';
    if (value > 25) return '#f59e0b';
    if (value > 10) return '#22c55e';
    if (value > 0)  return '#93c5fd';
    return 'transparent';
  }
  if (layerId === 'humidity') {
    if (value > 90) return '#1e3a8a';
    if (value > 70) return '#3b82f6';
    if (value > 50) return '#60a5fa';
    if (value > 30) return '#93c5fd';
    if (value > 0)  return '#dbeafe';
    return 'transparent';
  }
  return '#3b82f6';
}

// ─── IDW Canvas Layer ──────────────────────────────────────────────────────────
function IDWLayer({ stations, stationTemps, activeLayer }) {
  const map = useMap();

  useEffect(() => {
    const LAT_MIN = 5.5, LAT_MAX = 20.5;
    const LON_MIN = 97.5, LON_MAX = 105.8;
    const W = 150, H = 250;

    // Build data points for the current layer
    const points = [];
    (stations || []).forEach(station => {
      const lat = parseFloat(station.lat);
      const lon = parseFloat(station.long);
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return;
      if (lat < LAT_MIN || lat > LAT_MAX || lon < LON_MIN || lon > LON_MAX) return;

      const tObj = stationTemps?.[station.stationID];
      let val = 0;
      if (activeLayer === 'temp')     val = tObj?.temp || 0;
      else if (activeLayer === 'heat')    val = tObj?.feelsLike || 0;
      else if (activeLayer === 'rain')    val = (tObj?.rainProb || 0) / 2;
      else if (activeLayer === 'pm25')    val = Number(station.AQILast?.PM25?.value) || 0;
      else if (activeLayer === 'wind')    val = tObj?.windSpeed || 0;
      else if (activeLayer === 'humidity') val = tObj?.humidity || 0;

      if (val > 0) points.push({ lat, lon, val });
    });

    if (points.length < 5) return;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(W, H);

    // IDW interpolation (power=2, row-major loop)
    for (let py = 0; py < H; py++) {
      const lat = LAT_MAX - (py / H) * (LAT_MAX - LAT_MIN);
      const cosLat = Math.cos(lat * Math.PI / 180);

      for (let px = 0; px < W; px++) {
        const lon = LON_MIN + (px / W) * (LON_MAX - LON_MIN);

        let numerator = 0, denominator = 0;
        let minDist2 = Infinity;
        let exact = false;

        for (const pt of points) {
          const dlat = lat - pt.lat;
          const dlon = (lon - pt.lon) * cosLat;
          const d2 = dlat * dlat + dlon * dlon;

          if (d2 < minDist2) minDist2 = d2;

          if (d2 < 0.0001) {
            numerator = pt.val;
            denominator = 1;
            exact = true;
            break;
          }

          const w = 1 / d2; // IDW power = 2
          numerator += w * pt.val;
          denominator += w;
        }

        const val = denominator > 0 ? numerator / denominator : 0;
        const idx = (py * W + px) * 4;

        const colorHex = getLayerColor(activeLayer, val);
        if (colorHex === 'transparent') {
          imageData.data[idx + 3] = 0;
          continue;
        }

        // Alpha fades with distance to nearest station
        const minDist = exact ? 0 : Math.sqrt(minDist2);
        const alpha = minDist < 1.5 ? 180 :
                      minDist < 4.0 ? Math.round(180 * (1 - (minDist - 1.5) / 2.5)) :
                      0;

        if (alpha <= 0) { imageData.data[idx + 3] = 0; continue; }

        imageData.data[idx]     = parseInt(colorHex.slice(1, 3), 16);
        imageData.data[idx + 1] = parseInt(colorHex.slice(3, 5), 16);
        imageData.data[idx + 2] = parseInt(colorHex.slice(5, 7), 16);
        imageData.data[idx + 3] = alpha;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    const overlay = L.imageOverlay(dataUrl, [[LAT_MIN, LON_MIN], [LAT_MAX, LON_MAX]], {
      opacity: 1.0,
      interactive: false,
    });
    overlay.addTo(map);

    return () => { overlay.remove(); };
  }, [map, stations, stationTemps, activeLayer]);

  return null;
}

// ─── ChangeView helper ────────────────────────────────────────────────────────
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MapPage() {
  const { darkMode, stations, stationTemps } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { weatherData, fetchWeatherByCoords } = useWeatherData();
  const [activeLayer, setActiveLayer] = useState('pm25');
  const [showIDW, setShowIDW] = useState(true);
  const [timelineIndex, setTimelineIndex] = useState(24);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nearbyTab, setNearbyTab] = useState('pm25');
  const playInterval = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!weatherData) fetchWeatherByCoords(13.75, 100.5);
  }, [fetchWeatherByCoords, weatherData]);

  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        setTimelineIndex(prev => (prev >= 24 ? 0 : prev + 1));
      }, 500);
    } else {
      clearInterval(playInterval.current);
    }
    return () => clearInterval(playInterval.current);
  }, [isPlaying]);

  // Next 6 hours forecast from real Open-Meteo data
  const hourlyForecast = useMemo(() => {
    const hourly = weatherData?.hourly;
    if (!hourly?.time) return [];
    const nowMs = Date.now();
    const startIdx = hourly.time.findIndex(t => new Date(t).getTime() >= nowMs) || 0;
    return hourly.time.slice(startIdx, startIdx + 6).map((t, i) => {
      const rIdx = startIdx + i;
      const rain = hourly.precipitation_probability?.[rIdx] || 0;
      const temp = Math.round(hourly.temperature_2m?.[rIdx] || 0);
      const hour = new Date(t).getHours();
      const night = hour >= 18 || hour < 6;
      let icon = night ? '🌙' : '☀️';
      if (rain > 50) icon = '⛈️';
      else if (rain > 20) icon = '🌧️';
      else if (rain > 0) icon = night ? '☁️' : '🌥️';
      return {
        time: new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        temp,
        icon,
        rain
      };
    });
  }, [weatherData]);

  // 5 nearest provinces to Bangkok (excluding Bangkok itself if present)
  const nearbyStations = useMemo(() => {
    const bkkLat = 13.75, bkkLon = 100.5;
    return (stations || [])
      .map(s => {
        const lat = parseFloat(s.lat), lon = parseFloat(s.long);
        if (isNaN(lat) || isNaN(lon) || lat === 0) return null;
        return {
          name: s.nameTH || s.stationID,
          stationID: s.stationID,
          dist: getDistanceFromLatLonInKm(bkkLat, bkkLon, lat, lon),
          pm25: Number(s.AQILast?.PM25?.value) || 0,
          temp: stationTemps?.[s.stationID]?.temp || 0,
          rain: stationTemps?.[s.stationID]?.rainProb || 0,
          wind: stationTemps?.[s.stationID]?.windSpeed || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [stations, stationTemps]);

  const { current } = weatherData || {};
  const weatherInfo = getWeatherIcon(current?.weatherCode);

  const panelBg = darkMode ? 'rgba(15, 30, 54, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const panelBorder = 'var(--border-color)';
  const textColor = 'var(--text-main)';
  const subTextColor = 'var(--text-sub)';
  const mapCenter = [13.75, 100.5];

  const floatingPanelStyle = {
    position: 'absolute',
    zIndex: 1000,
    background: panelBg,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '24px',
    boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.1)',
    border: `1px solid ${darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)'}`,
    color: textColor
  };

  const layers = [
    { id: 'pm25',     icon: '🌫️', title: 'PM2.5',         subtitle: 'µg/m³',     color: '#f59e0b' },
    { id: 'temp',     icon: '🌡️', title: 'อุณหภูมิ',      subtitle: '°C',        color: '#ef4444' },
    { id: 'heat',     icon: '🥵', title: 'ความรู้สึกร้อน', subtitle: '°C',        color: '#f97316' },
    { id: 'rain',     icon: '🌧️', title: 'ฝนสะสม',        subtitle: 'มม./ชม.',   color: '#3b82f6' },
    { id: 'wind',     icon: '💨', title: 'ลม',             subtitle: 'km/h',      color: '#10b981' },
    { id: 'humidity', icon: '💧', title: 'ความชื้น',       subtitle: '%',         color: '#8b5cf6' },
  ];

  const LayerItem = ({ item }) => {
    const active = activeLayer === item.id;
    return (
      <div onClick={() => setActiveLayer(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: active ? (darkMode ? '#1e3a8a' : '#eff6ff') : 'transparent', borderRadius: '12px', cursor: 'pointer', border: active ? `1px solid ${darkMode ? '#3b82f6' : '#bfdbfe'}` : '1px solid transparent', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.2rem', width: '24px', textAlign: 'center', filter: active ? 'none' : 'grayscale(100%)', opacity: active ? 1 : 0.6 }}>{item.icon}</div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: active ? 'bold' : '600', color: active ? item.color : textColor }}>{item.title}</div>
            <div style={{ fontSize: '0.65rem', color: subTextColor }}>{item.subtitle}</div>
          </div>
        </div>
        {active && <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem' }}>✓</div>}
      </div>
    );
  };

  // Current date/time in Thai format
  const nowThaiDate = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const nowThaiTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'Sarabun, sans-serif' }}>

      {/* 🗺️ LEAFLET MAP */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <MapContainer center={mapCenter} zoom={6} zoomControl={false} style={{ width: '100%', height: '100%', background: darkMode ? '#0f172a' : '#bfe8ff' }}>
          <TileLayer
            url={darkMode
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* IDW Heatmap Layer */}
          {showIDW && stations && stations.length > 0 && (
            <IDWLayer
              stations={stations}
              stationTemps={stationTemps}
              activeLayer={activeLayer}
            />
          )}

          {/* Station Markers */}
          {stations && stations.map((station, i) => {
            const lat = parseFloat(station.lat);
            const lon = parseFloat(station.long);
            if (isNaN(lat) || isNaN(lon) || lat === 0) return null;

            const tObj = stationTemps?.[station.stationID];
            let val = 0;
            if (activeLayer === 'temp')     val = tObj?.temp || 0;
            if (activeLayer === 'heat')     val = tObj?.feelsLike || 0;
            if (activeLayer === 'rain')     val = (tObj?.rainProb || 0) / 2;
            if (activeLayer === 'pm25')     val = Number(station.AQILast?.PM25?.value) || 0;
            if (activeLayer === 'wind')     val = tObj?.windSpeed || 0;
            if (activeLayer === 'humidity') val = tObj?.humidity || 0;

            if (val === 0 && (activeLayer === 'pm25' || activeLayer === 'temp')) return null;

            const color = getLayerColor(activeLayer, val);
            if (color === 'transparent') return null;

            const unit = activeLayer === 'temp' || activeLayer === 'heat' ? '°C' :
                         activeLayer === 'wind' ? 'km/h' :
                         activeLayer === 'humidity' ? '%' :
                         activeLayer === 'rain' ? 'มม.' : 'µg/m³';

            return (
              <CircleMarker
                key={station.stationID || i}
                center={[lat, lon]}
                radius={8}
                fillColor={color}
                fillOpacity={0.9}
                color="#fff"
                weight={1.5}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div style={{ fontFamily: 'Sarabun', fontWeight: 'bold', minWidth: '80px' }}>
                    {station.nameTH || station.name}<br/>
                    <span style={{ color }}>
                      {Math.round(val)} {unit}
                    </span>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* 🟢 TOP DATE INDICATOR */}
      <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: panelBg, backdropFilter: 'blur(8px)', padding: '8px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', color: textColor, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {nowThaiDate} <span style={{ color: '#3b82f6' }}>{nowThaiTime}</span> ▾
      </div>

      {/* 🟢 LEFT PANEL: LAYERS */}
      {!isMobile && (
        <div style={{ ...floatingPanelStyle, top: '24px', left: '24px', width: '300px', maxHeight: 'calc(100% - 140px)', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '20px', borderBottom: `1px solid ${panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>ชั้นข้อมูลแผนที่</h3>
             <span style={{ fontSize: '0.8rem', cursor: 'pointer', opacity: 0.5 }}>ⓘ</span>
          </div>

          <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            {layers.map(layer => <LayerItem key={layer.id} item={layer} />)}

            <div style={{ marginTop: '20px', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>การแสดงผล</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginBottom: '10px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked /> แสดงสถานีตรวจวัด
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => setShowIDW(v => !v)}>
              <input type="checkbox" checked={showIDW} onChange={() => setShowIDW(v => !v)} /> แสดง IDW Heatmap
            </label>
          </div>
        </div>
      )}

      {/* 🟢 BOTTOM LEFT: TIMELINE */}
      {!isMobile && (
        <div style={{ ...floatingPanelStyle, bottom: '24px', left: '24px', right: '400px', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#3b82f6' }}>› {layers.find(l => l.id === activeLayer)?.title} ย้อนหลัง 24 ชั่วโมง</div>
              <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setTimelineIndex(24)}>ปัจจุบัน</div>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setIsPlaying(!isPlaying)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: isPlaying ? '#ef4444' : '#fff', color: isPlaying ? '#fff' : '#000', border: `1px solid ${panelBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0 }}>
                {isPlaying ? '⏸' : '▶'}
              </button>

              <div style={{ flex: 1, position: 'relative', height: '30px', display: 'flex', alignItems: 'center' }}>
                 <div style={{ width: '100%', height: '4px', background: darkMode ? '#334155' : '#cbd5e1', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(timelineIndex/24)*100}%`, background: '#3b82f6', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                 </div>
                 <div style={{ position: 'absolute', left: `calc(${(timelineIndex/24)*100}% - 8px)`, width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)', top: '50%', transform: 'translateY(-50%)', cursor: 'grab', transition: 'left 0.3s' }}></div>
              </div>
           </div>

           {/* Color Legend */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>ระดับค่า — {layers.find(l => l.id === activeLayer)?.title}</div>
              {activeLayer === 'rain' && (
                <>
                  <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'linear-gradient(to right, #e0f2fe, #93c5fd, #3b82f6, #f59e0b, #ef4444, #7f1d1d)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: subTextColor }}>
                     <span>0</span><span>0.1</span><span>2</span><span>10</span><span>20</span><span>50+</span>
                  </div>
                </>
              )}
              {activeLayer === 'pm25' && (
                <>
                  <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'linear-gradient(to right, #22c55e, #eab308, #f59e0b, #f97316, #ef4444, #991b1b)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: subTextColor }}>
                     <span>0</span><span>15</span><span>37.5</span><span>50</span><span>100</span><span>150+</span>
                  </div>
                </>
              )}
              {(activeLayer === 'temp' || activeLayer === 'heat') && (
                <>
                  <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'linear-gradient(to right, #3b82f6, #f59e0b, #f97316, #ef4444, #7f1d1d)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: subTextColor }}>
                     <span>&lt;25</span><span>30</span><span>35</span><span>40</span><span>42+</span>
                  </div>
                </>
              )}
              {activeLayer === 'wind' && (
                <>
                  <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'linear-gradient(to right, #93c5fd, #22c55e, #f59e0b, #f97316, #ef4444)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: subTextColor }}>
                     <span>0</span><span>10</span><span>25</span><span>40</span><span>60+</span>
                  </div>
                </>
              )}
              {activeLayer === 'humidity' && (
                <>
                  <div style={{ width: '100%', height: '12px', borderRadius: '6px', background: 'linear-gradient(to right, #dbeafe, #93c5fd, #60a5fa, #3b82f6, #1e3a8a)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: subTextColor }}>
                     <span>0%</span><span>30%</span><span>50%</span><span>70%</span><span>90%+</span>
                  </div>
                </>
              )}
           </div>
        </div>
      )}

      {/* 🟢 RIGHT PANEL: LOCATION INFO */}
      {!isMobile && (
        <div style={{ position: 'absolute', top: '24px', right: '80px', width: '340px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1000 }}>

           {/* Top Toggles */}
           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <div style={{ display: 'flex', background: panelBg, backdropFilter: 'blur(8px)', borderRadius: '20px', padding: '4px', border: `1px solid ${panelBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                 <button style={{ padding: '6px 16px', borderRadius: '16px', background: 'transparent', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, cursor: 'pointer' }}>🌍 ภาพดาวเทียม</button>
                 <button style={{ padding: '6px 16px', borderRadius: '16px', background: '#3b82f6', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}>★ แผนที่</button>
              </div>
           </div>

           {/* Location Card */}
           <div style={{ ...floatingPanelStyle, position: 'relative', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>กรุงเทพมหานคร</h2>
                   <div style={{ fontSize: '0.8rem', color: subTextColor, marginTop: '2px' }}>ค่าเฉลี่ยจาก Open-Meteo</div>
                 </div>
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.5 }}>☆</button>
                    <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.5 }}>✕</button>
                 </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current?.temp || 0)}<span style={{ fontSize: '1.5rem', fontWeight: 'normal', verticalAlign: 'top' }}>°C</span></div>
                 <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{weatherInfo.text}</div>
                    <div style={{ fontSize: '0.8rem', color: subTextColor }}>รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C</div>
                 </div>
                 <div style={{ fontSize: '2.5rem', marginLeft: 'auto' }}>{weatherInfo.icon}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${panelBorder}`, borderBottom: `1px solid ${panelBorder}`, padding: '12px 0' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1.2rem', color: '#3b82f6' }}>🌧️</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{current?.rainProb || 0}%</div>
                      <div style={{ fontSize: '0.65rem', color: subTextColor }}>ฝน</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1.2rem', color: '#22c55e' }}>💨</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{Math.round(current?.windSpeed || 0)} <span style={{fontSize:'0.6rem'}}>km/h</span></div>
                      <div style={{ fontSize: '0.65rem', color: subTextColor }}>ลม</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1.2rem', color: '#f59e0b' }}>🌫️</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{Math.round(current?.pm25 || 0)}</div>
                      <div style={{ fontSize: '0.65rem', color: subTextColor }}>PM2.5</div>
                    </div>
                 </div>
              </div>

              <div>
                 <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px' }}>พยากรณ์ 6 ชั่วโมงข้างหน้า</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
                    {hourlyForecast.length > 0 ? hourlyForecast.map((h, i) => (
                       <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '44px' }}>
                          <div style={{ fontSize: '0.7rem', color: subTextColor }}>{h.time}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{h.temp}°</div>
                          <div style={{ fontSize: '1.2rem' }}>{h.icon}</div>
                          <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 'bold' }}>{h.rain}%</div>
                       </div>
                    )) : ['--','--','--','--','--','--'].map((_, i) => (
                       <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '44px' }}>
                          <div style={{ fontSize: '0.7rem', color: subTextColor }}>--:--</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>--°</div>
                          <div style={{ fontSize: '1.2rem' }}>☁️</div>
                          <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 'bold' }}>--%</div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Nearby Stats */}
           <div style={{ ...floatingPanelStyle, position: 'relative', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '1rem', fontWeight: '800' }}>สถานีใกล้เคียง (กรุงเทพฯ)</div>

              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px' }}>
                 {[
                   { id: 'pm25', label: 'PM2.5' },
                   { id: 'temp', label: 'อุณหภูมิ' },
                   { id: 'rain', label: 'ฝน' },
                   { id: 'wind', label: 'ลม' },
                 ].map(t => (
                   <button key={t.id} onClick={() => setNearbyTab(t.id)} style={{ flex: 1, padding: '6px', borderRadius: '8px', background: nearbyTab === t.id ? '#3b82f6' : 'transparent', color: nearbyTab === t.id ? '#fff' : subTextColor, border: 'none', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>{t.label}</button>
                 ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {nearbyStations.length > 0 ? nearbyStations.map((s, i) => {
                   const val = nearbyTab === 'pm25' ? s.pm25 :
                               nearbyTab === 'temp' ? s.temp :
                               nearbyTab === 'rain' ? s.rain :
                               s.wind;
                   const unit = nearbyTab === 'temp' ? '°C' :
                                nearbyTab === 'rain' ? '%' :
                                nearbyTab === 'wind' ? 'km/h' : 'µg/m³';
                   const label = nearbyTab === 'pm25' ? 'PM2.5' :
                                 nearbyTab === 'temp' ? 'อุณหภูมิ' :
                                 nearbyTab === 'rain' ? 'โอกาสฝน' : 'ลม';
                   return (
                     <div key={s.stationID || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>📍</span>
                           <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>{s.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span style={{ fontSize: '0.7rem', color: subTextColor }}>{label}</span>
                           <strong style={{ width: '40px', textAlign: 'right' }}>{val > 0 ? Math.round(val) : '--'}</strong>
                           <span style={{ fontSize: '0.7rem', color: subTextColor, width: '30px' }}>{unit}</span>
                        </div>
                     </div>
                   );
                 }) : (
                   <div style={{ color: subTextColor, fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>กำลังโหลดข้อมูล...</div>
                 )}
              </div>

              <button style={{ width: '100%', padding: '10px 0 0 0', marginTop: '4px', background: 'transparent', border: 'none', borderTop: `1px solid ${panelBorder}`, color: '#3b82f6', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                 ดูทั้งหมด
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
