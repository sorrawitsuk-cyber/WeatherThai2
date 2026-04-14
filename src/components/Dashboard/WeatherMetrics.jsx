import React from 'react';
import { getWindDir, getSunTime } from '../../utils/weatherHelpers';

export default function WeatherMetrics({ current, chartData, cardBg, borderColor, subTextColor, textColor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>💧 ความชื้น</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{Math.round(current?.humidity || 0)} <span style={{fontSize:'0.75rem'}}>%</span></div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current?.humidity > 60 ? 'ค่อนข้างชื้น' : 'กำลังดี'}</div>
        </div>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🌬️ ลมพัด ({getWindDir(current?.windDirection)})</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{Math.round(current?.windSpeed || 0)} <span style={{fontSize:'0.75rem'}}>กม./ชม.</span></div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current?.windSpeed > 15 ? 'ลมแรง' : 'ลมสงบ'}</div>
        </div>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>☔ ฝนตก/ปริมาณ</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{chartData[0]?.rain || 0} <span style={{fontSize:'0.75rem'}}>%</span></div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current?.precipitation > 0 ? `ปริมาณ ${current?.precipitation} mm` : 'ไม่มีฝนตก'}</div>
        </div>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>👁️ ทัศนวิสัย</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{(current?.visibility / 1000).toFixed(1)} <span style={{fontSize:'0.75rem'}}>กม.</span></div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current?.visibility < 2000 ? 'มีหมอกหนา' : 'เคลียร์'}</div>
        </div>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🧭 ความกดอากาศ</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{Math.round(current?.pressure || 0)} <span style={{fontSize:'0.75rem'}}>hPa</span></div>
        </div>
        <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🌅 ดวงอาทิตย์</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: textColor }}>ขึ้น {getSunTime(current?.sunrise)}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '900', color: textColor }}>ตก {getSunTime(current?.sunset)}</div>
        </div>
    </div>
  );
}
