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
    if (isRaining) return 'linear-gradient(145deg, #2d4a6b, #1a2f4a, #0f172a)';
    if (isNight) return 'linear-gradient(145deg, #1e40af, #2d2070, #1e1b4b)';
    if (isHot) return 'linear-gradient(145deg, #f97316, #ea580c, #c2410c)';
    return 'linear-gradient(145deg, #38bdf8, #60d0ff, #bae6fd)';
};

export const getBriefingText = (weatherText, currentTemp, feelsLike, maxTemp, dailyRainProb, pm25, currentHour, tomorrowMaxTemp, tomorrowRainProb) => {
    const parts = [];
    const isNight = currentHour >= 18 || currentHour < 6;
    const greeting = isNight ? '🌙 สวัสดีตอนค่ำ!' : currentHour < 12 ? '☀️ สวัสดีตอนเช้า!' : '🌤️ สวัสดีตอนบ่าย!';

    parts.push(greeting);

    if (currentTemp !== undefined && feelsLike !== undefined) {
        parts.push(`ขณะนี้สภาพอากาศ${weatherText} อุณหภูมิ ${Math.round(currentTemp)}° (รู้สึกเหมือน ${Math.round(feelsLike)}°)`);
    }

    // ☂️ ร่ม?
    if (dailyRainProb > 70) parts.push(`☂️ วันนี้ฝนมาแน่ (${dailyRainProb}%) พกร่มไว้เลยนะ!`);
    else if (dailyRainProb > 40) parts.push(`🌂 มีโอกาสฝนตก ${dailyRainProb}% ถ้าออกไปข้างนอกพกร่มไว้จะชัวร์กว่า`);

    // 🔥 ร้อน?
    if (maxTemp >= 40) parts.push(`🥵 ระหว่างวันร้อนสะท้านถึง ${maxTemp}° วันนี้อยู่ในร่มดีกว่า ดื่มน้ำเยอะๆ นะ!`);
    else if (maxTemp >= 38) parts.push(`🔥 ระหว่างวันค่อนข้างร้อนจัด ${maxTemp}° อย่าลืมดื่มน้ำบ่อยๆ หลีกเลี่ยงแดดช่วงเที่ยงนะ`);
    else if (maxTemp >= 35) parts.push(`🌡️ อุณหภูมิสูงสุดวันนี้ ${maxTemp}° ทาครีมกันแดดด้วยนะ`);
    else if (maxTemp <= 22) parts.push(`🧥 วันนี้เย็นสบาย ${maxTemp}° เตรียมเสื้อกันหนาวไว้ด้วย`);

    // 😷 ฝุ่น?
    if (pm25 > 75) parts.push(`😷 ฝุ่นหนักมาก (PM2.5: ${Math.round(pm25)}) ใส่ N95 ก่อนออกนอกบ้านนะ!`);
    else if (pm25 > 37.5) parts.push(`😷 ฝุ่นค่อนข้างเยอะ (PM2.5: ${Math.round(pm25)}) ใส่แมสก์ไว้จะดีกว่า`);

    // 🔮 พรุ่งนี้?
    if (tomorrowMaxTemp !== null && tomorrowMaxTemp !== undefined) {
        let tmrText = `พรุ่งนี้`;
        if (tomorrowRainProb > 50) tmrText += `มีแววฝนตก (${tomorrowRainProb}%) `;
        else tmrText += `ฝนแทบไม่มี `;
        tmrText += `อุณหภูมิสูงสุดประมาณ ${tomorrowMaxTemp}°`;
        parts.push(`🔮 ${tmrText}`);
    } else {
        if (dailyRainProb <= 20 && maxTemp < 38 && pm25 <= 25) {
            parts.push(`✨ โดยรวมอากาศดี เหมาะออกไปทำกิจกรรมข้างนอก!`);
        }
    }

    return parts.join(' ');
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
