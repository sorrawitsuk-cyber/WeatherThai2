import React, { useState, useEffect } from 'react';

export default function SunriseSunsetArc({ current, cardBg, borderColor, textColor, subTextColor }) {
    const [progress, setProgress] = useState(0);
    const [isDay, setIsDay] = useState(true);

    useEffect(() => {
        if (!current?.sunrise || !current?.sunset) return;

        const updatePosition = () => {
            const now = new Date();
            const rise = new Date(current.sunrise);
            const set = new Date(current.sunset);
            
            if (now >= rise && now <= set) {
                // Daytime
                setIsDay(true);
                const totalDay = set - rise;
                const elapsed = now - rise;
                setProgress(Math.max(0, Math.min(1, elapsed / totalDay)));
            } else {
                // Nighttime
                setIsDay(false);
                let nightStart, nightEnd;
                
                if (now < rise) {
                    nightStart = new Date(rise.getTime() - 12 * 60 * 60 * 1000);
                    nightEnd = rise;
                } else {
                    nightStart = set;
                    nightEnd = new Date(set.getTime() + 12 * 60 * 60 * 1000);
                }
                
                const totalNight = nightEnd - nightStart;
                const elapsed = now - nightStart;
                setProgress(Math.max(0, Math.min(1, elapsed / totalNight)));
            }
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000);
        return () => clearInterval(interval);
    }, [current]);

    const svgWidth = 200;
    const svgHeight = 90;
    const padding = 20;
    const r = (svgWidth - padding * 2) / 2; // 80 radius
    const cx = svgWidth / 2; // 100
    const cy = svgHeight - 10; // 80

    const x = cx - r * Math.cos(progress * Math.PI);
    const y = cy - r * Math.sin(progress * Math.PI);

    const riseTime = current?.sunrise ? new Date(current.sunrise).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
    const setTime = current?.sunset ? new Date(current.sunset).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';

    return (
        <div style={{ background: cardBg, borderRadius: '20px', padding: '18px 16px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, width: '100%', minHeight: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: subTextColor, fontSize: '0.85rem', fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: '5px' }}>
                <span style={{ fontSize: '1.2rem' }}>🌅</span> พระอาทิตย์ขึ้น / ตก
            </div>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '220px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'hidden', display: 'block' }}>
                    
                    {/* Horizon line */}
                    <line x1={padding - 10} y1={cy} x2={svgWidth - padding + 10} y2={cy} stroke={borderColor} strokeWidth="2" strokeDasharray="3 3" opacity={0.6} />
                    
                    {/* Background Arc */}
                    <path 
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} 
                        fill="none" 
                        stroke={isDay ? "rgba(234, 179, 8, 0.2)" : "rgba(148, 163, 184, 0.2)"} 
                        strokeWidth="2" 
                        strokeDasharray="4 4"
                    />
                    
                    {/* Active dynamic progress arc */}
                    {progress > 0 && (
                        <path 
                            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`} 
                            fill="none" 
                            stroke={isDay ? "#eab308" : "#cbd5e1"} 
                            strokeWidth="3" 
                        />
                    )}

                    {/* Dynamic Icon with glowing effect */}
                    <text 
                        x={x} 
                        y={y} 
                        textAnchor="middle" 
                        dominantBaseline="central" 
                        fontSize="22"
                        style={{ filter: isDay ? 'drop-shadow(0px 0px 8px rgba(234, 179, 8, 0.8))' : 'drop-shadow(0px 0px 8px rgba(203, 213, 225, 0.6))' }}
                    >
                        {isDay ? '☀️' : '🌙'}
                    </text>
                </svg>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 15px', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: subTextColor }}>ขึ้น</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{riseTime}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: subTextColor }}>ตก</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{setTime}</span>
                </div>
            </div>
        </div>
    );
}
