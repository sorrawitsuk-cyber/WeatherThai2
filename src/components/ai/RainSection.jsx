import React, { useState } from 'react';
import { Card, ExpandableDetail, SectionHeader, CustomTooltip } from './SharedUI';
import { SectionTitle, InsightBox } from './ExtendedUI';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Line } from 'recharts';

export default function RainSection({
  windAnalysis, windLoading, windError, windLastFetch, fetchWindAnalysis,
  hourlyRows, isMobile, rainProb, sixHourForecast
}) {
  const [windDetailsOpen, setWindDetailsOpen] = useState(false);

  const renderWindAnalysis = () => {
    if (windError) {
      return (
        <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: '12px', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px', padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ โหลดข้อมูลการวิเคราะห์ลมไม่สำเร็จ</div>
          <div style={{ opacity: 0.8, marginBottom: 10 }}>{windError}</div>
          <button
            onClick={fetchWindAnalysis}
            style={{ background: '#ef444420', border: '1px solid #ef444450', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600, padding: '5px 14px' }}
          >
            ลองใหม่
          </button>
        </div>
      );
    }
    if (windLoading && !windAnalysis) {
      return (
        <div style={{ alignItems: 'center', color: 'var(--text-sub)', display: 'flex', fontSize: '0.82rem', gap: '10px', justifyContent: 'center', padding: '28px 0' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>🌀</span>
          กำลังวิเคราะห์สภาพอากาศ...
        </div>
      );
    }
    if (!windAnalysis) return null;

    const natPct = windAnalysis.nationalRainChance ?? 0;
    const forming = windAnalysis.rainForming || 'none';
    const formingConfig = {
      active:   { color: '#2563eb', bg: 'rgba(37,99,235,0.12)', border: 'rgba(37,99,235,0.3)', icon: '🌧️', label: 'ฝนตกอยู่ในหลายพื้นที่' },
      forming:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⛅', label: 'กำลังก่อตัว' },
      possible: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.25)', icon: '🌤️', label: 'มีโอกาสเกิดฝน' },
      none:     { color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.25)', icon: '☀️', label: 'ท้องฟ้าค่อนข้างแจ่มใส' },
    };
    const fc = formingConfig[forming] || formingConfig.none;
    const bkk = windAnalysis.bangkok || {};
    const bkkPct = bkk.rainChance ?? Math.round(natPct * 0.85);
    const bkkColor = bkkPct >= 65 ? '#2563eb' : bkkPct >= 40 ? '#3b82f6' : bkkPct >= 20 ? '#f59e0b' : '#16a34a';

    const rainEmoji = (pct) => pct >= 75 ? '⛈️' : pct >= 55 ? '🌧️' : pct >= 35 ? '🌦️' : pct >= 15 ? '🌤️' : '☀️';
    const rainColor = (pct) => pct >= 70 ? '#1d4ed8' : pct >= 50 ? '#2563eb' : pct >= 35 ? '#3b82f6' : pct >= 20 ? '#f59e0b' : '#16a34a';
    const rainBg = (pct) => pct >= 70 ? 'rgba(29,78,216,0.12)' : pct >= 50 ? 'rgba(37,99,235,0.1)' : pct >= 35 ? 'rgba(59,130,246,0.09)' : pct >= 20 ? 'rgba(245,158,11,0.09)' : 'rgba(22,163,74,0.08)';
    const rainBorder = (pct) => pct >= 70 ? 'rgba(29,78,216,0.28)' : pct >= 50 ? 'rgba(37,99,235,0.22)' : pct >= 35 ? 'rgba(59,130,246,0.2)' : pct >= 20 ? 'rgba(245,158,11,0.22)' : 'rgba(22,163,74,0.2)';

    const peakTimeMap = {
      morning: { label: 'เช้า', range: '06–11 น.', bars: [1,1,0,0,0,0,0,0] },
      afternoon: { label: 'บ่าย', range: '12–17 น.', bars: [0,0,1,1,1,0,0,0] },
      evening: { label: 'เย็น–ค่ำ', range: '17–22 น.', bars: [0,0,0,0,1,1,1,0] },
      night: { label: 'กลางคืน', range: '22–04 น.', bars: [0,0,0,0,0,0,1,1] },
      'all-day': { label: 'ตลอดวัน', range: 'ทั้งวัน', bars: [1,1,1,1,1,1,1,1] },
      none: { label: 'ไม่มีฝน', range: '–', bars: [0,0,0,0,0,0,0,0] },
    };
    const peakKey = windAnalysis.peakRainTime || 'none';
    const peak = peakTimeMap[peakKey] || peakTimeMap.none;
    const timeLabels = ['06', '09', '12', '15', '18', '21', '00', '03'];

    return (
      <>
        <div style={{ background: `linear-gradient(135deg, ${fc.bg}, var(--bg-secondary))`, border: `1px solid ${fc.border}`, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', padding: '14px 16px' }}>
          <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>{fc.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: fc.color, fontSize: '0.72rem', fontWeight: 950, marginBottom: '2px' }}>ตอนนี้ — {fc.label}</div>
            <div style={{ color: 'var(--text-main)', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 900, lineHeight: 1.3 }}>
              {windAnalysis.quickSummary || windAnalysis.summary?.split(' ').slice(0, 12).join(' ') || '–'}
            </div>
            {windAnalysis.rainFormingDesc && (
              <div style={{ color: 'var(--text-sub)', fontSize: '0.74rem', marginTop: '4px' }}>{windAnalysis.rainFormingDesc}</div>
            )}
          </div>
          <div style={{ alignItems: 'center', background: `${fc.color}1a`, border: `1.5px solid ${fc.color}40`, borderRadius: '14px', display: 'flex', flexDirection: 'column', flexShrink: 0, justifyContent: 'center', minWidth: '72px', padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ color: fc.color, fontSize: '1.5rem', fontWeight: 950, lineHeight: 1 }}>{natPct}%</div>
            <div style={{ color: 'var(--text-sub)', fontSize: '0.6rem', fontWeight: 800, marginTop: '2px' }}>ทั่วประเทศ</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', marginBottom: '14px' }}>
          <div style={{ background: `linear-gradient(135deg, ${rainBg(bkkPct)}, var(--bg-secondary))`, border: `1px solid ${rainBorder(bkkPct)}`, borderRadius: '16px', padding: '14px' }}>
            <div style={{ color: 'var(--text-sub)', fontSize: '0.68rem', fontWeight: 800, marginBottom: '8px' }}>🏙️ กรุงเทพฯ และปริมณฑล</div>
            <div style={{ alignItems: 'flex-end', display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <div style={{ color: bkkColor, fontSize: '2.4rem', fontWeight: 950, lineHeight: 1 }}>{bkkPct}%</div>
              <div style={{ marginBottom: '4px' }}>
                <div style={{ color: bkkColor, fontSize: '0.8rem', fontWeight: 900 }}>{bkk.status || (bkkPct >= 60 ? 'ฝนกระจาย' : bkkPct >= 35 ? 'มีโอกาสฝน' : 'ท้องฟ้าแจ่มใส')}</div>
                <div style={{ color: 'var(--text-sub)', fontSize: '0.7rem', marginTop: '2px' }}>{bkk.action || (bkkPct >= 35 ? '🌂 แนะนำพกร่ม' : '✅ ไม่ต้องพกร่ม')}</div>
              </div>
            </div>
            {bkk.detail && <div style={{ color: 'var(--text-sub)', fontSize: '0.7rem', lineHeight: 1.5, borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>{bkk.detail}</div>}
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ color: 'var(--text-sub)', fontSize: '0.68rem', fontWeight: 800, marginBottom: '10px' }}>🕐 ช่วงเวลาที่คาดว่าฝนจะตก</div>
            <div style={{ alignItems: 'flex-end', display: 'flex', gap: '4px', height: '46px', marginBottom: '6px' }}>
              {timeLabels.map((t, i) => {
                const active = peak.bars[i];
                return (
                  <div key={t} style={{ alignItems: 'center', display: 'flex', flex: 1, flexDirection: 'column', gap: '4px' }}>
                    <div style={{ background: active ? '#3b82f6' : 'var(--border-color)', borderRadius: '4px 4px 2px 2px', height: active ? '32px' : '12px', transition: 'height 0.4s, background 0.4s', width: '100%' }} />
                    <div style={{ color: active ? '#3b82f6' : 'var(--text-sub)', fontSize: '0.55rem', fontWeight: active ? 900 : 600 }}>{t}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: 900 }}>
              {peak.label} <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>({windAnalysis.peakRainTimeDesc || peak.range})</span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ color: 'var(--text-sub)', fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>โอกาสฝนรายภาค</div>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>
            {(windAnalysis.regions || []).map((r) => {
              const pct = Math.min(100, Math.max(0, r.rainChance ?? 0));
              const c = rainColor(pct);
              return (
                <div key={r.name} style={{ background: rainBg(pct), border: `1px solid ${rainBorder(pct)}`, borderRadius: '14px', padding: '11px 12px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ background: `${c}18`, borderRadius: '0 0 14px 14px', bottom: 0, height: `${pct}%`, left: 0, position: 'absolute', right: 0 }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{rainEmoji(pct)}</div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.74rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '6px' }}>{r.name}</div>
                    <div style={{ color: c, fontSize: '1.4rem', fontWeight: 950, lineHeight: 1 }}>{pct}<span style={{ fontSize: '0.65rem', fontWeight: 800 }}>%</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {windAnalysis.alerts?.length > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', marginBottom: '12px', padding: '10px 13px' }}>
            <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 950, marginBottom: '5px' }}>⚠️ ข้อสังเกตสำคัญ</div>
            {windAnalysis.alerts.map((a, i) => (
              <div key={i} style={{ color: 'var(--text-main)', fontSize: '0.76rem', lineHeight: 1.55 }}>• {a}</div>
            ))}
          </div>
        )}

        <button
          onClick={() => setWindDetailsOpen(o => !o)}
          style={{ alignItems: 'center', background: 'none', border: '1px solid var(--border-color)', borderRadius: '999px', color: 'var(--text-sub)', cursor: 'pointer', display: 'flex', fontSize: '0.72rem', fontWeight: 800, gap: '5px', padding: '6px 14px', width: '100%', justifyContent: 'center', marginBottom: windDetailsOpen ? '12px' : 0 }}
        >
          {windDetailsOpen ? '▲ ซ่อน' : '▼ ดูเพิ่มเติม'}
        </button>

        {windDetailsOpen && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {windAnalysis.summary && (
              <div style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '0.78rem', lineHeight: 1.65, marginBottom: '12px', padding: '12px' }}>
                {windAnalysis.summary}
              </div>
            )}
            {windAnalysis.levelInsights?.length > 0 && (
              <div style={{ display: 'grid', gap: '7px', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(3, windAnalysis.levelInsights.length)}, 1fr)`, marginBottom: '12px' }}>
                {windAnalysis.levelInsights.map((li) => (
                  <div key={li.level} style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: '11px', padding: '9px' }}>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.7rem', lineHeight: 1.45 }}>{li.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <Card id="rain" style={{ padding: isMobile ? 18 : 28, scrollMarginTop: 130 }}>
      <SectionHeader title="วิเคราะห์ฝน" eyebrow="กระแสลมชั้นบนรายภูมิภาค" />

      <div style={{ alignItems: 'center', display: 'flex', gap: '10px', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ alignItems: 'center', color: 'var(--text-main)', display: 'flex', fontSize: '0.95rem', fontWeight: 900, gap: '7px' }}>
            🌬️ วิเคราะห์กระแสลมชั้นบนรายภูมิภาค
          </div>
          <div style={{ color: 'var(--text-sub)', fontSize: '0.68rem', marginTop: '3px' }}>
            อัปเดตอัตโนมัติทุก 3 ชั่วโมง{windLastFetch && ` · ล่าสุด ${windLastFetch.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`}
          </div>
        </div>
        <button onClick={fetchWindAnalysis} disabled={windLoading} style={{ alignItems: 'center', background: windLoading ? 'var(--bg-secondary)' : 'linear-gradient(135deg,#0ea5e9,#2563eb)', border: 'none', borderRadius: '999px', color: windLoading ? 'var(--text-sub)' : '#fff', cursor: windLoading ? 'not-allowed' : 'pointer', display: 'flex', fontSize: '0.72rem', fontWeight: 900, gap: '5px', padding: '7px 13px' }}>
          {windLoading ? '⏳ วิเคราะห์...' : '🔄 รีเฟรช'}
        </button>
      </div>

      {renderWindAnalysis()}

      <ExpandableDetail label="ฝน 24 ชั่วโมงข้างหน้า">
        <SectionTitle icon="🌧️" title="กราฟคาดการณ์โอกาสฝน" subtitle="ดูช่วงที่ฝนน่าจะเริ่มแรงขึ้นและเทียบกับความชื้นในอากาศ" />
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyRows} margin={{ bottom: 0, left: -18, right: 10, top: 14 }}>
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-sub)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: 'var(--text-sub)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rain" name="โอกาสฝน" radius={[8, 8, 0, 0]}>
                {hourlyRows?.map((row) => (
                  <Cell key={row.time} fill={row.rain >= 60 ? '#2563eb' : row.rain >= 35 ? '#60a5fa' : '#bfdbfe'} />
                ))}
              </Bar>
              <Line dataKey="humidity" name="ความชื้น" stroke="#14b8a6" strokeWidth={2} type="monotone" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableDetail>
    </Card>
  );
}
