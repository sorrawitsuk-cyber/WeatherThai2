// ==============================================================
// 3. Main App Component
// ==============================================================
export default function App() {
  const [pm25Stations, setPm25Stations] = useState([]);
  const [weatherStations, setWeatherStations] = useState(tmdStations); 
  const [filteredStations, setFilteredStations] = useState([]);
  
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  const [viewMode, setViewMode] = useState('pm25'); 
  const [sortOrder, setSortOrder] = useState('desc'); 
  const [stationTemps, setStationTemps] = useState({});
  const [activeStation, setActiveStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState('');
  const [locating, setLocating] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showRadar, setShowRadar] = useState(false);
  const [radarTime, setRadarTime] = useState(null);
  
  const [activeWeather, setActiveWeather] = useState(null); 
  const [activeForecast, setActiveForecast] = useState(null); 

  const [dashHistory, setDashHistory] = useState([]);
  const [dashForecast, setDashForecast] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashTitle, setDashTitle] = useState('ภาพรวมทั้งประเทศ');

  const [currentPage, setCurrentPage] = useState('map'); 
  const [showStats, setShowStats] = useState(window.innerWidth >= 768);

  const [alertsData, setAlertsData] = useState({ urgent: [], daily: [] });
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [nationwideSummary, setNationwideSummary] = useState(null);

  const cardRefs = useRef({});
  const markerRefs = useRef({});

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if(darkMode) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
  }, [darkMode]);

  const handleViewModeChange = (mode) => { 
    setViewMode(mode); 
    setSortOrder(mode === 'temp' ? 'asc' : 'desc'); 
    setShowRadar(false); 
    setSelectedStationId(''); 
    setActiveStation(null);
  };

  const toggleRadar = async () => {
    if (!showRadar) {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        setRadarTime(data.radar.past[data.radar.past.length - 1].time);
      } catch (err) { console.error("Error fetching radar:", err); }
    }
    setShowRadar(!showRadar);
  };

  // ดึงข้อมูลอากาศ Open-Meteo 127 จุดแบบ Bulk
  const fetchOpenMeteoBulk = async (stationsList) => {
    try {
      const chunks = [stationsList.slice(0, 64), stationsList.slice(64)];
      let allWeather = {};

      for (let chunk of chunks) {
        if(chunk.length === 0) continue;
        const lats = chunk.map(s => s.lat).join(',');
        const lons = chunk.map(s => s.long).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FBangkok`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        const results = Array.isArray(data) ? data : [data];
        
        results.forEach((r, idx) => {
           if (r && r.current && r.daily) {
             allWeather[chunk[idx].stationID] = {
               temp: r.current.temperature_2m,
               feelsLike: r.current.apparent_temperature,
               humidity: r.current.relative_humidity_2m,
               windSpeed: r.current.wind_speed_10m,
               windDir: r.current.wind_direction_10m,
               weatherCode: r.current.weather_code,
               tempMin: r.daily.temperature_2m_min[0],
               tempMax: r.daily.temperature_2m_max[0],
               heatMin: r.daily.temperature_2m_min[0],
               heatMax: r.daily.apparent_temperature_max[0],
               uvMax: r.daily.uv_index_max[0],
               rainProb: r.daily.precipitation_probability_max[0],
               windMax: r.daily.wind_speed_10m_max[0]
             };
           }
        });
      }
      return allWeather;
    } catch (error) {
      console.error("Open-Meteo fetch error:", error);
      return {};
    }
  };

  const fetchAirQuality = async (isBackgroundLoad = false) => {
    if (!isBackgroundLoad) setLoading(true);

    try {
      const PROJECT_ID = "thai-env-dashboard"; 
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/weatherData/latest?t=${new Date().getTime()}`;
      
      const [firebaseRes, openMeteoData] = await Promise.all([
        fetch(url, { cache: 'no-store' }).then(res => res.json()),
        fetchOpenMeteoBulk(tmdStations) 
      ]);
      
      const payloadString = firebaseRes.fields.jsonData.stringValue;
      const parsedData = JSON.parse(payloadString);
      const stations = parsedData.stations || [];
      
      if (stations.length > 0) {
        setPm25Stations(stations);
        setProvinces([...new Set(stations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        setLastUpdateText(`${stations[0]?.AQILast?.date || ''} เวลา ${stations[0]?.AQILast?.time || ''} น.`);
        setStationTemps(openMeteoData); 
      }
    } catch (err) { 
      console.error("Fetch error:", err); 
    } 
    finally { if (!isBackgroundLoad) setLoading(false); }
  };

  useEffect(() => {
    fetchAirQuality();
    const intervalId = setInterval(() => { fetchAirQuality(true); }, 1800000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (pm25Stations.length === 0 || weatherStations.length === 0 || Object.keys(stationTemps).length === 0) return;
    
    let pm25Risks = []; let stormRisks = []; let heatRisks = [];
    
    pm25Stations.forEach(s => {
      const pm = Number(s.AQILast?.PM25?.value);
      if(pm >= 37.5) pm25Risks.push({ prov: extractProvince(s.areaTH), val: pm });
    });
    
    weatherStations.forEach(s => {
      const t = stationTemps[s.stationID];
      if(t) {
        if(t.rainProb >= 40 || t.windMax >= 30) stormRisks.push({ prov: s.areaTH, rain: t.rainProb, wind: t.windMax });
        if(t.heatMax >= 40) heatRisks.push({ prov: s.areaTH, val: t.heatMax });
      }
    });

    pm25Risks.sort((a,b)=>b.val - a.val); 
    stormRisks.sort((a,b)=>Math.max(b.rain, b.wind) - Math.max(a.rain, a.wind)); 
    heatRisks.sort((a,b)=>b.val - a.val);
    
    const uniquePm = []; const pmSet = new Set();
    pm25Risks.forEach(item => { if(!pmSet.has(item.prov)){ pmSet.add(item.prov); uniquePm.push(item); }});

    const uniqueStorm = []; const stormSet = new Set();
    stormRisks.forEach(item => { if(!stormSet.has(item.prov)){ stormSet.add(item.prov); uniqueStorm.push(item); }});

    const uniqueHeat = []; const heatSet = new Set();
    heatRisks.forEach(item => { if(!heatSet.has(item.prov)){ heatSet.add(item.prov); uniqueHeat.push(item); }});

    setNationwideSummary({ pm25: uniquePm.slice(0, 5), storm: uniqueStorm.slice(0, 5), heat: uniqueHeat.slice(0, 5) });
  }, [pm25Stations, weatherStations, stationTemps]);

  useEffect(() => {
    const activeList = viewMode === 'pm25' ? pm25Stations : weatherStations;
    let result = [...activeList];
    
    if (selectedProvince) result = result.filter(s => extractProvince(s.areaTH) === selectedProvince);
    if (selectedStationId) result = result.filter(s => s.stationID === selectedStationId);
    
    result.sort((a, b) => {
      let vA, vB;
      if (viewMode==='pm25') { vA = Number(a.AQILast?.PM25?.value); vB = Number(b.AQILast?.PM25?.value); }
      else if (viewMode==='temp') { vA = stationTemps[a.stationID]?.temp; vB = stationTemps[b.stationID]?.temp; }
      else if (viewMode==='heat') { vA = stationTemps[a.stationID]?.feelsLike; vB = stationTemps[b.stationID]?.feelsLike; }
      else if (viewMode==='uv') { vA = stationTemps[a.stationID]?.uvMax; vB = stationTemps[b.stationID]?.uvMax; }
      else if (viewMode==='rain') { vA = stationTemps[a.stationID]?.rainProb; vB = stationTemps[b.stationID]?.rainProb; }
      else if (viewMode==='wind') { vA = stationTemps[a.stationID]?.windSpeed; vB = stationTemps[b.stationID]?.windSpeed; }
      
      const validA = vA!==undefined && vA!==null && !isNaN(vA) && (viewMode==='rain'?true:vA!==0);
      const validB = vB!==undefined && vB!==null && !isNaN(vB) && (viewMode==='rain'?true:vB!==0);
      if (!validA && validB) return 1; if (validA && !validB) return -1; if (!validA && !validB) return 0;
      return sortOrder === 'desc' ? vB - vA : vA - vB;
    });
    setFilteredStations(result);
  }, [selectedProvince, selectedStationId, pm25Stations, weatherStations, viewMode, sortOrder, stationTemps]);

  useEffect(() => {
    if (activeStation && currentPage === 'map') {
      if (cardRefs.current[activeStation.stationID]) cardRefs.current[activeStation.stationID].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const marker = markerRefs.current[activeStation.stationID];
      if (marker && !showRadar) marker.openPopup(); 
      setActiveWeather(null); setActiveForecast(null);
      
      const fetchCardDetails = async () => {
        try {
          const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${activeStation.lat}&longitude=${activeStation.long}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
          const resW = await fetch(urlWeather); const wData = await resW.json();
          let tempF=[], heatF=[], uvF=[], rainF=[], windF=[];
          if (wData.daily && wData.daily.time) {
            for (let i = 0; i < wData.daily.time.length; i++) {
              const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
              let tLabel = i===0?'วันนี้':i===1?'พรุ่งนี้':days[new Date(wData.daily.time[i]).getDay()];
              tempF.push({ time: tLabel, val: Math.round(wData.daily.temperature_2m_max[i]||0), minVal: Math.round(wData.daily.temperature_2m_min[i]||0), colorInfo: getTempColor(wData.daily.temperature_2m_max[i]) });
              heatF.push({ time: tLabel, val: Math.round(wData.daily.apparent_temperature_max[i]||0), colorInfo: getHeatIndexAlert(wData.daily.apparent_temperature_max[i]) });
              if(wData.daily.uv_index_max[i] !== null && wData.daily.uv_index_max[i] !== undefined){ uvF.push({ time: tLabel, val: Math.round(wData.daily.uv_index_max[i]||0), colorInfo: getUvColor(wData.daily.uv_index_max[i]) }); }
              rainF.push({ time: tLabel, val: Math.round(wData.daily.precipitation_probability_max[i]||0), colorInfo: getRainColor(wData.daily.precipitation_probability_max[i]) });
              windF.push({ time: tLabel, val: Math.round(wData.daily.wind_speed_10m_max[i]||0), colorInfo: getWindColor(wData.daily.wind_speed_10m_max[i]) });
            }
          }
          setActiveWeather({ tempForecast:tempF, heatForecast:heatF, uvForecast:uvF, rainForecast:rainF, windForecast:windF });

          const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=4`;
          const resAqi = await fetch(urlAqi); const aData = await resAqi.json();
          if (aData && aData.hourly && aData.hourly.pm2_5) {
            const now = new Date().getTime(); let sIdx = aData.hourly.time.findIndex(t => new Date(t).getTime()>=now); if (sIdx===-1) sIdx=0;
            const currentReal = Number(activeStation.AQILast?.PM25?.value);
            let offset = (!isNaN(currentReal) && aData.hourly.pm2_5[sIdx] !== undefined) ? currentReal - aData.hourly.pm2_5[sIdx] : 0;
            const pmF = [];
            for (let i = sIdx; i < aData.hourly.time.length && pmF.length < 24; i += 3) {
              if(aData.hourly.pm2_5[i] !== null){
                let cVal = Math.max(0, (aData.hourly.pm2_5[i] || 0) + offset);
                pmF.push({ time: `${new Date(aData.hourly.time[i]).getHours().toString().padStart(2, '0')}`, val: Math.round(cVal), color: getPM25Color(cVal) });
              }
            }
            setActiveForecast(pmF);
          }
        } catch (err) { console.error("Card detail error", err); setActiveWeather('error'); }
      };
      fetchCardDetails();
    }
  }, [activeStation, showRadar, currentPage]);

  const fetchDashboardData = async (lat, lon, titleText) => {
    setDashTitle(titleText); setDashLoading(true);
    try {
      const today = new Date(); const lyEnd = new Date(); lyEnd.setFullYear(today.getFullYear() - 1); lyEnd.setDate(lyEnd.getDate() - 1);
      const lyStart = new Date(lyEnd); lyStart.setDate(lyStart.getDate() - 13);
      const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max,uv_index_max&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlA = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlArc = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyStart.toISOString().split('T')[0]}&end_date=${lyEnd.toISOString().split('T')[0]}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FBangkok`;
      
      const [rW, rA, rArc] = await Promise.all([fetch(urlW), fetch(urlA), fetch(urlArc)]);
      const [dW, dA, dArc] = await Promise.all([rW.json(), rA.json(), rArc.json()]);

      let hArr = [], fArr = [];
      if (dW.daily && dW.daily.time) {
        for (let i=0; i<dW.daily.time.length; i++) {
          let dObj = new Date(dW.daily.time[i]);
          
          let avgPm = null;
          if (dA.hourly && dA.hourly.pm2_5) { 
            const startIdx = i*24;
            if(dA.hourly.pm2_5.length > startIdx){
              const hrs = dA.hourly.pm2_5.slice(startIdx, startIdx+24).filter(v=>v!==null); 
              if(hrs.length > 0) avgPm = Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length); 
            }
          }

          let item = {
            date: dObj.toLocaleDateString('th-TH',{day:'numeric',month:'short'}),
            dayName: ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][dObj.getDay()],
            temp: dW.daily.temperature_2m_max[i] ?? null, 
            heat: dW.daily.apparent_temperature_max[i] ?? null,
            rain: dW.daily.precipitation_sum[i] ?? null, 
            wind: dW.daily.wind_speed_10m_max[i] ?? null,
            uv: dW.daily.uv_index_max ? (dW.daily.uv_index_max[i] ?? null) : null, 
            pm25: avgPm
          };
          
          if (i<14) {
            item.tempLY = dArc.daily?.temperature_2m_max?(dArc.daily.temperature_2m_max[i]||0):0;
            item.heatLY = dArc.daily?.apparent_temperature_max?(dArc.daily.apparent_temperature_max[i]||0):0;
            item.rainLY = dArc.daily?.precipitation_sum?(dArc.daily.precipitation_sum[i]||0):0;
            item.windLY = dArc.daily?.wind_speed_10m_max?(dArc.daily.wind_speed_10m_max[i]||0):0;
            hArr.push(item);
          } else {
            if(i===14) item.date='วันนี้'; if(i===15) item.date='พรุ่งนี้';
            fArr.push(item);
          }
        }
      }
      setDashHistory(hArr); setDashForecast(fArr);
    } catch (e) { console.error("Dash error:", e); } finally { setDashLoading(false); }
  };

  useEffect(() => {
    if (currentPage === 'map') {
      if (activeStation) fetchDashboardData(activeStation.lat, activeStation.long, `พื้นที่: ${activeStation.nameTH}`);
      else if (selectedProvince) {
        const pStat = pm25Stations.filter(s => extractProvince(s.areaTH) === selectedProvince);
        if (pStat.length > 0) fetchDashboardData(pStat.reduce((a,b)=>a+parseFloat(b.lat),0)/pStat.length, pStat.reduce((a,b)=>a+parseFloat(b.long),0)/pStat.length, `ค่าเฉลี่ย จ.${selectedProvince}`);
      } else if (pm25Stations.length > 0) {
        fetchDashboardData(13.75, 100.5, 'ภาพรวมประเทศ (อ้างอิงตอนกลาง)');
      }
    }
  }, [activeStation, selectedProvince, pm25Stations, currentPage]);

  const handleReset = () => { setSelectedProvince(''); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); setCurrentPage('map'); };
  
  const handleFindNearest = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS'); setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      let nearest = null; let minD = Infinity;
      const activeList = viewMode === 'pm25' ? pm25Stations : weatherStations;
      activeList.forEach(s => { const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); if (d<minD){minD=d; nearest=s;} });
      if (nearest) { setSelectedProvince(extractProvince(nearest.areaTH)); setSelectedStationId(nearest.stationID); setActiveStation(nearest); setShowRadar(false); setCurrentPage('map'); }
      setLocating(false);
    }, () => { alert('ดึงพิกัดไม่ได้'); setLocating(false); });
  };

  // 🚀 ระบบวิเคราะห์ Nowcasting 3 ชม. & 24 ชม.
  const fetchAlertsData = async (lat, lon, locName) => {
    setAlertsLoading(true); setAlertsLocationName(locName);
    try {
      const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index,wind_speed_10m,wind_direction_10m&forecast_days=2&timezone=Asia%2FBangkok`;
      const urlA = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&forecast_days=2&timezone=Asia%2FBangkok`;
      
      const [rW, rA] = await Promise.all([fetch(urlW), fetch(urlA)]);
      const [dW, dA] = await Promise.all([rW.json(), rA.json()]);

      let urgent = [];
      let daily = [];
      const nIdx = new Date().getHours();
      const fmt = (iso) => `${new Date(iso).getHours()}:00 น.`;

      // 1. วิเคราะห์ 3 ชม. ข้างหน้า (Urgent)
      let rain3hP = 0, rain3hV = 0, rain3hT = '';
      let heat3h = 0, heat3hT = '';
      let pm3h = 0, pm3hT = '';
      let wind3h = 0, wind3hT = '';

      if(dW.hourly && dW.hourly.time && dA.hourly && dA.hourly.pm2_5) {
        for (let i=0; i<3; i++) {
          const idx = nIdx + i;
          if (dW.hourly.precipitation_probability[idx] > rain3hP) { rain3hP=dW.hourly.precipitation_probability[idx]; rain3hV=dW.hourly.precipitation[idx]; rain3hT=dW.hourly.time[idx]; }
          if (dW.hourly.apparent_temperature[idx] > heat3h) { heat3h=dW.hourly.apparent_temperature[idx]; heat3hT=dW.hourly.time[idx]; }
          if (dA.hourly.pm2_5[idx] > pm3h) { pm3h=dA.hourly.pm2_5[idx]; pm3hT=dA.hourly.time[idx]; }
          if (dW.hourly.wind_speed_10m[idx] > wind3h) { wind3h=dW.hourly.wind_speed_10m[idx]; wind3hT=dW.hourly.time[idx]; }
        }
      }

      let hasUrgent = false;
      if (rain3hP >= 30 || rain3hV > 0.1) { urgent.push({ icon:'🌧️', color:'#3b82f6', title:'ฝนกำลังจะตก!', desc:`โอกาสตก ${rain3hP}% ปริมาณ ${rain3hV.toFixed(1)}mm เวลาประมาณ ${fmt(rain3hT)}` }); hasUrgent = true; }
      if (heat3h >= 40) { urgent.push({ icon:'🥵', color:'#ef4444', title:'อากาศร้อนจัดระวังฮีทสโตรก', desc:`ดัชนีความร้อนพุ่งถึง ${heat3h.toFixed(1)}°C (${fmt(heat3hT)})`}); hasUrgent = true; }
      if (pm3h >= 37.5) { urgent.push({ icon:'😷', color:'#f59e0b', title:'ฝุ่น PM2.5 หนาแน่น', desc:`ระดับฝุ่น ${pm3h.toFixed(1)} µg/m³ (${fmt(pm3hT)}) ควรใส่หน้ากาก N95`}); hasUrgent = true; }
      if (wind3h >= 40) { urgent.push({ icon:'🌪️', color:'#8b5cf6', title:'ลมกระโชกแรง', desc:`ความเร็วลม ${wind3h.toFixed(1)} km/h (${fmt(wind3hT)}) ระวังสิ่งของปลิว`}); hasUrgent = true; }

      if (!hasUrgent) {
        urgent.push({ icon:'✨', color:'#10b981', title:'สภาพอากาศปกติ', desc:'ไม่มีสภาวะรุนแรงใน 3 ชั่วโมงนี้ สามารถทำกิจกรรมได้ตามปกติ' });
      }

      // 2. วิเคราะห์ 24 ชม. (Daily)
      let rain24P = 0, rain24T = '';
      let heat24 = 0, heat24T = '';
      let pm24 = 0, pm24T = '';
      let uv24 = 0, uv24T = '';

      if(dW.hourly && dW.hourly.time && dA.hourly && dA.hourly.pm2_5) {
        for (let i=0; i<24; i++) {
          const idx = nIdx + i;
          if (dW.hourly.precipitation_probability[idx] > rain24P) { rain24P=dW.hourly.precipitation_probability[idx]; rain24T=dW.hourly.time[idx]; }
          if (dW.hourly.apparent_temperature[idx] > heat24) { heat24=dW.hourly.apparent_temperature[idx]; heat24T=dW.hourly.time[idx]; }
          if (dA.hourly.pm2_5[idx] > pm24) { pm24=dA.hourly.pm2_5[idx]; pm24T=dA.hourly.time[idx]; }
          if (dW.hourly.uv_index[idx] > uv24) { uv24=dW.hourly.uv_index[idx]; uv24T=dW.hourly.time[idx]; }
        }
      }

      if (rain24P >= 40) daily.push({ icon:'🌦️', color:'#0ea5e9', title:`แนวโน้มฝนตก (${rain24P}%)`, desc:`คาดว่าจะมีฝนช่วง ${fmt(rain24T)} เผื่อเวลาเดินทางด้วยนะครับ` });
      else daily.push({ icon:'☀️', color:'#10b981', title:'โอกาสฝนตกต่ำ', desc:'วันนี้ท้องฟ้าโปร่ง โอกาสเกิดฝนมีน้อยมาก' });

      if (heat24 >= 42) daily.push({ icon:'🔥', color:'#ef4444', title:'อากาศร้อนอันตราย', desc:`พุ่งสูงสุด ${heat24.toFixed(1)}°C ช่วง ${fmt(heat24T)}` });
      else daily.push({ icon:'😎', color:'#f59e0b', title:`อากาศร้อนปานกลาง`, desc:`อุณหภูมิสูงสุดช่วง ${fmt(heat24T)} รู้สึกเหมือน ${heat24.toFixed(1)}°C` });

      if (pm24 >= 50) daily.push({ icon:'🌫️', color:'#dc2626', title:'แนวโน้มฝุ่น PM2.5 สูง', desc:`จะหนาแน่นสุด ${pm24.toFixed(1)} µg/m³ ช่วง ${fmt(pm24T)}` });
      else if (pm24 >= 25) daily.push({ icon:'🤧', color:'#f59e0b', title:'แนวโน้มฝุ่น PM2.5 ปานกลาง', desc:`สูงสุด ${pm24.toFixed(1)} µg/m³ ช่วง ${fmt(pm24T)}` });
      else daily.push({ icon:'🌿', color:'#10b981', title:'คุณภาพอากาศดี', desc:`ฝุ่นสูงสุดในวันนี้เพียง ${pm24.toFixed(1)} µg/m³` });

      if (uv24 >= 8) daily.push({ icon:'🔆', color:'#a855f7', title:`รังสี UV อันตราย (ระดับ ${uv24})`, desc:`แดดแรงจัดช่วง ${fmt(uv24T)} ควรทากันแดด SPF50+` });

      setAlertsData({ urgent, daily });
    } catch(e) { console.error("Alert err:", e); } finally { setAlertsLoading(false); }
  };

  const handleScanLocation = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS');
    navigator.geolocation.getCurrentPosition((pos) => fetchAlertsData(pos.coords.latitude, pos.coords.longitude, '📍 พิกัดปัจจุบันของคุณ'), () => alert('ไม่อนุญาต GPS'));
  };

  useEffect(() => {
    if (currentPage==='alerts' && !alertsLocationName) {
      if(activeStation) fetchAlertsData(activeStation.lat, activeStation.long, `พื้นที่: ${activeStation.nameTH}`);
      else fetchAlertsData(13.75, 100.5, 'กรุงเทพมหานคร (เริ่มต้น)');
    }
  }, [currentPage, activeStation, alertsLocationName]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.5rem', color:'#555' }}>กำลังโหลด...</div>;

  const isPm25Mode = viewMode === 'pm25'; const isTempMode = viewMode === 'temp'; const isHeatMode = viewMode === 'heat';
  const isUvMode = viewMode === 'uv'; const isRainMode = viewMode === 'rain'; const isWindMode = viewMode === 'wind';
  const themeBg = darkMode ? '#0f172a' : '#f1f5f9'; const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#1e293b'; const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';
  const activeChart = chartConfigs[viewMode] || chartConfigs['pm25']; 

  const validForecast = dashForecast.filter(d => d[activeChart.key] !== null && d[activeChart.key] !== undefined);
  const todayDateText = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', width:'100vw', backgroundColor:themeBg, fontFamily:"'Kanit', sans-serif", overflowY:'auto', overflowX:'hidden' }}>
      
      {/* HEADER */}
      <header style={{ background: darkMode ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', color: '#fff', padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '1.8rem', background: '#fff', borderRadius: '50%', padding: '5px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{darkMode ? '🌙' : '🌤️'}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Thailand Environment Dashboard</h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>ระบบเฝ้าระวังคุณภาพอากาศและสภาพอากาศ</p>
            </div>
          </div>
          {currentPage === 'map' && (
            <>
              <div style={{ width: '1px', height: '35px', backgroundColor: 'rgba(255,255,255,0.3)', display: window.innerWidth < 1024 ? 'none' : 'block' }}></div>
              <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 15px', borderRadius: '30px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>🗺️</label>
                  <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#fff', color: '#1e293b', minWidth: '150px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">ทุกจังหวัด</option>{provinces.map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div style={{ width: '2px', height: '20px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>📍</label>
                  <select value={selectedStationId} onChange={(e) => { setSelectedStationId(e.target.value); const stat = filteredStations.find(s => s.stationID === e.target.value); if(stat) {setActiveStation(stat); setShowRadar(false);} }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#fff', color: '#1e293b', minWidth: '220px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">-- เลือกพื้นที่/สถานี --</option>
                    {filteredStations.slice().sort((a, b) => a.nameTH.localeCompare(b.nameTH, 'th')).map(s => (<option key={s.stationID} value={s.stationID}>{s.nameTH}</option>))}
                  </select>
                </div>
                <button onClick={handleReset} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#0ea5e9', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>🏠 หน้าแรก</button>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '25px', padding: '4px' }}>
            <button onClick={() => setCurrentPage('map')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: currentPage === 'map' ? '#fff' : 'transparent', color: currentPage === 'map' ? '#0ea5e9' : '#fff' }}>🗺️ แผนที่ & สถิติ</button>
            <button onClick={() => setCurrentPage('alerts')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: currentPage === 'alerts' ? '#fff' : 'transparent', color: currentPage === 'alerts' ? '#0ea5e9' : '#fff' }}>🔔 แจ้งเตือนภัย</button>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem' }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* BODY CONTENT */}
      {currentPage === 'map' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: '15px', flexDirection: window.innerWidth < 768 ? 'column' : 'row', padding: '15px' }}>
            
            {/* MAP AREA */}
            <div style={{ flex: 7, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? '50vh' : 'calc(100vh - 120px)' }}>
              
              <div className="hide-scrollbar" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', padding: '5px 10px', borderRadius: '30px', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <button onClick={() => handleViewModeChange('pm25')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isPm25Mode ? '#0ea5e9' : 'transparent', color: isPm25Mode ? '#fff' : subTextColor }}>☁️ PM2.5</button>
                <button onClick={() => handleViewModeChange('temp')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isTempMode ? '#22c55e' : 'transparent', color: isTempMode ? '#fff' : subTextColor }}>🌡️ อุณหภูมิ</button>
                <button onClick={() => handleViewModeChange('heat')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isHeatMode ? '#f97316' : 'transparent', color: isHeatMode ? '#fff' : subTextColor }}>🥵 Heat</button>
                <button onClick={() => handleViewModeChange('uv')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isUvMode ? '#a855f7' : 'transparent', color: isUvMode ? '#fff' : subTextColor }}>☀️ UV</button>
                <button onClick={() => handleViewModeChange('rain')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isRainMode ? '#3b82f6' : 'transparent', color: isRainMode ? '#fff' : subTextColor }}>🌧️ ฝน</button>
                <button onClick={() => handleViewModeChange('wind')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isWindMode ? '#475569' : 'transparent', color: isWindMode ? '#fff' : subTextColor }}>🌬️ ลม</button>
                <div style={{ width: '2px', backgroundColor: borderColor, margin: '0 4px' }}></div>
                <button onClick={toggleRadar} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: showRadar ? '#ef4444' : 'transparent', color: showRadar ? '#fff' : subTextColor }}>{showRadar ? '📡 ปิดเรดาร์' : '📡 เรดาร์ฝน'}</button>
              </div>

              <div style={{ position: 'absolute', bottom: '25px', right: '70px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', color: subTextColor, backdropFilter: 'blur(4px)', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '1rem' }}>⏱️</span> อัปเดต: {lastUpdateText || 'กำลังโหลด...'}
                <button onClick={() => fetchAirQuality(false)} style={{ background: 'none', border: 'none', padding: '0 0 0 4px', cursor: 'pointer', fontSize: '1rem', color: '#0ea5e9' }} title="โหลดข้อมูลล่าสุดเดี๋ยวนี้">🔄</button>
              </div>

              <button onClick={handleFindNearest} disabled={locating} style={{ position: 'absolute', bottom: '25px', right: '15px', zIndex: 500, width: '44px', height: '44px', borderRadius: '50%', backgroundColor: cardBg, color: textColor, border: `1px solid ${borderColor}`, cursor: locating ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{locating ? '⏳' : '🎯'}</button>

              {!showRadar && (
                <div style={{ position: 'absolute', bottom: '25px', left: window.innerWidth < 768 ? '15px' : '60px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: textColor }}>{legendData[viewMode].title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {legendData[viewMode].items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', backgroundColor: item.color, borderRadius: '50%' }}></span><span style={{ fontSize: '0.8rem', color: subTextColor }}>{item.label}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <MapContainer center={[13.5, 101.0]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: darkMode ? '#1a202c' : '#bae6fd' }}>
                <LayersControl position="bottomleft">
                  <LayersControl.BaseLayer checked name="🗺️ แผนที่ปกติ (Default)">
                    <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="🛰️ ภาพดาวเทียม (Satellite)">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {showRadar && radarTime && <TileLayer url={`https://tilecache.rainviewer.com/v2/radar/${radarTime}/256/{z}/{x}/{y}/2/1_1.png`} opacity={0.65} zIndex={10} maxNativeZoom={12} />}
                <FitBounds stations={filteredStations} activeStation={activeStation} selectedProvince={selectedProvince} />
                <FlyToActiveStation activeStation={activeStation} />
                <RadarMapHandler showRadar={showRadar} />
                
                {!showRadar && filteredStations.map((station) => {
                  const isWeatherOnly = station.isWeatherStation; 
                  const pmVal = isWeatherOnly ? null : Number(station.AQILast?.PM25?.value); 
                  const tObj = stationTemps[station.stationID];
                  
                  let mVal = null;
                  if(isPm25Mode) mVal=pmVal; else if(isTempMode) mVal=tObj?.temp; else if(isHeatMode) mVal=tObj?.feelsLike; else if(isUvMode) mVal=tObj?.uvMax; else if(isRainMode) mVal=tObj?.rainProb; else if(isWindMode) mVal=tObj?.windSpeed;
                  
                  return (
                    <Marker key={station.stationID} position={[parseFloat(station.lat), parseFloat(station.long)]} icon={createCustomMarker(viewMode, mVal, tObj)} ref={el => markerRefs.current[station.stationID]=el} eventHandlers={{ click: () => setActiveStation(station) }}>
                      <Popup minWidth={260}>
                        <div style={{ textAlign: 'center', fontFamily: 'Kanit', color: '#1e293b' }}>
                          <strong>{station.nameTH}</strong>
                          
                          {!isWeatherOnly && (
                            <div style={{ margin: '10px 0', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                              <span style={{ fontSize: '1.2rem', color: getPM25Color(pmVal)==='#ffff00'?'#d4b500':getPM25Color(pmVal), fontWeight: 'bold' }}>PM2.5: {isNaN(pmVal)?'-':pmVal} µg/m³</span>
                              <div style={{ fontSize: '0.85rem', color: '#666' }}>(AQI: {station.AQILast?.AQI?.aqi||'-'})</div>
                            </div>
                          )}

                          {tObj && (
                            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', fontWeight:'bold', marginTop: isWeatherOnly?'10px':0 }}>
                              <div style={{ marginBottom: '8px', fontSize: '1.1rem', color:'#1e293b' }}>{getWeatherIcon(tObj.weatherCode).icon} {getWeatherIcon(tObj.weatherCode).text}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
                                <span>🌡️ {tObj.temp?.toFixed(1)||'-'}°C</span><span>🥵 {tObj.feelsLike?.toFixed(1)||'-'}°C</span>
                                <span style={{color:'#0ea5e9'}}>💧 {tObj.humidity||'-'}%</span><span style={{color:'#0ea5e9'}}>🌧️ {tObj.rainProb||'0'}%</span>
                                <span style={{color:'#a855f7'}}>☀️ UV สูงสุด: {tObj.uvMax||'-'}</span><span>🌬️ {tObj.windSpeed||'-'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* SIDEBAR RIGHT LIST */}
            <div style={{ flex: 3, minWidth: window.innerWidth < 768 ? '100%' : '380px', maxWidth: window.innerWidth < 768 ? '100%' : '450px', backgroundColor: cardBg, borderRadius: '12px', display: 'flex', flexDirection: 'column', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? 'auto' : 'calc(100vh - 120px)', maxHeight: window.innerWidth < 768 ? '50vh' : 'none' }}>
              <div style={{ padding: '15px', background: darkMode ? '#0f172a' : '#f0f9ff', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <h2 style={{ fontSize: '1rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{activeChart.name} <span style={{fontSize:'0.85rem', color:subTextColor}}>({filteredStations.length} จุด)</span></h2>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '4px', borderRadius: '6px', backgroundColor: cardBg, color: textColor, outline:'none' }}>
                  <option value="desc">⬇️ มากไปน้อย</option><option value="asc">⬆️ น้อยไปมาก</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {filteredStations.map((station) => {
                  const isWeatherOnly = station.isWeatherStation;
                  const pmVal = isWeatherOnly ? null : Number(station.AQILast?.PM25?.value); 
                  const tObj = stationTemps[station.stationID];
                  const isActive = activeStation?.stationID === station.stationID;
                  
                  let disp = '-', unit = '', boxBg = '#ccc';
                  if(isPm25Mode){ disp=isNaN(pmVal)?'-':pmVal; unit='µg/m³'; boxBg=getPM25Color(pmVal); }
                  else if(isTempMode){ disp=tObj?.temp!==undefined?tObj.temp.toFixed(1):'-'; unit='°C'; boxBg=getTempColor(tObj?.temp).bar; }
                  else if(isHeatMode){ disp=tObj?.feelsLike!==undefined?tObj.feelsLike.toFixed(1):'-'; unit='°C'; boxBg=tObj?getHeatIndexAlert(tObj.feelsLike).bar:'#ccc'; }
                  else if(isUvMode){ disp=tObj?.uvMax!==undefined?tObj.uvMax:'-'; unit='UV'; boxBg=tObj?getUvColor(tObj.uvMax).bar:'#ccc'; }
                  else if(isRainMode){ disp=tObj?.rainProb!==undefined?`${tObj.rainProb}%`:'-'; unit='ตก'; boxBg=tObj?getRainColor(tObj.rainProb).bar:'#ccc'; }
                  else if(isWindMode){ disp=tObj?.windSpeed!==undefined?tObj.windSpeed:'-'; unit='km/h'; boxBg=tObj?getWindColor(tObj.windSpeed).bar:'#ccc'; }
                  
                  let hAdv = isPm25Mode?getPM25HealthAdvice(pmVal):isHeatMode?getHeatHealthAdvice(tObj?.feelsLike):isUvMode?getUvHealthAdvice(tObj?.uvMax):null;

                  return (
                    <div key={station.stationID} ref={el=>cardRefs.current[station.stationID]=el} onClick={()=>setActiveStation(station)} style={{ display:'flex', flexDirection:'column', background:isActive?(darkMode?'#334155':'#f8fafc'):cardBg, border:isActive?'1px solid #3b82f6':`1px solid ${borderColor}`, borderLeft:`6px solid ${boxBg}`, borderRadius:'10px', padding:'15px', marginBottom:'15px', cursor:'pointer', boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div style={{ flex:1 }}>
                          <h4 style={{ margin:'0 0 2px 0', color:textColor, fontSize:'1rem' }}>{station.nameTH}</h4>
                          <p style={{ margin:0, color:'#3b82f6', fontSize:'0.8rem', fontWeight:'bold' }}>{extractProvince(station.areaTH)}</p>
                          <div style={{ marginTop:'10px', fontSize:'0.85rem', color:subTextColor, fontWeight:'bold' }}>
                            {isPm25Mode ? `AQI: ${station.AQILast?.AQI?.aqi||'--'}` : tObj ? (isUvMode?`ระดับ: ${getUvColor(tObj?.uvMax).label}`:isRainMode?`💧 ชื้น: ${tObj.humidity}%`:isWindMode?`ลมสูงสุด: ${tObj.windMax} km/h`:`ต่ำ ${tObj.tempMin?.toFixed(1)}° | สูง ${tObj.tempMax?.toFixed(1)}°`) : 'ไม่มีข้อมูล'}
                          </div>
                        </div>
                        <div style={{ backgroundColor:boxBg, color:(isPm25Mode && pmVal>25&&pmVal<=37.5) || (isUvMode&&tObj?.uvMax<=5)?'#1e293b':'#fff', width:'60px', height:'60px', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:'1.3rem', fontWeight:'bold' }}>{disp}</span><span style={{ fontSize:'0.65rem', fontWeight:'bold' }}>{unit}</span>
                        </div>
                      </div>
                      
                      {hAdv && (isActive || ['🚨','🚑','⛔'].includes(hAdv.icon)) && (
                        <div style={{ marginTop:'12px', padding:'10px', background:darkMode?'#1e293b':'#f8fafc', borderRadius:'8px', display:'flex', gap:'8px', border: `1px dashed ${boxBg}` }}><span>{hAdv.icon}</span><span style={{fontSize:'0.8rem',color:textColor}}>{hAdv.text}</span></div>
                      )}

                      {/* MINI CHARTS */}
                      {isActive && (
                        <div style={{ borderTop:`1px solid ${borderColor}`, marginTop:'15px', paddingTop:'15px' }}>
                          {activeWeather ? (() => {
                            if (isTempMode) {
                              return (
                                <div>
                                  <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 คาดการณ์อุณหภูมิ 7 วัน (ต่ำสุด - สูงสุด)</h5>
                                  <div style={{ height:'110px', display:'flex', alignItems:'flex-end', gap:'6px' }}>
                                    {activeWeather.tempForecast.map((d,i)=>{
                                      const globalMax = Math.max(...activeWeather.tempForecast.map(x=>x.val)) + 1;
                                      const globalMin = Math.min(...activeWeather.tempForecast.map(x=>x.minVal)) - 1;
                                      const range = globalMax - globalMin || 1;
                                      const bottomP = Math.max(0, ((d.minVal - globalMin) / range) * 100);
                                      const heightP = Math.max(8, ((d.val - d.minVal) / range) * 100);

                                      return (
                                        <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                          <span style={{fontSize:'10px', color:textColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}°</span>
                                          <div style={{width:'8px', flex:1, position:'relative', backgroundColor: darkMode?'#334155':'#e2e8f0', borderRadius:'4px', margin:'2px 0'}}>
                                            <div style={{position:'absolute', bottom:`${bottomP}%`, height:`${heightP}%`, width:'100%', backgroundColor:d.colorInfo.bar, borderRadius:'4px', backgroundImage: `linear-gradient(to top, #60a5fa, ${d.colorInfo.bar})`}}></div>
                                          </div>
                                          <span style={{fontSize:'10px', color:'#3b82f6', fontWeight:'bold', marginTop:'4px'}}>{d.minVal}°</span>
                                          <span style={{fontSize:'10px', color:i<=1?'#0ea5e9':subTextColor, marginTop:'4px'}}>{d.time}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            } else if (isPm25Mode && !isWeatherOnly) {
                               return (
                                <div>
                                  <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 แนวโน้ม PM2.5 ล่วงหน้า 72 ชม.</h5>
                                  <div style={{ height:'100px', display:'flex', alignItems:'flex-end', gap:'3px' }}>
                                    {activeForecast ? activeForecast.map((d,i)=>{
                                      const maxVal = Math.max(...activeForecast.map(x=>x.val)) || 1;
                                      const h = Math.max((d.val / maxVal) * 100, 5); 
                                      return (
                                        <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                          <span style={{fontSize:'9px', color:subTextColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}</span>
                                          <div style={{width:'100%', flex:1, display:'flex', alignItems:'flex-end'}}>
                                            <div style={{width:'100%', height:`${h}%`, backgroundColor:d.color, borderRadius:'3px 3px 0 0'}}></div>
                                          </div>
                                          <span style={{fontSize:'8px', color:subTextColor, marginTop:'4px', height:'12px'}}>{i%3===0?d.time:''}</span>
                                        </div>
                                      );
                                    }) : <div style={{width:'100%',textAlign:'center',color:subTextColor,fontSize:'0.8rem'}}>กำลังโหลด...</div>}
                                  </div>
                                </div>
                              );
                            }

                            let fData = isHeatMode?activeWeather.heatForecast:isUvMode?activeWeather.uvForecast:isRainMode?activeWeather.rainForecast:isWindMode?activeWeather.windForecast:[];
                            fData = fData.filter(d => d.val !== null && !isNaN(d.val)); 
                            if(fData.length === 0) return null;
                            
                            return (
                              <div>
                                <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 คาดการณ์ {fData.length} วัน</h5>
                                <div style={{ height:'100px', display:'flex', alignItems:'flex-end', gap:'6px' }}>
                                  {fData.map((d,i)=>{
                                    const maxVal = Math.max(...fData.map(x=>x.val)) + (isRainMode?10:5) || 1;
                                    const h = Math.max((d.val / maxVal) * 100, 5);
                                    return (
                                      <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                        <span style={{fontSize:'10px', color:d.colorInfo.color||subTextColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}</span>
                                        <div style={{width:'100%', flex:1, display:'flex', alignItems:'flex-end'}}>
                                          <div style={{width:'100%', height:`${h}%`, backgroundColor:d.colorInfo.bar, borderRadius:'3px 3px 0 0'}}></div>
                                        </div>
                                        <span style={{fontSize:'10px', color:i<=1?'#0ea5e9':subTextColor, marginTop:'4px'}}>{d.time}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })() : <div style={{width:'100%',textAlign:'center',color:subTextColor,fontSize:'0.8rem'}}>กำลังโหลด...</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* DASHBOARD BOTTOM */}
          <div style={{ padding: '15px' }}>
            <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div onClick={() => setShowStats(!showStats)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', color: textColor, margin: '0 0 5px 0', fontWeight:'bold' }}>📊 ข้อมูลเชิงลึก: {activeChart.name}</h2>
                  <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem' }}>พื้นที่วิเคราะห์: <strong style={{color: '#0ea5e9'}}>{dashTitle}</strong></p>
                </div>
                <div style={{ padding: '8px 15px', backgroundColor: darkMode ? '#334155' : '#f1f5f9', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>
                  {showStats ? '🔼 ซ่อนสถิติ' : '🔽 ดูกราฟสถิติ'}
                </div>
              </div>
              
              {showStats && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${borderColor}` }}>
                  {dashLoading ? <div style={{ textAlign:'center', color:subTextColor, padding:'50px' }}>⏳ กำลังประมวลผลข้อมูลดาวเทียม...</div> : dashHistory.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                      <div style={{ background: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                        <h3 style={{ fontSize: '1rem', color: textColor, textAlign: 'center', fontWeight:'bold' }}>⏳ ย้อนหลัง 14 วัน</h3>
                        <div style={{ height: '220px', marginTop:'15px' }}>
                          <ResponsiveContainer>
                            {activeChart.type === 'bar' ? (
                              <BarChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Bar dataKey={activeChart.key} fill={activeChart.color} radius={[4,4,0,0]} />{activeChart.hasLY && <Bar dataKey={activeChart.keyLY} fill="#94a3b8" radius={[4,4,0,0]} />}</BarChart>
                            ) : activeChart.type === 'area' ? (
                              <AreaChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Area type="monotone" dataKey={activeChart.key} stroke={activeChart.color} fill={activeChart.color} fillOpacity={0.4} strokeWidth={2} /></AreaChart>
                            ) : (
                              <LineChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Line type="monotone" dataKey={activeChart.key} stroke={activeChart.color} strokeWidth={3} />{activeChart.hasLY && <Line type="monotone" dataKey={activeChart.keyLY} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} />}</LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div style={{ background: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                        <h3 style={{ fontSize: '1rem', color: textColor, textAlign: 'center', fontWeight:'bold' }}>🔮 พยากรณ์ล่วงหน้า {validForecast.length} วัน (Forecast)</h3>
                        <div style={{ height: '220px', marginTop:'15px' }}>
                          <ResponsiveContainer>
                            {activeChart.type === 'bar' ? (
                              <BarChart data={validForecast} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Bar dataKey={activeChart.key} fill={activeChart.color} radius={[4,4,0,0]} /></BarChart>
                            ) : (
                              <AreaChart data={validForecast} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} domain={['auto', 'auto']} /><Tooltip /><Area type="monotone" dataKey={activeChart.key} stroke={activeChart.color} fill={activeChart.color} fillOpacity={0.4} strokeWidth={3} /></AreaChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : <div style={{ textAlign:'center', color:subTextColor, padding:'50px' }}>ไม่มีข้อมูลสถิติของพื้นที่นี้</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ======================= ALERTS TAB =======================
        <div style={{ flex: 1, padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', color: textColor, marginBottom: '5px', fontWeight:'bold' }}>🔔 ศูนย์พยากรณ์และแจ้งเตือนภัย</h2>
            <p style={{ color: subTextColor, fontSize:'1.1rem', marginBottom: '20px' }}>อัปเดตข้อมูลเชิงลึก 24 ชั่วโมงข้างหน้า ประจำวันที่ <strong style={{color: '#0ea5e9'}}>{todayDateText}</strong></p>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <button onClick={handleScanLocation} disabled={alertsLoading} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '30px', padding: '12px 25px', fontSize: '1rem', fontWeight: 'bold', cursor: alertsLoading?'wait':'pointer', boxShadow: '0 4px 15px rgba(14,165,233,0.3)', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {alertsLoading ? '⏳ กำลังสแกนพิกัด...' : '📍 ตรวจสอบพิกัดปัจจุบันของฉัน'}
              </button>
              {alertsLocationName && !alertsLoading && (
                <div style={{ padding: '10px 20px', backgroundColor: darkMode?'#1e293b':'#f0f9ff', borderRadius: '30px', color: '#0ea5e9', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>
                  🎯 พิกัด: {alertsLocationName}
                </div>
              )}
            </div>
          </div>

          {alertsLoading ? (
             <div style={{ textAlign:'center', padding:'50px', color:subTextColor, fontSize:'1.2rem' }}>กำลังประมวลผลข้อมูลดาวเทียม...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* ส่วนที่ 1: แจ้งเตือนพิกัดปัจจุบันของคุณ (แบ่ง 3 ชม. กับ 24 ชม.) */}
              {(alertsData.urgent?.length > 0 || alertsData.daily?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  
                  {/* คอลัมน์ 1: 3 ชั่วโมงข้างหน้า (Urgent) */}
                  <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${borderColor}`, borderTop: alertsData.urgent.some(a => a.color !== '#10b981') ? '4px solid #ef4444' : '4px solid #10b981', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: alertsData.urgent.some(a => a.color !== '#10b981') ? '#ef4444' : '#10b981', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {alertsData.urgent.some(a => a.color !== '#10b981') ? '🚨 เฝ้าระวังด่วน (3 ชม. ข้างหน้า)' : '✅ สถานการณ์ปกติ (3 ชม. ข้างหน้า)'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {alertsData.urgent.map((al, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#0f172a':'#fff', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${al.color}`, border: darkMode ? '1px solid #334155' : '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '1.8rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                          <div><h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: textColor, lineHeight:1.4, fontSize:'0.85rem' }}>{al.desc}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* คอลัมน์ 2: 24 ชั่วโมงข้างหน้า (Daily) */}
                  <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${borderColor}`, borderTop: '4px solid #0ea5e9', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#0ea5e9', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>📅 ภาพรวมสภาพอากาศ (24 ชั่วโมง)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {alertsData.daily.map((al, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '1.5rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                          <div><h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: subTextColor, lineHeight:1.4, fontSize:'0.85rem' }}>{al.desc}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ส่วนที่ 2: สรุปภาพรวมความเสี่ยงระดับประเทศ (Top 5 Ranking) */}
              {nationwideSummary && (
                <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '25px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.4rem', color: textColor, margin: '0 0 5px 0', fontWeight:'bold' }}>🏆 5 อันดับจังหวัดเฝ้าระวังสูงสุด (ทั่วประเทศ)</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 1fr 1fr', gap: '15px' }}>
                    
                    {/* Ranking: ฝน/ลม */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#eff6ff', borderRadius: '12px', border: `1px solid ${darkMode?'#1e3a8a':'#bfdbfe'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>⛈️ เสี่ยงพายุฝน</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.storm.length > 0 ? nationwideSummary.storm.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: item.rain >= 70 ? '#dc2626' : '#2563eb' }}>{item.rain >= 50 ? `ฝน ${item.rain}%` : `ลม ${item.wind} km/h`}</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>ไม่มีจังหวัดที่เสี่ยงรุนแรง</div>}
                      </div>
                    </div>

                    {/* Ranking: PM2.5 */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#fffbeb', borderRadius: '12px', border: `1px solid ${darkMode?'#78350f':'#fde68a'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>😷 ฝุ่น PM2.5 สะสม</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.pm25.length > 0 ? nationwideSummary.pm25.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: item.val >= 75 ? '#dc2626' : '#d97706' }}>{item.val} µg/m³</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>อากาศดีทั่วประเทศ</div>}
                      </div>
                    </div>

                    {/* Ranking: อากาศร้อน */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#fef2f2', borderRadius: '12px', border: `1px solid ${darkMode?'#7f1d1d':'#fecaca'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>🥵 ดัชนีความร้อนสูงสุด</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.heat.length > 0 ? nationwideSummary.heat.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: '#dc2626' }}>{item.val}°C</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>อุณหภูมิปกติทั่วประเทศ</div>}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}