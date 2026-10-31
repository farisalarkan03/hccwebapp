import React, { useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { formatDateWIB } from '../../lib/format';

export interface CheckinResult {
  result: 'ok' | 'already' | 'unpaid' | 'wrong_event' | 'invalid';
  husband_name?: string;
  wife_name?: string;
  reg_code?: string;
  checkin_at?: string;
}

interface ResultOverlayProps {
  data: CheckinResult;
  onDismiss: () => void;
}

export function ResultOverlay({ data, onDismiss }: ResultOverlayProps) {
  useEffect(() => {
    // Sound & Vibration
    try {
      if ('vibrate' in navigator) {
        if (data.result === 'ok') {
          navigator.vibrate([100, 50, 100]);
        } else if (data.result === 'already') {
          navigator.vibrate([200, 100, 200]);
        } else {
          navigator.vibrate([400]);
        }
      }

      // Audio synthesized bip
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (data.result === 'ok') {
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
          osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        } else {
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      }
    } catch (e) {
      // Audio or vibration unavailable/blocked
    }

    // Auto dismiss after 2 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 2200);

    return () => clearTimeout(timer);
  }, [data, onDismiss]);

  const config = {
    ok: {
      bg: '#2E9E6B',
      icon: 'check_circle',
      title: 'TERDAFTAR',
      subtitle: 'Selamat Datang!',
    },
    already: {
      bg: '#C98A12',
      icon: 'warning',
      title: 'SUDAH CHECK-IN',
      subtitle: data.checkin_at ? `Tercatat pada ${formatDateWIB(data.checkin_at, { showTime: true })}` : 'Tiket ini telah digunakan sebelumnya.',
    },
    unpaid: {
      bg: '#D64545',
      icon: 'error',
      title: 'BELUM LUNAS',
      subtitle: 'Pembayaran belum dikonfirmasi. Arahkan peserta ke meja admin.',
    },
    wrong_event: {
      bg: '#D64545',
      icon: 'cancel',
      title: 'TIKET EVENT LAIN',
      subtitle: 'Tiket ini terdaftar untuk jadwal atau batch kelas yang berbeda.',
    },
    invalid: {
      bg: '#D64545',
      icon: 'search_off',
      title: 'QR TIDAK DIKENALI',
      subtitle: 'Kode tiket tidak ditemukan dalam database sistem.',
    },
  }[data.result];

  return (
    <div
      className="ro-overlay"
      style={{ backgroundColor: config.bg }}
      onClick={onDismiss}
      role="alert"
      aria-live="assertive"
    >
      <div className="ro-content">
        <div className="ro-icon-wrap">
          <Icon name={config.icon} size={72} aria-hidden />
        </div>

        <h2 className="ro-title">{config.title}</h2>

        {data.husband_name && (
          <div className="ro-couple">
            <span className="ro-names">{data.husband_name} &amp; {data.wife_name}</span>
            {data.reg_code && <span className="ro-reg-code">{data.reg_code}</span>}
          </div>
        )}

        <p className="ro-subtitle">{config.subtitle}</p>

        <span className="ro-tap-hint">Ketuk layar untuk menutup segera</span>
      </div>

      <style>{`
        .ro-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          padding: 24px;
          cursor: pointer;
          animation: popIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes popIn {
          from {
            transform: scale(0.92);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .ro-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 440px;
          gap: 12px;
        }

        .ro-icon-wrap {
          margin-bottom: 8px;
        }

        .ro-title {
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin: 0;
          line-height: 1.1;
        }

        .ro-couple {
          background: rgba(0, 0, 0, 0.2);
          border-radius: var(--radius-md);
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 8px 0;
          width: 100%;
        }

        .ro-names {
          font-size: 19px;
          font-weight: 700;
        }

        .ro-reg-code {
          font-family: monospace;
          font-size: 14px;
          opacity: 0.9;
        }

        .ro-subtitle {
          font-size: 16px;
          margin: 0;
          opacity: 0.95;
          line-height: 1.5;
        }

        .ro-tap-hint {
          margin-top: 24px;
          font-size: 12px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
}
