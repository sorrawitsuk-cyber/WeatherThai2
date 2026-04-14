export const getWindDir = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'เหนือ';
    if (deg >= 22.5 && deg < 67.5) return 'ตอ.เฉียงเหนือ';
    if (deg >= 67.5 && deg < 112.5) return 'ตะวันออก';
    if (deg >= 112.5 && deg < 157.5) return 'ตอ.เฉียงใต้';
    if (deg >= 157.5 && deg < 202.5) return 'ใต้';
    if (deg >= 202.5 && deg < 247.5) return 'ตต.เฉียงใต้';
    if (deg >= 247.5 && deg < 292.5) return 'ตะวันตก';
    if (deg >= 292.5 && deg < 337.5) return 'ตต.เฉียงเหนือ';
    return '-';
};

export const getSunTime = (dateStr) => {
    return dateStr ? new Date(dateStr).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '--:--';
};

export const getAqiTheme = (pm25) => {
    if (pm25 > 75) return { bg: '#ef4444', text: 'มีผลกระทบต่อสุขภาพ' };
    if (pm25 > 37.5) return { bg: '#f97316', text: 'เริ่มมีผลกระทบ' };
    if (pm25 > 25) return { bg: '#eab308', text: 'ปานกลาง' };
    if (pm25 > 15) return { bg: '#22c55e', text: 'คุณภาพอากาศดี' };
    return { bg: '#0ea5e9', text: 'อากาศดีมาก' };
};

export const getAlertBanner = (current) => {
    if (!current) return null;
    if (current.pm25 > 75) return { type: 'PM2.5', color: '#ef4444', icon: '😷', text: 'มลพิษระดับอันตราย ควรสวมหน้ากาก N95 และงดกิจกรรมกลางแจ้ง' };
    if (current.rainProb > 70) return { type: 'Rain', color: '#3b82f6', icon: '⛈️', text: 'มีพายุฝนฟ้าคะนองในพื้นที่' };
    if (current.feelsLike >= 42) return { type: 'Heat', color: '#ea580c', icon: '🔥', text: 'ดัชนีความร้อนวิกฤต ระวังโรคลมแดด' };
    return null;
};

export const getWeatherBackground = (isNight, isRaining, isHot) => {
    if (isRaining) return 'linear-gradient(135deg, #334155, #0f172a)';
    if (isNight) return 'linear-gradient(135deg, #1e1b4b, #0f172a)';
    if (isHot) return 'linear-gradient(135deg, #ea580c, #9a3412)';
    return 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
};

export const getBriefingText = (weatherText, maxTemp, dailyRainProb, pm25) => {
    let text = `วันนี้สภาพอากาศโดยรวม${weatherText.replace('อากาศดี ', '')} อุณหภูมิสูงสุดจะอยู่ที่ ${maxTemp}°C `;
    if (dailyRainProb > 40) text += `และมีโอกาสเกิดฝนตก ${dailyRainProb}% แนะนำให้พกร่มหรืออุปกรณ์กันฝนก่อนออกจากบ้านครับ ☔`;
    else if (maxTemp >= 38) text += `อากาศค่อนข้างร้อนจัด ควรดื่มน้ำบ่อยๆ และหลีกเลี่ยงการทำกิจกรรมกลางแจ้งเป็นเวลานานครับ 🥤`;
    else if (pm25 > 37.5) text += `ค่าฝุ่น PM2.5 ค่อนข้างสูง แนะนำให้สวมหน้ากากอนามัยเมื่อออกนอกอาคารครับ 😷`;
    else text += `อากาศเป็นใจ เหมาะสำหรับการทำกิจกรรมนอกบ้านหรือซักผ้าครับ ✨`;
    return text;
};

// Activity Status Functions
export const getExerciseStatus = (current) => {
    if (current?.pm25 > 75 || current?.feelsLike > 39 || current?.rainProb > 60) return { text: 'งดกิจกรรม', color: '#ef4444', desc: 'สภาพอากาศไม่เหมาะสม' };
    if (current?.pm25 > 37.5 || current?.feelsLike > 35) return { text: 'ลดเวลา', color: '#f97316', desc: 'มีผลกระทบต่อสุขภาพ' };
    if (current?.pm25 > 25) return { text: 'พอใช้', color: '#eab308', desc: 'คุณภาพอากาศปานกลาง' };
    if (current?.pm25 > 15) return { text: 'ดี', color: '#22c55e', desc: 'คุณภาพอากาศดี' };
    return { text: 'ดีเยี่ยม', color: '#0ea5e9', desc: 'อากาศดีมาก ฝุ่นน้อย' };
};

export const getLaundryStatus = (current) => {
    if (current?.rainProb > 50 || current?.rain > 0) return { text: 'ไม่แนะนำ', color: '#ef4444', desc: 'มีความเสี่ยงฝนตก' };
    if (current?.rainProb > 20) return { text: 'มีความเสี่ยง', color: '#eab308', desc: 'ควรจับตาดูเมฆฝน' };
    return { text: 'ทำได้เลย', color: '#22c55e', desc: 'แดดดี ฝนไม่ตก' };
};

export const getWateringStatus = (current) => {
    if (current?.rainProb > 60 || current?.rain > 0) return { text: 'ไม่ต้องรด', color: '#94a3b8', desc: 'ฝนจะตกช่วยรดให้' };
    return { text: 'ควรรดน้ำ', color: '#3b82f6', desc: 'ดินอาจแห้ง ดินขาดน้ำ' };
};

export const getSprayStatus = (current) => {
    if (current?.windSpeed > 15) return { text: 'ลมแรงไป', color: '#ef4444', desc: 'น้ำยาอาจปลิวสูญเปล่า' };
    if (current?.rainProb > 40) return { text: 'เสี่ยงฝนชะล้าง', color: '#f97316', desc: 'ฝนอาจชะล้างน้ำยา' };
    return { text: 'ฉีดพ่นได้', color: '#22c55e', desc: 'ลมสงบ น้ำยาไม่ปลิว' };
};

export const getDrivingStatus = (current) => {
    if ((current?.visibility / 1000) < 2 || current?.rainProb > 60) return { text: 'เพิ่มระมัดระวัง', color: '#ef4444', desc: 'ทัศนวิสัยต่ำ/ถนนลื่น' };
    if ((current?.visibility / 1000) < 5 || current?.rainProb > 30) return { text: 'ระวังฝนระยะสั้น', color: '#eab308', desc: 'อาจมีฝนปรอย/หมอกลง' };
    return { text: 'ปลอดภัย', color: '#22c55e', desc: 'ทัศนวิสัยเคลียร์ ถนนแห้ง' };
};

export const getCampingStatus = (current) => {
    if (current?.rainProb > 50 || current?.windSpeed > 25) return { text: 'เลื่อนไปก่อน', color: '#ef4444', desc: 'เสี่ยงพายุและลมแรง' };
    if (current?.pm25 > 37.5 || current?.feelsLike > 38) return { text: 'ไม่น่าสบายนัก', color: '#f97316', desc: 'ฝุ่นหนาหรือร้อนจัด' };
    return { text: 'บรรยากาศดี', color: '#22c55e', desc: 'อากาศโปร่ง เหมาะจัดทริป' };
};
