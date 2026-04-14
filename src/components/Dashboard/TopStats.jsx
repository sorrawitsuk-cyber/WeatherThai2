import React from 'react';

export default function TopStats({ top5Heat, top5Cool, top5PM25, top5Rain, isMobile, cardBg, borderColor, textColor }) {
  return (
    <>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span></span> สถิติ Top 5 ระดับประเทศ (อัปเดตเรียลไทม์)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '15px', flexShrink: 0, marginBottom: '20px' }}>
            
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>🔥 ร้อนจัดที่สุด</div>
                {top5Heat.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{st.val}°</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>❄️ เย็นสบายที่สุด</div>
                {top5Cool.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{st.val}°</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>😷 ฝุ่น PM2.5 สูงสุด</div>
                {top5PM25.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#f97316', fontWeight: 'bold' }}>{st.val}</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>☔ โอกาสฝนตกสูงสุด</div>
                {top5Rain.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{st.val}%</span>
                    </div>
                ))}
            </div>

        </div>
    </>
  );
}
