import React from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, LabelList } from 'recharts';

const CustomXAxisTick = ({ x, y, payload, chartData, subTextColor }) => {
  const item = chartData[payload.index];
  if (!item) return null;
  const pmColor = item.pm25 > 75 ? '#ef4444' : item.pm25 > 37.5 ? '#f97316' : item.pm25 > 25 ? '#eab308' : item.pm25 > 15 ? '#22c55e' : '#0ea5e9';
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-40} y={10} width={80} height={90}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'Kanit', textAlign: 'center', lineHeight: 1.2 }}>
          <span style={{ color: subTextColor }}>{item.time}</span>
          <span style={{ color: '#3b82f6', marginTop: '4px' }}>☔ {item.rain}%<br/>{item.rainAmount > 0 ? `(${item.rainAmount}mm)` : ''}</span>
          <span style={{ color: pmColor, marginTop: '2px' }}>😷 {item.pm25}</span>
        </div>
      </foreignObject>
    </g>
  );
};

export default function ForecastChart({ chartData, isMobile, cardBg, borderColor, textColor, subTextColor, scrollRef, isDragging, scrollEvents }) {
  return (
    <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '20px', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
       <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: textColor }}>⏱️ 24 ชั่วโมงข้างหน้า</h3>
       <div 
         ref={scrollRef}
         {...scrollEvents}
         style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '5px', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }} 
         className="hide-scrollbar"
       >
         <div style={{ width: '1400px', height: '200px' }}>
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 15, bottom: 60 }}>
               <defs>
                 <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                   <stop offset="50%" stopColor="#f97316" stopOpacity={0.4}/>
                   <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
                 </linearGradient>
                 <linearGradient id="lineTemp" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                   <stop offset="50%" stopColor="#f97316" stopOpacity={1}/>
                   <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                 </linearGradient>
               </defs>
               <XAxis dataKey="time" axisLine={false} tickLine={false} interval={0} tick={<CustomXAxisTick chartData={chartData} subTextColor={subTextColor} />} />
               <Area type="monotone" dataKey="temp" stroke="url(#lineTemp)" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)">
                 <LabelList dataKey="temp" position="top" offset={10} style={{ fill: textColor, fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Kanit' }} formatter={(val) => `${val}°`} />
               </Area>
             </AreaChart>
           </ResponsiveContainer>
         </div>
       </div>
    </div>
  );
}
