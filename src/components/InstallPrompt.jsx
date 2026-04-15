import React, { useState, useEffect } from 'react';

/**
 * Custom Install Prompt Banner
 * - Android Chrome: ตรวจจับ beforeinstallprompt → แสดง banner สวยงาม
 * - iOS Safari: แสดง instruction "Share → Add to Home Screen"
 * - ซ่อนอัตโนมัติเมื่อติดตั้งแล้ว (standalone mode)
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ถ้าเปิดใน standalone (ติดตั้งแล้ว) ไม่ต้องแสดง
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS standalone

    // ดูว่า dismiss ไปแล้วหรือยัง
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) return;

    // ตรวจสอบ iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS: แสดง instruction หลัง 3 วินาที
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }

    // Android Chrome: รอ beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide เมื่อ user ติดตั้งสำเร็จ
    const installedHandler = () => setShowBanner(false);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!showBanner || dismissed) return null;

  return (
    <>
      {/* Backdrop blur */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99998,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.3s ease',
      }} onClick={handleDismiss} />

      {/* Banner */}
      <div style={{
        position: 'fixed',
        bottom: isIOS ? '90px' : '90px',
        left: '16px', right: '16px',
        zIndex: 99999,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c2a3e 100%)',
        border: '1px solid rgba(14,165,233,0.4)',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        maxWidth: '480px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
          <img
            src="/icon-192x192.png"
            alt="AirQuality Thai"
            style={{ width: '56px', height: '56px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(14,165,233,0.4)' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
              ติดตั้ง AirQuality Thai
            </div>
            <div style={{ fontFamily: 'Kanit, sans-serif', fontSize: '0.78rem', color: '#7dd3fc', marginTop: '2px' }}>
              ตรวจสอบคุณภาพอากาศแบบ Native App
            </div>
          </div>
          <button onClick={handleDismiss} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8',
            borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {[
            { icon: '📶', text: 'ใช้งานได้แม้ไม่มีเน็ต (ข้อมูล Cache)' },
            { icon: '🔔', text: 'รับการแจ้งเตือนเมื่อ AQI เกินระดับ' },
            { icon: '📍', text: 'ระบุตำแหน่ง GPS เพื่อดูข้อมูลพื้นที่ใกล้ๆ' },
            { icon: '⚡', text: 'เปิดเร็วกว่าเว็บ เหมือนแอปจริง' },
          ].map((f) => (
            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1rem' }}>{f.icon}</span>
              <span style={{ fontFamily: 'Kanit, sans-serif', fontSize: '0.82rem', color: '#cbd5e1' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {isIOS ? (
          /* iOS Instructions */
          <div style={{
            background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 600, color: '#7dd3fc', fontSize: '0.85rem', marginBottom: '8px' }}>
              วิธีติดตั้งบน iPhone / iPad:
            </div>
            <div style={{ fontFamily: 'Kanit, sans-serif', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.7 }}>
              1. กดปุ่ม <strong style={{ color: '#7dd3fc' }}>แชร์ (Share)</strong> ที่แถบล่าง Safari <br />
              2. เลือก <strong style={{ color: '#7dd3fc' }}>"Add to Home Screen"</strong> <br />
              3. กด <strong style={{ color: '#7dd3fc' }}>"Add"</strong> เพื่อยืนยัน ✅
            </div>
          </div>
        ) : (
          /* Android Install Button */
          <button onClick={handleInstall} style={{
            width: '100%', padding: '14px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            border: 'none', borderRadius: '12px',
            color: '#ffffff', fontFamily: 'Kanit, sans-serif', fontWeight: 700,
            fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.01em',
            boxShadow: '0 4px 15px rgba(14,165,233,0.4)',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <span>📲</span> ติดตั้งแอปฟรี
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
