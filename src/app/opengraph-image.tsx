import { ImageResponse } from 'next/og';
export const alt = 'Better — Seu atendimento. Sua agenda. Uma boa química.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#111e30',
        color: '#f6f7f0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '70px 90px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontSize: 44, fontWeight: 800, display: 'flex' }}>
        better<span style={{ color: '#f0d444' }}>.</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        <span>Seu atendimento. Sua agenda.</span>
        <span style={{ color: '#f0d444' }}>Uma boa química.</span>
      </div>
      <div style={{ fontSize: 24, color: '#b9c3ce' }}>
        Atendimento com IA e agendamentos no WhatsApp.
      </div>
    </div>,
    size,
  );
}
