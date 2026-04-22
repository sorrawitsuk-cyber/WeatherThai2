import React from 'react';
import {
  getExerciseStatus,
  getLaundryStatus,
  getWateringStatus,
  getSprayStatus,
  getDrivingStatus,
  getCampingStatus,
} from '../../utils/weatherHelpers';

function clampScore(value) {
  return Math.max(0, Math.min(10, value));
}

function getActivityMetrics(current = {}) {
  const rainProb = current?.rainProb || 0;
  const rain = current?.rain || 0;
  const wind = current?.windSpeed || 0;
  const heat = current?.feelsLike || 0;
  const pm25 = current?.pm25 || 0;
  const visibilityKm = (current?.visibility || 10000) / 1000;

  return [
    {
      title: 'ออกกำลังกาย',
      icon: '🏃‍♂️',
      ...getExerciseStatus(current),
      score: clampScore(
        10 - (Math.max(pm25 - 15, 0) / 7) - (Math.max(heat - 30, 0) / 2.2) - (rainProb / 20)
      ),
    },
    {
      title: 'ซักผ้า / ล้างรถ',
      icon: '👕',
      ...getLaundryStatus(current),
      score: clampScore(10 - (rainProb / 12) - (rain > 0 ? 3 : 0)),
    },
    {
      title: 'รดน้ำต้นไม้',
      icon: '💧',
      ...getWateringStatus(current),
      score: clampScore(8.5 - (rainProb / 15) - (rain > 0 ? 3.5 : 0)),
    },
    {
      title: 'ฉีดพ่นยา/ปุ๋ย',
      icon: '🚁',
      ...getSprayStatus(current),
      score: clampScore(10 - (wind / 2) - (rainProb / 15)),
    },
    {
      title: 'ขับขี่เดินทาง',
      icon: '🚘',
      ...getDrivingStatus(current),
      score: clampScore(10 - Math.max(5 - visibilityKm, 0) * 1.8 - (rainProb / 18)),
    },
    {
      title: 'เที่ยว / ตั้งแคมป์',
      icon: '⛺',
      ...getCampingStatus(current),
      score: clampScore(10 - (rainProb / 14) - (wind / 6) - (Math.max(pm25 - 20, 0) / 10) - (Math.max(heat - 33, 0) / 2.5)),
    },
  ];
}

function buildRadarPoints(items, centerX, centerY, radius) {
  return items.map((item, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / items.length);
    const normalized = clampScore(item.score) / 10;
    return {
      ...item,
      axisX: centerX + Math.cos(angle) * radius,
      axisY: centerY + Math.sin(angle) * radius,
      pointX: centerX + Math.cos(angle) * radius * normalized,
      pointY: centerY + Math.sin(angle) * radius * normalized,
      labelX: centerX + Math.cos(angle) * (radius + 30),
      labelY: centerY + Math.sin(angle) * (radius + 30),
    };
  });
}

function splitRadarLabel(title) {
  if (title.includes(' / ')) return title.split(' / ');
  if (title.includes('/')) return title.split('/');
  if (title.length <= 12) return [title];
  return [title.slice(0, 10), title.slice(10)];
}

export default function ActivityRecommendations({ current, isMobile, cardBg, borderColor, subTextColor }) {
  const items = getActivityMetrics(current);
  const chartSize = isMobile ? 288 : 320;
  const chartCenter = chartSize / 2;
  const chartRadius = isMobile ? 76 : 104;
  const radarPoints = buildRadarPoints(items, chartCenter, chartCenter, chartRadius);
  const polygonPoints = radarPoints.map((point) => `${point.pointX},${point.pointY}`).join(' ');
  const headline = items.reduce((best, item) => (item.score > best.score ? item : best), items[0]);

  return (
    <div style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '16px' : '20px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span> Radar กิจกรรมวันนี้
          </h3>
          <div style={{ fontSize: '0.74rem', color: subTextColor, marginTop: '4px', lineHeight: 1.5 }}>
            สรุปความเหมาะสมของกิจกรรมและงานกลางแจ้งในกราฟเดียว คะแนนยิ่งสูงยิ่งเหมาะทำตอนนี้
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, borderRadius: '14px', padding: '8px 12px', minWidth: isMobile ? '100%' : 'unset' }}>
          <div style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 'bold' }}>แนะนำที่สุดตอนนี้</div>
          <div style={{ fontSize: '0.9rem', color: headline.color, fontWeight: '900', marginTop: '2px' }}>{headline.icon} {headline.title}</div>
          <div style={{ fontSize: '0.68rem', color: subTextColor, marginTop: '2px' }}>{headline.desc}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} role="img" aria-label="Radar chart กิจกรรมรายวัน" style={{ overflow: 'visible', maxWidth: '100%' }}>
          {[0.2, 0.4, 0.6, 0.8, 1].map((scale, ringIndex) => {
            const ringPoints = items.map((_, itemIndex) => {
              const angle = (-Math.PI / 2) + ((Math.PI * 2 * itemIndex) / items.length);
              const x = chartCenter + Math.cos(angle) * chartRadius * scale;
              const y = chartCenter + Math.sin(angle) * chartRadius * scale;
              return `${x},${y}`;
            }).join(' ');
            return (
              <polygon
                key={ringIndex}
                points={ringPoints}
                fill="none"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth="1"
              />
            );
          })}

          {radarPoints.map((point, index) => (
            <g key={index}>
              <line x1={chartCenter} y1={chartCenter} x2={point.axisX} y2={point.axisY} stroke="rgba(148,163,184,0.24)" strokeWidth="1" />
              <text
                x={point.labelX}
                y={point.labelY}
                textAnchor={Math.abs(point.labelX - chartCenter) < 12 ? 'middle' : point.labelX < chartCenter ? 'end' : 'start'}
                fill={subTextColor}
                fontSize={isMobile ? '10' : '11'}
                fontWeight="700"
              >
                {splitRadarLabel(point.title).map((line, lineIndex) => (
                  <tspan
                    key={`${point.title}-${lineIndex}`}
                    x={point.labelX}
                    dy={lineIndex === 0 ? '-0.35em' : '1.05em'}
                  >
                    {line.trim()}
                  </tspan>
                ))}
              </text>
            </g>
          ))}

          <polygon
            points={polygonPoints}
            fill="rgba(14,165,233,0.18)"
            stroke="#0ea5e9"
            strokeWidth="2.5"
          />

          {radarPoints.map((point, index) => (
            <circle key={index} cx={point.pointX} cy={point.pointY} r="4.5" fill={point.color} stroke={cardBg} strokeWidth="2" />
          ))}
        </svg>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
        {items.map((item) => (
          <div key={item.title} style={{ background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, borderRadius: '14px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.icon} {item.title}
              </div>
              <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: 'bold', marginTop: '3px' }}>{item.text}</div>
              <div style={{ fontSize: '0.66rem', color: subTextColor, marginTop: '3px', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1rem', color: item.color, fontWeight: '900' }}>{item.score.toFixed(1)}</div>
              <div style={{ fontSize: '0.62rem', color: subTextColor }}>จาก 10</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
