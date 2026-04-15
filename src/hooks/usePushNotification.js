import { useState, useEffect, useCallback } from 'react';

/**
 * Hook สำหรับ Push Notification (Web Push API)
 * รองรับ: Android Chrome ✅ | iOS 16.4+ PWA ✅
 */
export function usePushNotification() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  // ขอ permission จาก user (native dialog)
  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  // ส่ง Local Notification (ไม่ต้องใช้ server)
  const sendLocalNotification = useCallback(async (title, options = {}) => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return false;
    }
    // ใช้ Service Worker showNotification ถ้ามี (รองรับ iOS PWA ดีกว่า)
    if ('serviceWorker' in navigator) {
      const sw = await navigator.serviceWorker.ready;
      await sw.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        ...options,
      });
    } else {
      new Notification(title, {
        icon: '/icon-192x192.png',
        ...options,
      });
    }
    return true;
  }, [permission, requestPermission]);

  // แจ้งเตือน AQI เกินระดับ
  const notifyAQI = useCallback(async (aqiValue, province) => {
    let level = '';
    let urgency = '';
    if (aqiValue >= 300) { level = '☠️ อันตรายมาก'; urgency = 'อย่าออกจากบ้านเด็ดขาด!'; }
    else if (aqiValue >= 200) { level = '🔴 อันตราย'; urgency = 'หลีกเลี่ยงกิจกรรมนอกบ้าน'; }
    else if (aqiValue >= 150) { level = '🟠 ไม่ดีต่อสุขภาพ'; urgency = 'กลุ่มเสี่ยงควรอยู่ในบ้าน'; }
    else if (aqiValue >= 100) { level = '🟡 ปานกลาง'; urgency = 'กลุ่มเสี่ยงควรระวัง'; }
    else return; // AQI ดี ไม่ต้องแจ้ง

    return sendLocalNotification(`AQI ${aqiValue} — ${level}`, {
      body: `${province}: ${urgency}`,
      tag: 'aqi-alert',
      renotify: true,
      requireInteraction: aqiValue >= 200,
      data: { aqiValue, province, url: '/alerts' },
      actions: [
        { action: 'view', title: '📊 ดูรายละเอียด' },
        { action: 'dismiss', title: 'ยกเลิก' },
      ],
    });
  }, [sendLocalNotification]);

  return { permission, isSupported, requestPermission, sendLocalNotification, notifyAQI };
}
