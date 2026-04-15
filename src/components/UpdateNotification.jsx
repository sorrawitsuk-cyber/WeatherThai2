import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * แบนเนอร์แจ้งเมื่อมี Service Worker update ใหม่
 * ใช้ useRegisterSW จาก vite-plugin-pwa
 */
export default function UpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] SW registered:', r);
    },
    onRegisterError(error) {
      console.log('[PWA] SW registration error:', error);
    },
  });

  const close = () => setNeedRefresh(false);

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 99999,
      background: 'linear-gradient(135deg, #1e293b, #0c2a3e)',
      border: '1px solid rgba(14,165,233,0.5)',
      borderRadius: '16px',
      padding: '14px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(14,165,233,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      minWidth: '300px',
      maxWidth: '90vw',
      animation: 'slideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      <span style={{ fontSize: '1.4rem' }}>🔄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Kanit, sans-serif', fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
          มีเวอร์ชันใหม่พร้อมใช้งาน
        </div>
        <div style={{ fontFamily: 'Kanit, sans-serif', color: '#94a3b8', fontSize: '0.75rem' }}>
          กดอัปเดตเพื่อรับฟีเจอร์ล่าสุด
        </div>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          border: 'none', borderRadius: '10px',
          color: '#fff', fontFamily: 'Kanit, sans-serif', fontWeight: 700,
          fontSize: '0.82rem', padding: '8px 16px', cursor: 'pointer',
          whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(14,165,233,0.35)',
        }}
      >
        อัปเดต
      </button>
      <button
        onClick={close}
        style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
          borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
          flexShrink: 0,
        }}
      >✕</button>

      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-40px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
