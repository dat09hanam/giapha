import { Playfair_Display, Water_Brush } from 'next/font/google';
import type { CSSProperties, ReactNode } from 'react';

import { canChiYear, surnameHan } from '@/lib/han-viet';

const titleFont = Playfair_Display({ weight: '900', subsets: ['vietnamese'], display: 'swap' });
const brushFont = Water_Brush({ weight: '400', subsets: ['vietnamese'], display: 'swap' });
const TITLE = `${titleFont.style.fontFamily}, "Times New Roman", Georgia, serif`;
const BRUSH = `${brushFont.style.fontFamily}, "Segoe Script", cursive`;
const HAN = '"Noto Serif TC", "Noto Serif SC", "Songti TC", "SimSun", "MingLiU", serif';
const SERIF = '"Times New Roman", Georgia, serif';

export type CoverTemplate = 'co-dien' | 'do-son' | 'trang-vang' | 'thu-phap';

export const COVER_TEMPLATES: { id: CoverTemplate; name: string; hint: string }[] = [
  { id: 'do-son', name: 'Đỏ son', hint: 'Nền đỏ, chữ vàng' },
  { id: 'trang-vang', name: 'Trắng viền vàng', hint: 'Tiết kiệm mực' },
  { id: 'co-dien', name: 'Giấy dó', hint: 'Nền vàng, chữ đỏ' },
  { id: 'thu-phap', name: 'Thư pháp', hint: 'Nền đỏ, chữ thư pháp' },
];

export type CoverText = {
  familyName: string;
  surname: string | null;
  place: string | null;
  printedYear: number;
};

type Palette = { paper: string; ink: string; title: string; ornament: string; watermark: string };

const PALETTES: Record<CoverTemplate, Palette> = {
  'do-son': {
    paper: '#c4161c',
    ink: '#ffe066',
    title: '#ffe14d',
    ornament: '#f5c542',
    watermark: '#f5c542',
  },
  'trang-vang': {
    paper: '#ffffff',
    ink: '#c4161c',
    title: '#e0121b',
    ornament: '#e2b23a',
    watermark: '#e2b23a',
  },
  'co-dien': {
    paper: '#f4e2ad',
    ink: '#a8141a',
    title: '#c4161c',
    ornament: '#b8862b',
    watermark: '#c99a3d',
  },
  'thu-phap': {
    paper: '#b5121b',
    ink: '#f6d36b',
    title: '#f9d75c',
    ornament: '#e8b54a',
    watermark: '#e8b54a',
  },
};

function CornerFret({
  color,
  size,
  transform,
}: {
  color: string;
  size: number;
  transform: string;
}) {
  return (
    <g transform={transform}>
      <g
        transform={`scale(${size / 48})`}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="square"
      >
        <path d="M0 48 V0 H48" />
        <path d="M7 48 V7 H48" />
        <path d="M14 40 V14 H40 V32 H22 V22 H32 V26" />
      </g>
    </g>
  );
}

function CoverFrame({
  width,
  height,
  inset,
  color,
  unit,
}: {
  width: number;
  height: number;
  inset: number;
  color: string;
  unit: number;
}) {
  const corner = 46 * unit;
  const gap = 7 * unit;
  return (
    <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
      <rect
        x={inset}
        y={inset}
        width={width - 2 * inset}
        height={height - 2 * inset}
        fill="none"
        stroke={color}
        strokeWidth={3 * unit}
      />
      <rect
        x={inset + gap}
        y={inset + gap}
        width={width - 2 * (inset + gap)}
        height={height - 2 * (inset + gap)}
        fill="none"
        stroke={color}
        strokeWidth={1.2 * unit}
      />
      <CornerFret
        color={color}
        size={corner}
        transform={`translate(${inset + gap * 2} ${inset + gap * 2})`}
      />
      <CornerFret
        color={color}
        size={corner}
        transform={`translate(${width - inset - gap * 2} ${inset + gap * 2}) scale(-1 1)`}
      />
      <CornerFret
        color={color}
        size={corner}
        transform={`translate(${inset + gap * 2} ${height - inset - gap * 2}) scale(1 -1)`}
      />
      <CornerFret
        color={color}
        size={corner}
        transform={`translate(${width - inset - gap * 2} ${height - inset - gap * 2}) scale(-1 -1)`}
      />
    </svg>
  );
}

