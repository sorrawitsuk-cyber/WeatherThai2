import { useState, useEffect, useCallback } from 'react';

/**
 * Hook สำหรับ GPS / Native Geolocation
 * ขอ permission native dialog และส่งกลับ lat/lng พร้อม state
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);      // { lat, lng, accuracy }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('unknown'); // 'granted' | 'denied' | 'prompt' | 'unknown'

  // ตรวจสอบสถานะ permission ปัจจุบัน
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setPermission(result.state);
      result.addEventListener('change', () => setPermission(result.state));
    });
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('อุปกรณ์ไม่รองรับ GPS');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setPermission('granted');
        setLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
          setError('ไม่ได้รับอนุญาตเข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ใน Settings');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('ไม่สามารถระบุตำแหน่งได้');
        } else {
          setError('หมดเวลาค้นหาตำแหน่ง กรุณาลองใหม่');
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // Watch position (continuous tracking)
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) return null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setPermission('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
      },
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { location, error, loading, permission, getLocation, watchLocation };
}
