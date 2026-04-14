import React from 'react';
import { 
    getExerciseStatus, getLaundryStatus, getWateringStatus, 
    getSprayStatus, getDrivingStatus, getCampingStatus 
} from '../../utils/weatherHelpers';

export default function ActivityRecommendations({ current, isMobile, cardBg, borderColor, subTextColor }) {
  const exercise = getExerciseStatus(current);
  const laundry = getLaundryStatus(current);
  const watering = getWateringStatus(current);
  const spray = getSprayStatus(current);
  const driving = getDrivingStatus(current);
  const camping = getCampingStatus(current);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px', flexShrink: 0, marginBottom: '20px' }}>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🏃‍♂️</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ออกกำลังกาย</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: exercise.color }}>{exercise.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{exercise.desc}</div>
        </div>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👕</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ซักผ้า / ล้างรถ</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: laundry.color }}>{laundry.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{laundry.desc}</div>
        </div>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>💧</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>รดน้ำต้นไม้</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: watering.color }}>{watering.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{watering.desc}</div>
        </div>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🚁</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ฉีดพ่นยา/ปุ๋ย</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: spray.color }}>{spray.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{spray.desc}</div>
        </div>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🚘</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ขับขี่เดินทาง</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: driving.color }}>{driving.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{driving.desc}</div>
        </div>
        <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⛺</div>
            <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>เที่ยว / ตั้งแคมป์</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: camping.color }}>{camping.text}</div>
            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{camping.desc}</div>
        </div>
    </div>
  );
}