function DrumMedallion({
  size,
  color,
  opacity,
  style,
}: {
  size: number;
  color: string;
  opacity: number;
  style?: CSSProperties;
}) {
  const star = Array.from({ length: 28 }, (_, index) => {
    const angle = (index * Math.PI) / 14 - Math.PI / 2;
    const radius = index % 2 === 0 ? 22 : 7;
    return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`;
  }).join(' ');
  const around = (count: number, draw: (angle: number, index: number) => ReactNode) =>
    Array.from({ length: count }, (_, index) => draw((index * 360) / count, index));
  return (
    <svg
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      className="absolute"
      style={{ opacity, ...style }}
      aria-hidden="true"
    >
      <g fill="none" stroke={color} strokeWidth={0.9}>
        <polygon points={star} fill={color} stroke="none" />
        {[26, 30, 46, 49, 66, 69, 84, 87, 98].map((radius) => (
          <circle key={radius} r={radius} />
        ))}
        {around(60, (angle) => (
          <line key={angle} x1={31} x2={45} transform={`rotate(${angle})`} />
        ))}
        {around(40, (angle) => (
          <circle key={angle} cx={57.5} r={3.2} transform={`rotate(${angle})`} />
        ))}
        {around(36, (angle) => (
          <path key={angle} d="M71 -3 L80 0 L71 3" transform={`rotate(${angle})`} />
        ))}
        {around(72, (angle) => (
          <line key={angle} x1={88} x2={97} transform={`rotate(${angle})`} />
        ))}
      </g>
    </svg>
  );
}

function Flourish({ width, color }: { width: number; color: string }) {
  return (
    <svg viewBox="-100 -10 200 20" width={width} height={width / 10} aria-hidden="true">
      <g fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round">
        <path d="M-96 0 H-22 M22 0 H96" />
        <path d="M-22 0 C-16 -8 -8 -8 -8 0 C-8 4 -13 4 -13 0" />
        <path d="M22 0 C16 -8 8 -8 8 0 C8 4 13 4 13 0" />
      </g>
      <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill={color} />
    </svg>
  );
}

function upper(text: string): string {
  return text.toLocaleUpperCase('vi');
}

export function BookCoverArt({
  template,
  text,
  width,
  height,
}: {
  template: CoverTemplate;
  text: CoverText;
  width: number;
  height: number;
}) {
  const unit = width / 794;
  const palette = PALETTES[template];
  const inset = 26 * unit;
  const han = (text.surname && surnameHan(text.surname)) ?? null;
  const clan = text.surname ? `Dòng tộc họ ${text.surname}` : text.familyName;
  const year = `${canChiYear(text.printedYear)} · ${text.printedYear}`;
  const px = (value: number): number => value * unit;

  const sheet: CSSProperties = {
    width,
    height,
    background:
      template === 'co-dien'
        ? `radial-gradient(ellipse at 50% 40%, #fbf0cc 0%, ${palette.paper} 60%, #e6cc86 100%)`
        : palette.paper,
    color: palette.ink,
  };

  if (template === 'thu-phap') {
    return (
      <div className="relative overflow-hidden text-center" style={sheet}>
        <DrumMedallion
          size={px(620)}
          color={palette.watermark}
          opacity={0.14}
          style={{ left: px(-180), top: px(-200) }}
        />
        <DrumMedallion
          size={px(520)}
          color={palette.watermark}
          opacity={0.12}
          style={{ right: px(-160), bottom: px(-120) }}
        />
        <CoverFrame
          width={width}
          height={height}
          inset={inset}
          color={palette.ornament}
          unit={unit}
        />
        <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: px(110) }}>
          <p style={{ fontFamily: SERIF, fontSize: px(15), letterSpacing: px(4), fontWeight: 700 }}>
            {upper(text.familyName)}
          </p>
          <p
            style={{
              fontFamily: BRUSH,
              fontSize: px(150),
              lineHeight: 1.05,
              color: palette.title,
              marginTop: px(40),
            }}
          >
            Gia Phả
          </p>
          <p
            style={{
              fontFamily: TITLE,
              fontSize: px(64),
              fontWeight: 900,
              color: palette.title,
              letterSpacing: px(3),
              marginTop: px(24),
            }}
          >
            DÒNG TỘC
          </p>
          <p
            style={{
              fontFamily: HAN,
              fontSize: px(110),
              lineHeight: 1.2,
              marginTop: px(40),
              color: palette.title,
            }}
          >
            家譜
          </p>
          <Flourish width={px(320)} color={palette.ornament} />
        </div>
        <div className="absolute inset-x-0" style={{ bottom: px(80), fontFamily: SERIF }}>
          {text.place ? (
            <p style={{ fontSize: px(17), fontWeight: 700 }}>{upper(text.place)}</p>
          ) : null}
          <p style={{ fontSize: px(15), fontWeight: 700, marginTop: px(8) }}>{upper(year)}</p>
        </div>
      </div>
    );
  }

  if (template === 'co-dien') {
    return (
      <div className="relative overflow-hidden text-center" style={sheet}>
        <DrumMedallion
          size={px(900)}
          color={palette.watermark}
          opacity={0.13}
          style={{ left: px(-53), top: px(150) }}
        />
        <CoverFrame
          width={width}
          height={height}
          inset={inset}
          color={palette.ornament}
          unit={unit}
        />
        <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: px(120) }}>
          <p style={{ fontFamily: SERIF, fontSize: px(17), fontWeight: 700, letterSpacing: px(4) }}>
            {upper(clan)}
          </p>
          <p
            style={{
              fontFamily: TITLE,
              fontSize: px(118),
              fontWeight: 900,
              lineHeight: 1.05,
              color: palette.title,
              marginTop: px(70),
            }}
          >
            GIA PHẢ
          </p>
          <Flourish width={px(360)} color={palette.ink} />
          {text.surname && text.familyName !== `Họ ${text.surname}` ? (
            <p style={{ fontFamily: SERIF, fontSize: px(26), fontWeight: 700, marginTop: px(16) }}>
              {text.familyName}
            </p>
          ) : null}
        </div>
        <DrumMedallion
          size={px(300)}
          color={palette.ornament}
          opacity={0.9}
          style={{ left: px(247), top: px(620) }}
        />
        <div className="absolute inset-x-0" style={{ bottom: px(70), fontFamily: SERIF }}>
          {text.place ? (
            <p style={{ fontSize: px(16), fontWeight: 700 }}>{upper(text.place)}</p>
          ) : null}
          <p style={{ fontSize: px(14), fontWeight: 700, marginTop: px(6) }}>{upper(year)}</p>
        </div>
      </div>
    );
  }

  const red = template === 'do-son';
  return (
    <div className="relative overflow-hidden text-center" style={sheet}>
      {red ? (
        <DrumMedallion
          size={px(700)}
          color={palette.watermark}
          opacity={0.16}
          style={{ left: px(47), top: px(230) }}
        />
      ) : null}
      <CoverFrame
        width={width}
        height={height}
        inset={inset}
        color={palette.ornament}
        unit={unit}
      />
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: px(95) }}>
        <p
          style={{
            fontFamily: SERIF,
            fontSize: px(22),
            fontWeight: 700,
            letterSpacing: px(2),
            color: palette.ink,
          }}
        >
          {text.surname ? 'DÒNG TỘC HỌ' : upper(text.familyName)}
        </p>
        {text.surname ? (
          <div className="flex items-center" style={{ gap: px(20), marginTop: px(18) }}>
            <span style={{ width: px(150), height: px(1.5), background: palette.ornament }} />
            <p
              style={{
                fontFamily: BRUSH,
                fontSize: px(64),
                lineHeight: 1.3,
                color: red ? palette.title : palette.ink,
              }}
            >
              {upper(text.surname)}
            </p>
            <span style={{ width: px(150), height: px(1.5), background: palette.ornament }} />
          </div>
        ) : null}
        <p
          style={{
            fontFamily: TITLE,
            fontSize: px(104),
            fontWeight: 900,
            lineHeight: 1.1,
            color: palette.title,
            marginTop: px(150),
          }}
        >
          GIA PHẢ
        </p>
        <p
          style={{
            fontFamily: HAN,
            fontSize: px(84),
            lineHeight: 1.25,
            marginTop: px(90),
            writingMode: 'vertical-rl',
            color: red ? palette.title : palette.ink,
          }}
        >
          {han ? `${han}族` : '家譜'}
        </p>
        {text.place ? (
          <p style={{ fontFamily: SERIF, fontSize: px(17), marginTop: px(70), color: palette.ink }}>
            {upper(text.place)}
          </p>
        ) : null}
      </div>
      <p
        className="absolute inset-x-0"
        style={{
          bottom: px(70),
          fontFamily: SERIF,
          fontSize: px(16),
          fontWeight: 700,
          color: palette.ink,
        }}
      >
        {upper(year)}
      </p>
    </div>
  );
}
