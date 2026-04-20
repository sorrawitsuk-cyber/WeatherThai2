import React, { useEffect, useMemo, useState } from 'react';

const NEWS_CACHE_KEY = 'airqualitythai:news-cache:v3';
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;
const NEWS_FETCH_TIMEOUT_MS = 12000;

const ANIMATIONS = `
@keyframes alertPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
  50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
}
@keyframes dotBlink {
  0%,100% { opacity: 1; }
  50% { opacity: 0.25; }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const SEV = {
  high: {
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.10)',
    border: 'rgba(220,38,38,0.28)',
    accent: '#ef4444',
    badgeBg: 'rgba(220,38,38,0.16)',
    label: 'เร่งด่วน',
    icon: '🔴',
    priority: 3,
  },
  medium: {
    color: '#b45309',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.28)',
    accent: '#f59e0b',
    badgeBg: 'rgba(245,158,11,0.16)',
    label: 'เฝ้าระวัง',
    icon: '🟡',
    priority: 2,
  },
  normal: {
    color: '#0f766e',
    bg: 'rgba(20,184,166,0.08)',
    border: 'rgba(20,184,166,0.20)',
    accent: '#14b8a6',
    badgeBg: 'rgba(20,184,166,0.12)',
    label: 'ติดตาม',
    icon: '🟢',
    priority: 1,
  },
};

const CAT_LABELS = {
  warning: 'ประกาศเตือน',
  storm: 'พายุ-ฝน',
  earthquake: 'แผ่นดินไหว',
  'thai-disaster': 'เหตุในไทย',
  'global-alert': 'เตือนโลก',
  'global-disaster': 'ภัยพิบัติ',
  climate: 'ภูมิอากาศ',
};

const THAI_SECTIONS = [
  { key: 'warnings', title: 'ประกาศเตือนภัย', desc: 'ติดตามประกาศจากกรมอุตุนิยมวิทยา (TMD)', icon: '⚠️', accent: '#ef4444' },
  { key: 'storms', title: 'พายุและฝน', desc: 'สภาพอากาศน่าจับตามองในไทย', icon: '🌧️', accent: '#3b82f6' },
  { key: 'earthquakes', title: 'แผ่นดินไหวใกล้ไทย', desc: 'รายงานแผ่นดินไหวในภูมิภาคจาก TMD & USGS', icon: '🌋', accent: '#f97316' },
  { key: 'disasters', title: 'รายงานเหตุการณ์ไทย', desc: 'ข้อมูลภัยพิบัติในไทยจาก ReliefWeb', icon: '📍', accent: '#14b8a6' },
  { key: 'ddpm', title: 'กรมป้องกันและบรรเทาสาธารณภัย', desc: 'ข้อมูลจาก ปภ. (disaster.go.th)', icon: '🛡️', accent: '#dc2626' },
  { key: 'thaiPbs', title: 'ข่าวไทยพีบีเอส', desc: 'ข่าวสภาพอากาศและภัยพิบัติจาก Thai PBS', icon: '📺', accent: '#7c3aed' },
];

const GLOBAL_SECTIONS = [
  { key: 'alerts', title: 'เตือนภัยระดับโลก', desc: 'ข้อมูลจาก GDACS ระดับ Orange/Red', icon: '🚨', accent: '#ef4444' },
  { key: 'earthquakes', title: 'แผ่นดินไหวรุนแรงทั่วโลก', desc: 'แผ่นดินไหวสำคัญทั่วโลก จาก USGS', icon: '🌍', accent: '#f97316' },
  { key: 'earthquakesRegional', title: 'แผ่นดินไหว M4.5+ เอเชีย', desc: 'แผ่นดินไหว M4.5+ ในภูมิภาคเอเชียจาก USGS', icon: '🌏', accent: '#ea580c' },
  { key: 'disasters', title: 'ภัยพิบัติทั่วโลก', desc: 'รายงานภัยพิบัติจาก ReliefWeb', icon: '🧭', accent: '#8b5cf6' },
  { key: 'eonet', title: 'ปรากฏการณ์ธรรมชาติ', desc: 'เหตุการณ์ธรรมชาติแบบ real-time จาก NASA EONET', icon: '🌋', accent: '#f59e0b' },
];

// ─── Cache helpers ────────────────────────────────────────────────────────────

function readCachedNews() {
  try {
    const raw = sessionStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > NEWS_CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch { return null; }
}

function writeCachedNews(payload) {
  try {
    sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ payload, savedAt: Date.now() }));
  } catch {}
}

async function fetchNewsWithTimeout(url, timeoutMs = NEWS_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('ใช้เวลานานกว่าปกติในการดึง RSS feed โปรดลองใหม่อีกครั้ง');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatAgo(publishedAt) {
  if (!publishedAt) return '';
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return '';
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (hours < 1) return 'เพิ่งอัปเดต';
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  if (days <= 7) return `${days} วันที่แล้ว`;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatItems(items = []) {
  return items.map((item) => ({
    ...item,
    categoryLabel: CAT_LABELS[item.category] || 'ข่าว',
    timeAgo: formatAgo(item.publishedAt),
  }));
}

// ─── Analysis helpers ─────────────────────────────────────────────────────────

function detectEnsoPhase(climateItems = []) {
  const text = climateItems
    .map((item) => `${item.title} ${item.summary || ''}`)
    .join(' ')
    .toLowerCase();
  if (/el ni[ñn]o|เอลนีโญ่/.test(text)) return 'elnino';
  if (/la ni[ñn]a|ลานีญ่า/.test(text)) return 'lanina';
  return 'neutral';
}

function computeThaiRisk(thaiGroups) {
  const allThai = [
    ...(thaiGroups.warnings || []),
    ...(thaiGroups.storms || []),
    ...(thaiGroups.disasters || []),
    ...(thaiGroups.earthquakes || []),
  ];
  const highCount = allThai.filter((item) => item.severity === 'high').length;
  const medCount = allThai.filter((item) => item.severity === 'medium').length;
  const score = Math.min(100, highCount * 22 + medCount * 9);
  if (score >= 60) return { score, label: 'สูง', color: '#dc2626', icon: '🔴' };
  if (score >= 30) return { score, label: 'ปานกลาง', color: '#d97706', icon: '🟡' };
  if (score > 0) return { score, label: 'ต่ำ', color: '#059669', icon: '🟢' };
  return { score: 0, label: 'น้อยมาก', color: '#6b7280', icon: '⚪' };
}

// ─── Base components ──────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <section
      style={{
        background: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SectionHeader({ icon, title, desc, accent, count }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        {accent && (
          <div style={{ width: '4px', height: '22px', borderRadius: '999px', background: accent, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: '1.05rem' }}>{icon}</span>
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 900 }}>{title}</h2>
        {count != null && count > 0 && (
          <span
            style={{
              background: accent ? `${accent}22` : 'rgba(148,163,184,0.16)',
              color: accent || 'var(--text-sub)',
              border: `1px solid ${accent ? `${accent}44` : 'rgba(148,163,184,0.2)'}`,
              borderRadius: '999px',
              padding: '2px 9px',
              fontSize: '0.66rem',
              fontWeight: 900,
            }}
          >
            {count} รายการ
          </span>
        )}
      </div>
      {desc && (
        <p
          style={{
            margin: 0,
            color: 'var(--text-sub)',
            fontSize: '0.77rem',
            lineHeight: 1.55,
            paddingLeft: accent ? '12px' : '0',
          }}
        >
          {desc}
        </p>
      )}
    </div>
  );
}

function MetaBadge({ text, color, bg }) {
  return (
    <span
      style={{
        background: bg || 'rgba(148,163,184,0.15)',
        color: color || 'var(--text-sub)',
        border: `1px solid ${color ? `${color}44` : 'rgba(148,163,184,0.2)'}`,
        borderRadius: '999px',
        padding: '3px 9px',
        fontSize: '0.66rem',
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

function EmptyCard({ title, desc }) {
  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px dashed var(--border-color)',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ color: 'var(--text-main)', fontWeight: 800, marginBottom: '4px' }}>{title}</div>
      <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

// ─── NewsItem ─────────────────────────────────────────────────────────────────

function NewsItem({ item, showRank, rank, isDark = false }) {
  const sev = SEV[item.severity] || SEV.normal;
  const isHigh = item.severity === 'high';

  return (
    <article
      style={{
        background: isDark ? 'rgba(15,30,60,0.75)' : '#ffffff',
        borderRadius: '16px',
        border: `1px solid ${sev.border}`,
        borderLeft: `4px solid ${sev.accent}`,
        padding: '14px',
        display: 'grid',
        gap: '8px',
        animation: isHigh ? 'alertPulse 2.5s ease-in-out infinite, fadeSlideIn 0.3s ease' : 'fadeSlideIn 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {showRank && (
          <div
            style={{
              flexShrink: 0,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: sev.badgeBg,
              border: `2px solid ${sev.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 900,
              color: sev.color,
            }}
          >
            {rank}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                background: sev.badgeBg,
                color: sev.color,
                border: `1px solid ${sev.accent}44`,
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '0.65rem',
                fontWeight: 900,
              }}
            >
              {sev.icon} {sev.label}
            </span>
            {item.categoryLabel && (
              <span style={{ color: 'var(--text-sub)', fontSize: '0.68rem', fontWeight: 700 }}>
                {item.categoryLabel}
              </span>
            )}
            {item.source && (
              <span style={{ color: 'var(--text-sub)', fontSize: '0.67rem', fontWeight: 600 }}>
                {item.source}
              </span>
            )}
            {item.timeAgo && (
              <span style={{ marginLeft: 'auto', color: 'var(--text-sub)', fontSize: '0.67rem' }}>
                {item.timeAgo}
              </span>
            )}
          </div>

          <div
            style={{
              color: 'var(--text-main)',
              fontWeight: 900,
              fontSize: '0.9rem',
              lineHeight: 1.5,
              marginBottom: '4px',
            }}
          >
            {item.title}
          </div>

          {item.summary && (
            <div style={{ color: 'var(--text-sub)', fontSize: '0.78rem', lineHeight: 1.65 }}>
              {item.summary}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
              marginTop: '8px',
              alignItems: 'center',
            }}
          >
            {item.eventLabel && <MetaBadge text={item.eventLabel} color={sev.color} bg={sev.badgeBg} />}
            {item.country && <MetaBadge text={`📍 ${item.country}`} />}
            {item.magnitude && <MetaBadge text={`M ${item.magnitude}`} color="#ea580c" bg="rgba(234,88,12,0.12)" />}
            {item.tsunami === 1 && (
              <MetaBadge text="⚠️ สึนามิ" color="#dc2626" bg="rgba(220,38,38,0.12)" />
            )}
            {item.status && <MetaBadge text={item.status} />}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto',
                  color: '#0284c7',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                อ่านต้นทาง →
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── AlertDashboard ───────────────────────────────────────────────────────────

function AlertDashboard({ allItems }) {
  const counts = useMemo(
    () => ({
      high: allItems.filter((item) => item.severity === 'high').length,
      medium: allItems.filter((item) => item.severity === 'medium').length,
      total: allItems.length,
    }),
    [allItems],
  );

  if (!counts.total) return null;

  const chips = [];
  if (counts.high)
    chips.push({ label: `เร่งด่วน ${counts.high}`, color: '#ef4444', bg: 'rgba(239,68,68,0.18)', icon: '🔴' });
  if (counts.medium)
    chips.push({ label: `เฝ้าระวัง ${counts.medium}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', icon: '🟡' });
  chips.push({ label: `ทั้งหมด ${counts.total}`, color: 'rgba(255,255,255,0.75)', bg: 'rgba(255,255,255,0.12)', icon: '📊' });

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {chips.map((chip, index) => (
        <div
          key={index}
          style={{
            background: chip.bg,
            color: chip.color,
            border: `1px solid ${chip.color}44`,
            borderRadius: '999px',
            padding: '6px 13px',
            fontSize: '0.74rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {chip.icon} {chip.label}
        </div>
      ))}
    </div>
  );
}

// ─── ENSO Phase Card ──────────────────────────────────────────────────────────

function EnsoPhaseCard({ phase }) {
  const configs = {
    elnino: {
      name: 'เอลนีโญ่ (El Niño)',
      status: 'มีสัญญาณ',
      color: '#ea580c',
      bg: 'linear-gradient(135deg, rgba(234,88,12,0.18), rgba(185,28,28,0.14))',
      border: 'rgba(234,88,12,0.36)',
      emoji: '☀️',
      description:
        'น้ำทะเลในมหาสมุทรแปซิฟิกตะวันออกอุ่นกว่าปกติ ส่งผลให้ฝนน้อยลงในไทยและเอเชียตะวันออกเฉียงใต้ ฤดูแล้งอาจยาวนานขึ้น',
      impactThai: [
        'ฝนน้อยกว่าปกติในช่วงฤดูร้อน–ต้นฝน',
        'เสี่ยงภาวะภัยแล้งในพื้นที่เกษตรกรรม',
        'อุณหภูมิสูงสุดอาจทุบสถิติในหลายจังหวัด',
      ],
    },
    lanina: {
      name: 'ลานีญ่า (La Niña)',
      status: 'มีสัญญาณ',
      color: '#0284c7',
      bg: 'linear-gradient(135deg, rgba(2,132,199,0.18), rgba(30,58,138,0.14))',
      border: 'rgba(2,132,199,0.36)',
      emoji: '🌧️',
      description:
        'น้ำทะเลในมหาสมุทรแปซิฟิกตะวันออกเย็นกว่าปกติ มักนำฝนมากและเพิ่มโอกาสเกิดพายุในภูมิภาคเอเชียตะวันออกเฉียงใต้',
      impactThai: [
        'ฝนมากกว่าปกติ เสี่ยงน้ำท่วมในลุ่มแม่น้ำ',
        'พายุโซนร้อนมีโอกาสพัดขึ้นฝั่งเพิ่มขึ้น',
        'อุณหภูมิต่ำกว่าปกติในฤดูหนาวบางช่วง',
      ],
    },
    neutral: {
      name: 'ปรากฏการณ์ ENSO',
      status: 'ระยะเป็นกลาง',
      color: '#059669',
      bg: 'linear-gradient(135deg, rgba(5,150,105,0.14), rgba(2,132,199,0.10))',
      border: 'rgba(5,150,105,0.28)',
      emoji: '🌊',
      description:
        'อุณหภูมิน้ำทะเลอยู่ในเกณฑ์ปกติ ยังไม่มีสัญญาณเอลนีโญ่หรือลานีญ่าที่ชัดเจน สภาพอากาศเป็นไปตามปกติตามฤดูกาล',
      impactThai: [
        'สภาพอากาศเป็นไปตามฤดูกาลปกติ',
        'ติดตามพยากรณ์ระยะกลาง 3–6 เดือนจาก WMO',
        'ยังคงต้องเฝ้าระวังพายุในฤดูมรสุม',
      ],
    },
  };

  const c = configs[phase] || configs.neutral;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '20px',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '2.6rem', lineHeight: 1, flexShrink: 0 }}>{c.emoji}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '8px',
            }}
          >
            <div style={{ color: c.color, fontWeight: 900, fontSize: '1rem' }}>{c.name}</div>
            <span
              style={{
                background: `${c.color}22`,
                color: c.color,
                border: `1px solid ${c.color}44`,
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontWeight: 900,
              }}
            >
              {c.status}
            </span>
          </div>
          <p style={{ margin: '0 0 12px', color: 'var(--text-sub)', fontSize: '0.83rem', lineHeight: 1.65 }}>
            {c.description}
          </p>
          <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.78rem', marginBottom: '8px' }}>
            ผลกระทบต่อประเทศไทย:
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {c.impactThai.map((impact, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '16px 1fr',
                  gap: '6px',
                  color: 'var(--text-sub)',
                  fontSize: '0.8rem',
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: c.color, fontWeight: 900 }}>•</span>
                <span>{impact}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Risk Meter ───────────────────────────────────────────────────────────────

function RiskMeter({ risk }) {
  const { score, label, color, icon } = risk;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <div style={{ color: 'var(--text-sub)', fontSize: '0.74rem', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ระดับความเสี่ยงต่อประเทศไทย
          </div>
          <div style={{ color, fontWeight: 900, fontSize: '1.4rem' }}>
            {icon} ความเสี่ยง{label}
          </div>
        </div>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            border: `4px solid ${color}`,
            background: `${color}14`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color, fontWeight: 900, fontSize: '1.1rem' }}>{score}</span>
        </div>
      </div>

      <div>
        <div
          style={{
            height: '10px',
            borderRadius: '999px',
            background: 'rgba(148,163,184,0.18)',
            overflow: 'hidden',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              borderRadius: '999px',
              background:
                score > 60
                  ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
                  : score > 25
                    ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                    : '#10b981',
              transition: 'width 0.8s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {[
            { label: 'น้อย', color: '#10b981' },
            { label: 'ปานกลาง', color: '#f59e0b' },
            { label: 'สูง', color: '#ef4444' },
          ].map((seg) => (
            <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: seg.color }} />
              <span style={{ color: 'var(--text-sub)', fontSize: '0.68rem' }}>{seg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Weather Day Card ─────────────────────────────────────────────────────────

function WeatherDayCard({ day, index, isDark }) {
  return (
    <div
      style={{
        background:
          index === 0
            ? isDark
              ? 'linear-gradient(180deg, rgba(14,165,233,0.38), rgba(19,39,69,0.96))'
              : 'linear-gradient(180deg, rgba(14,165,233,0.18), rgba(255,255,255,0.7))'
            : isDark
              ? 'linear-gradient(180deg, rgba(8,19,38,0.92), rgba(19,39,69,0.9))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(221,240,255,0.8))',
        borderRadius: '18px',
        border: `1px solid ${isDark ? 'rgba(125,211,252,0.16)' : 'var(--border-color)'}`,
        padding: '12px',
        display: 'grid',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '0.78rem' }}>
          {index === 0 ? 'วันนี้' : new Date(day.time).toLocaleDateString('th-TH', { weekday: 'short' })}
        </div>
        <span style={{ color: 'var(--text-sub)', fontSize: '0.68rem' }}>
          {new Date(day.time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', lineHeight: 1.4 }}>{day.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <div style={{ color: '#ea580c', fontWeight: 900, fontSize: '1.1rem' }}>{day.max != null ? `${day.max}°` : '-'}</div>
        <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.8rem' }}>{day.min != null ? `${day.min}°` : '-'}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-sub)', fontSize: '0.68rem' }}>
        <span>🌧️ {day.rainChance ?? '-'}%</span>
        <span>{day.rainSum || 0} มม.</span>
      </div>
    </div>
  );
}

// ─── Source Status ────────────────────────────────────────────────────────────

function SourceStatus({ sourceStatus = [] }) {
  if (!sourceStatus.length) return null;
  return (
    <Card>
      <SectionHeader icon="📡" title="สถานะแหล่งข้อมูล" desc="การเชื่อมต่อแหล่งข่าวแบบเรียลไทม์" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '8px',
        }}
      >
        {sourceStatus.map((src, i) => (
          <div
            key={i}
            style={{
              background: src.status === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(220,38,38,0.08)',
              border: `1px solid ${src.status === 'ok' ? 'rgba(16,185,129,0.22)' : 'rgba(220,38,38,0.22)'}`,
              borderRadius: '14px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: src.status === 'ok' ? '#10b981' : '#ef4444',
                  flexShrink: 0,
                  animation: src.status !== 'ok' ? 'dotBlink 1s ease infinite' : 'none',
                }}
              />
              <span style={{ fontWeight: 900, fontSize: '0.76rem', color: 'var(--text-main)' }}>{src.label}</span>
            </div>
            <div style={{ color: src.status === 'ok' ? '#059669' : '#dc2626', fontSize: '0.68rem', fontWeight: 700 }}>
              {src.status === 'ok' ? `✓ ${src.count} รายการ` : '✗ เชื่อมต่อไม่ได้'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Main NewsPage ────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(() => readCachedNews());
  const [loading, setLoading] = useState(!readCachedNews());
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(document.body.classList.contains('dark-theme'));
  const [sevFilter, setSevFilter] = useState('all');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const syncTheme = () => setIsDark(document.body.classList.contains('dark-theme'));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadNews = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetchNewsWithTimeout('/api/news');
      if (!response.ok) throw new Error('ยังไม่สามารถโหลดข่าวได้ในขณะนี้');
      const payload = await response.json();
      setData(payload);
      writeCachedNews(payload);
    } catch (err) {
      if (!silent) setError(err.message || 'ขออภัย ไม่สามารถแสดงข่าวได้');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCachedNews();
    if (cached) {
      setData(cached);
      setLoading(false);
      loadNews({ silent: true });
    } else {
      loadNews();
    }
    const timer = setInterval(() => loadNews({ silent: true }), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const thaiGroups = useMemo(() => {
    if (!data) return {};
    return {
      warnings: formatItems(data.thailand?.warnings || []),
      storms: formatItems(data.thailand?.storms || []),
      earthquakes: formatItems(data.thailand?.earthquakes || []),
      disasters: formatItems(data.thailand?.disasters || []),
      ddpm: formatItems(data.thailand?.ddpm || []),
      thaiPbs: formatItems(data.thailand?.thaiPbs || []),
      tmdEq: formatItems(data.thailand?.tmdEq || []),
      webSevenday: formatItems(data.thailand?.webSevenday || []),
    };
  }, [data]);

  const globalGroups = useMemo(() => {
    if (!data) return {};
    return {
      alerts: formatItems(data.global?.alerts || []),
      earthquakes: formatItems(data.global?.earthquakes || []),
      earthquakesRegional: formatItems(data.global?.earthquakesRegional || []),
      disasters: formatItems(data.global?.disasters || []),
      climate: formatItems(data.global?.climate || []),
      eonet: formatItems(data.global?.eonet || []),
    };
  }, [data]);

  const topStories = useMemo(() => formatItems(data?.topStories || []), [data]);
  const weatherDays = data?.weather?.days || [];
  const digestBullets = data?.digest?.bullets || [];
  const ensoPhase = useMemo(() => detectEnsoPhase(globalGroups.climate || []), [globalGroups.climate]);
  const riskScore = useMemo(() => computeThaiRisk(thaiGroups), [thaiGroups]);

  const allItems = useMemo(
    () => [
      ...(thaiGroups.warnings || []),
      ...(thaiGroups.storms || []),
      ...(thaiGroups.earthquakes || []),
      ...(thaiGroups.disasters || []),
      ...(thaiGroups.ddpm || []),
      ...(thaiGroups.thaiPbs || []),
      ...(globalGroups.alerts || []),
      ...(globalGroups.earthquakes || []),
      ...(globalGroups.earthquakesRegional || []),
      ...(globalGroups.disasters || []),
      ...(globalGroups.eonet || []),
    ],
    [thaiGroups, globalGroups],
  );

  const riskItems = useMemo(() => {
    const thai = [
      ...(thaiGroups.warnings || []),
      ...(thaiGroups.storms || []),
      ...(thaiGroups.disasters || []),
      ...(thaiGroups.earthquakes || []),
      ...(thaiGroups.ddpm || []),
    ];
    const regional = [
      ...(globalGroups.alerts || []),
      ...(globalGroups.earthquakesRegional || []),
      ...(globalGroups.eonet || []),
    ].filter((item) => {
      const text = `${item.title} ${item.summary || ''} ${item.country || ''}`.toLowerCase();
      return /thailand|myanmar|laos|cambodia|vietnam|malaysia|indonesia|mekong|southeast asia|เอเชีย/.test(text);
    });
    const combined = [...thai, ...regional];
    const seen = new Set();
    return combined
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 15);
  }, [thaiGroups, globalGroups]);

  const breakingItems = topStories.filter((item) => item.severity === 'high').slice(0, 3);

  const applyFilter = (items) => {
    if (sevFilter === 'all') return items;
    return items.filter((item) => item.severity === sevFilter);
  };

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: '✦' },
    { id: 'thailand', label: isMobile ? 'ไทย' : 'ข่าวไทย', icon: '🇹🇭' },
    { id: 'global', label: isMobile ? 'โลก' : 'ต่างประเทศ', icon: '🌐' },
    { id: 'enso', label: isMobile ? 'เอลนีโญ่' : 'เอลนีโญ่/ลานีญ่า', icon: '🌊' },
    { id: 'risk', label: isMobile ? 'ความเสี่ยง' : 'ความเสี่ยงต่อไทย', icon: '🎯' },
  ];

  return (
    <div
      className="hide-scrollbar"
      style={{
        minHeight: '100%',
        background:
          'radial-gradient(circle at top left, rgba(20,184,166,0.16), transparent 28%), radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 30%), var(--bg-app)',
        padding: isMobile ? '14px' : '28px',
        paddingBottom: isMobile ? '88px' : '42px',
      }}
    >
      <style>{ANIMATIONS}</style>

      <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gap: '16px' }}>
        {/* ── Header Card ─────────────────────────────────────────────────────── */}
        <Card
          style={{
            background: 'linear-gradient(135deg, #115e59 0%, #0369a1 45%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 24px 60px rgba(2,132,199,0.22)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 'auto -80px -120px auto',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '-60px auto auto -80px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }}
          />

          <div style={{ position: 'relative', display: 'grid', gap: '16px' }}>
            {/* Breaking news banner */}
            {!!breakingItems.length && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  background: 'rgba(127,29,29,0.34)',
                  border: '1px solid rgba(254,202,202,0.3)',
                }}
              >
                <span
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    animation: 'dotBlink 1.5s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                >
                  ⚡ ด่วน
                </span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, lineHeight: 1.5 }}>
                  {breakingItems.map((item) => item.title).join(' • ')}
                </span>
              </div>
            )}

            {/* Title row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '5px',
                  }}
                >
                  ข่าวสารและการแจ้งเตือน
                </div>
                <h1 style={{ margin: 0, color: '#ffffff', fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900 }}>
                  ข่าวอากาศ ภัยพิบัติ และภูมิอากาศ
                </h1>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', marginTop: '4px' }}>
                  อัปเดต {data?.labels?.generatedAt || '-'}
                </div>
              </div>
              <button
                onClick={loadNews}
                style={{
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: '999px',
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  backdropFilter: 'blur(8px)',
                  flexShrink: 0,
                }}
              >
                ↺ รีเฟรช
              </button>
            </div>

            {/* Alert dashboard */}
            <AlertDashboard allItems={allItems} />

            {/* AI Digest */}
            {(data?.digest?.headline || !!digestBullets.length) && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: '18px',
                  padding: isMobile ? '14px' : '18px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {data?.digest?.headline && (
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: isMobile ? '0.92rem' : '1.05rem',
                      lineHeight: 1.55,
                      marginBottom: digestBullets.length ? '12px' : 0,
                    }}
                  >
                    {data.digest.headline}
                  </div>
                )}
                {!!digestBullets.length && (
                  <div style={{ display: 'grid', gap: '7px' }}>
                    {digestBullets.slice(0, 4).map((bullet, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '14px 1fr',
                          gap: '8px',
                          fontSize: '0.83rem',
                          lineHeight: 1.55,
                        }}
                      >
                        <span style={{ fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>•</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      border: active ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '999px',
                      padding: '9px 15px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.14)',
                      color: active ? '#0f172a' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {tab.icon} {tab.label}
                    {tab.id === 'risk' && riskScore.score > 0 && (
                      <span
                        style={{
                          background: riskScore.color,
                          color: '#fff',
                          borderRadius: '999px',
                          padding: '1px 7px',
                          fontSize: '0.62rem',
                          fontWeight: 900,
                          marginLeft: '2px',
                        }}
                      >
                        {riskScore.score}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Loading/Error */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 12px', color: 'var(--text-sub)' }}>
              ⏳ กำลังโหลดข่าวล่าสุด...
            </div>
          </Card>
        )}
        {error && (
          <Card>
            <div style={{ color: '#dc2626', fontWeight: 800, padding: '8px 0' }}>⚠️ {error}</div>
          </Card>
        )}

        {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        {!loading && !error && data && activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '16px', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
            {!!weatherDays.length && (
              <Card>
                <SectionHeader
                  icon="🌤️"
                  title="พยากรณ์อากาศ 7 วัน — กรุงเทพฯ"
                  desc="ข้อมูลจาก Open-Meteo อัปเดตทุก 10 นาที"
                  accent="#0ea5e9"
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)',
                    gap: '8px',
                  }}
                >
                  {weatherDays.slice(0, isMobile ? 4 : 7).map((day, index) => (
                    <WeatherDayCard key={`${day.time}-${index}`} day={day} index={index} isDark={isDark} />
                  ))}
                </div>
              </Card>
            )}

            {!!topStories.length ? (
              <Card>
                <SectionHeader
                  icon="🎯"
                  title="จัดลำดับความเร่งด่วน"
                  desc="ข่าวเรียงตามระดับอันตราย ความเร่งด่วน และความใกล้ชิดกับไทย"
                  accent="#ef4444"
                  count={topStories.length}
                />
                <div style={{ display: 'grid', gap: '10px' }}>
                  {topStories.slice(0, 10).map((item, index) => (
                    <NewsItem
                      key={`rank-${item.id || item.title || index}`}
                      item={item}
                      showRank
                      rank={index + 1}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </Card>
            ) : (
              <EmptyCard title="ยังไม่มีข่าวเด่นในขณะนี้" desc="โปรดลองรีเฟรชใหม่อีกครั้ง" />
            )}
          </div>
        )}

        {/* ── THAILAND TAB ──────────────────────────────────────────────────── */}
        {!loading && !error && data && activeTab === 'thailand' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', fontWeight: 700 }}>กรอง:</span>
              {[
                { id: 'all', label: 'ทั้งหมด', color: '#64748b' },
                { id: 'high', label: '🔴 เร่งด่วน', color: '#dc2626' },
                { id: 'medium', label: '🟡 เฝ้าระวัง', color: '#d97706' },
                { id: 'normal', label: '🟢 ทั่วไป', color: '#059669' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSevFilter(f.id)}
                  style={{
                    border: `1px solid ${sevFilter === f.id ? f.color : 'var(--border-color)'}`,
                    borderRadius: '999px',
                    padding: '7px 14px',
                    background: sevFilter === f.id ? `${f.color}18` : 'var(--bg-card)',
                    color: sevFilter === f.id ? f.color : 'var(--text-sub)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                  }}
                >
                  {f.label}
                </button>
              ))}

              {/* TMD source links */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'พยากรณ์ประจำวัน', href: 'https://www.tmd.go.th/forecast/daily' },
                  { label: 'พยากรณ์ 7 วัน', href: 'https://www.tmd.go.th/forecast/sevenday' },
                  { label: 'เตือนภัยพายุ', href: 'https://www.tmd.go.th/warning-and-events/warning-storm' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0284c7',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      background: 'rgba(2,132,199,0.1)',
                      border: '1px solid rgba(2,132,199,0.22)',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🔗 {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* 7-day extended forecast from TMD web */}
            {!!(thaiGroups.webSevenday || []).length && sevFilter === 'all' && (
              <Card
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(3,105,161,0.18), rgba(8,19,38,0.9))'
                    : 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(255,255,255,0.96))',
                  border: isDark ? '1px solid rgba(125,211,252,0.18)' : '1px solid rgba(14,165,233,0.2)',
                }}
              >
                <SectionHeader
                  icon="📅"
                  title="พยากรณ์อากาศ 7 วัน (กรมอุตุนิยมวิทยา)"
                  desc="ข้อมูลโดยตรงจาก tmd.go.th/forecast/sevenday — อัปเดตทุกวัน"
                  accent="#0ea5e9"
                  count={(thaiGroups.webSevenday || []).length}
                />
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(thaiGroups.webSevenday || []).map((item, index) => (
                    <NewsItem key={`sevenday-${index}`} item={item} isDark={isDark} />
                  ))}
                </div>
              </Card>
            )}

            {/* Main 2-column grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              {THAI_SECTIONS.map((section) => {
                const raw = thaiGroups[section.key] || [];
                const items = applyFilter(raw);
                return (
                  <Card key={section.key}>
                    <SectionHeader
                      icon={section.icon}
                      title={section.title}
                      desc={section.desc}
                      accent={section.accent}
                      count={raw.length}
                    />
                    {!items.length ? (
                      <EmptyCard
                        title={sevFilter !== 'all' ? 'ไม่มีรายการในระดับที่เลือก' : `ยังไม่มี${section.title}`}
                        desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้"
                      />
                    ) : (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {items.slice(0, 6).map((item, index) => (
                          <NewsItem key={`${section.key}-${index}`} item={item} isDark={isDark} />
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GLOBAL TAB ────────────────────────────────────────────────────── */}
        {!loading && !error && data && activeTab === 'global' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: '16px',
            }}
          >
            {GLOBAL_SECTIONS.map((section) => {
              const items = globalGroups[section.key] || [];
              return (
                <Card key={section.key}>
                  <SectionHeader
                    icon={section.icon}
                    title={section.title}
                    desc={section.desc}
                    accent={section.accent}
                    count={items.length}
                  />
                  {!items.length ? (
                    <EmptyCard title={`ยังไม่มี${section.title}`} desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" />
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {items.slice(0, 6).map((item, index) => (
                        <NewsItem key={`${section.key}-${index}`} item={item} isDark={isDark} />
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── ENSO TAB ──────────────────────────────────────────────────────── */}
        {!loading && !error && data && activeTab === 'enso' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <Card
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(5,150,105,0.16), rgba(3,105,161,0.20))'
                  : 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(3,105,161,0.08))',
                border: isDark ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(5,150,105,0.18)',
              }}
            >
              <SectionHeader
                icon="🌊"
                title="ปรากฏการณ์เอลนีโญ่ & ลานีญ่า (ENSO)"
                desc="วิเคราะห์สถานะ ENSO ปัจจุบันจากข้อมูล NASA Climate และ WMO พร้อมผลกระทบต่อประเทศไทย"
                accent="#0ea5e9"
              />
              <EnsoPhaseCard phase={ensoPhase} />

              <div style={{ marginTop: '18px' }}>
                <div
                  style={{
                    color: 'var(--text-sub)',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '12px',
                  }}
                >
                  ปัจจัยที่ใช้ติดตาม ENSO
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gap: '10px',
                  }}
                >
                  {[
                    {
                      emoji: '🌡️',
                      title: 'อุณหภูมิผิวน้ำทะเล (SST)',
                      desc: 'วัดจากดาวเทียม NOAA บ่งบอกระยะเอลนีโญ่/ลานีญ่า',
                      source: 'NOAA / NASA',
                    },
                    {
                      emoji: '🌬️',
                      title: 'ลมสินค้าตะวันออก',
                      desc: 'ความแรงของลมแปซิฟิกกำหนดทิศทางกระแสน้ำอุ่น-เย็น',
                      source: 'WMO',
                    },
                    {
                      emoji: '☁️',
                      title: 'ปริมาณฝนในภูมิภาค',
                      desc: 'การกระจายฝนในเขตมรสุมเอเชียตะวันออกเฉียงใต้',
                      source: 'TMD / NASA',
                    },
                  ].map((card, i) => (
                    <div
                      key={i}
                      style={{
                        background: isDark ? 'rgba(8,19,38,0.5)' : 'rgba(255,255,255,0.65)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '14px',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>{card.emoji}</span>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: '0.83rem',
                          color: 'var(--text-main)',
                          marginBottom: '5px',
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--text-sub)',
                          lineHeight: 1.55,
                          marginBottom: '10px',
                        }}
                      >
                        {card.desc}
                      </div>
                      <span
                        style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          color: '#0284c7',
                          background: 'rgba(2,132,199,0.1)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                        }}
                      >
                        {card.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {!!(globalGroups.climate || []).length ? (
              <Card>
                <SectionHeader
                  icon="📰"
                  title="ข่าวภูมิอากาศล่าสุด"
                  desc="รายงานจาก NASA Climate & WMO — วิทยาศาสตร์ภูมิอากาศและการเปลี่ยนแปลงสภาพอากาศ"
                  accent="#059669"
                  count={(globalGroups.climate || []).length}
                />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '10px',
                  }}
                >
                  {(globalGroups.climate || []).map((item, index) => (
                    <NewsItem key={`climate-${index}`} item={item} isDark={isDark} />
                  ))}
                </div>
              </Card>
            ) : (
              <EmptyCard
                title="ยังไม่มีข่าวภูมิอากาศ"
                desc="โปรดลองรีเฟรชใหม่ หรือดูที่ climate.nasa.gov และ wmo.int โดยตรง"
              />
            )}
          </div>
        )}

        {/* ── RISK TAB ──────────────────────────────────────────────────────── */}
        {!loading && !error && data && activeTab === 'risk' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <RiskMeter risk={riskScore} />

            <Card>
              <SectionHeader
                icon="🇹🇭"
                title="ภัยคุกคามและความเสี่ยงต่อไทย"
                desc="รวมข่าวที่มีผลกระทบโดยตรงและทางอ้อมต่อประเทศไทยและภูมิภาค เรียงตามลำดับความเร่งด่วน"
                accent="#ef4444"
                count={riskItems.length}
              />

              {!riskItems.length ? (
                <EmptyCard
                  title="ไม่พบภัยคุกคามที่น่าเป็นห่วงในขณะนี้"
                  desc="สถานการณ์ทั้งในประเทศและภูมิภาคอยู่ในเกณฑ์ปกติ"
                />
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {riskItems.map((item, index) => (
                    <NewsItem
                      key={`risk-${index}`}
                      item={item}
                      showRank
                      rank={index + 1}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </Card>

            <SourceStatus sourceStatus={data.sourceStatus || []} />
          </div>
        )}
      </div>
    </div>
  );
}
