import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { Icon } from '../ui/Icon';
import { formatDateWIB } from '../../lib/format';
import { buildWaLink } from '../../lib/wa';

interface TicketData {
  id: string;
  reg_code: string;
  ticket_token: string;
  husband_name: string;
  wife_name: string;
  whatsapp: string;
  payment_status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'waitlist';
  checkin_at: string | null;
  confirmator_wa?: string;
  events: {
    id: string;
    title: string;
    slug: string;
    date_start: string;
    date_end: string | null;
    location: string;
    location_map_url: string | null;
    price_per_couple: number;
    flyer_url: string | null;
  };
}

export function TicketCard({ ticket }: { ticket: TicketData }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloadingPng, setDownloadingPng] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);
  const isPaid = ticket.payment_status === 'paid';
  const isCheckedIn = Boolean(ticket.checkin_at);

  // Generate QR Code on mount if paid
  useEffect(() => {
    if (isPaid && ticket.ticket_token) {
      const qrContent = ticket.ticket_token;
      QRCode.toDataURL(qrContent, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1F1A1D',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [isPaid, ticket.ticket_token]);

  // Download Ticket as PNG
  const handleDownloadPng = async () => {
    if (!ticketRef.current) return;
    setDownloadingPng(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Tiket-HCC-${ticket.reg_code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Download PNG error:', e);
      alert('Gagal mengunduh tiket PNG.');
    } finally {
      setDownloadingPng(false);
    }
  };


  // Download iCalendar .ics file
  const handleDownloadIcs = () => {
    const ev = ticket.events;
    const formatIcsDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatIcsDate(ev.date_start);
    const end = ev.date_end ? formatIcsDate(ev.date_end) : start;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Happy Couple Class//Tiket Digital//ID',
      'BEGIN:VEVENT',
      `UID:${ticket.reg_code}@happycoupleclass.com`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:Tiket Happy Couple Class untuk ${ticket.husband_name} & ${ticket.wife_name}. Kode: ${ticket.reg_code}`,
      `LOCATION:${ev.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Jadwal-HCC-${ticket.reg_code}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // WA link if unpaid
  const confirmatorNumber = ticket.confirmator_wa || '628123456789';
  const unpaidWaUrl = buildWaLink(
    confirmatorNumber,
    'Halo Admin HCC, saya ingin konfirmasi status pembayaran tiket {event}.\nNama: {husband} & {wife}\nKode: {reg_code}',
    {
      event: ticket.events.title,
      husband: ticket.husband_name,
      wife: ticket.wife_name,
      reg_code: ticket.reg_code,
    }
  );

  return (
    <div className="tc-wrapper">
      {/* If Unpaid Alert */}
      {!isPaid && (
        <div className="tc-unpaid-box">
          <Icon name="warning" size={32} className="tc-unpaid-icon" aria-hidden />
          <div className="tc-unpaid-content">
            <h3>Pembayaran Belum Dikonfirmasi</h3>
            <p>
              Tiket barcode QR hanya akan aktif setelah pembayaran diverifikasi oleh admin. Jika Anda sudah melakukan transfer, silakan konfirmasi melalui WhatsApp di bawah.
            </p>
            <a href={unpaidWaUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              <Icon name="chat" size={18} aria-hidden />
              Konfirmasi ke Admin WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* TICKET CARD CONTAINER */}
      <div className="tc-card" ref={ticketRef}>
        {/* Ticket Header */}
        <div className="tc-header">
          <div className="tc-logo-row">
            <div className="tc-brand-wrap">
              <img src="/img/logo.png" alt="" className="tc-logo" width="30" height="30" />
              <div className="tc-brand-text">
                <span className="tc-brand-title">Happy Couple</span>
                <span className="tc-brand-sub">Class</span>
              </div>
            </div>
            <span className="tc-badge-pass">E-TIKET RESMI</span>
          </div>
          <h2 className="tc-event-title">{ticket.events.title}</h2>
          <span className="tc-reg-code-label">Kode Tiket: <strong>{ticket.reg_code}</strong></span>
        </div>

        {/* Perforated Divider */}
        <div className="tc-perforated">
          <div className="tc-hole tc-hole-left"></div>
          <div className="tc-dashed-line"></div>
          <div className="tc-hole tc-hole-right"></div>
        </div>

        {/* Ticket Body */}
        <div className="tc-body">
          {/* Couple Name */}
          <div className="tc-couple-box">
            <span className="tc-lbl">Pasangan Terdaftar (1 Couple)</span>
            <div className="tc-names">
              <span className="tc-husband">{ticket.husband_name}</span>
              <span className="tc-ampersand">&amp;</span>
              <span className="tc-wife">{ticket.wife_name}</span>
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="tc-grid">
            <div className="tc-info-item">
              <span className="tc-lbl">Tanggal &amp; Waktu</span>
              <span className="tc-val">{formatDateWIB(ticket.events.date_start, { showTime: true })}</span>
            </div>

            <div className="tc-info-item">
              <span className="tc-lbl">Lokasi Acara</span>
              <span className="tc-val">{ticket.events.location}</span>
            </div>
          </div>

          {/* QR Code Section (Only if Paid) */}
          {isPaid && (
            <div className="tc-qr-section">
              <div className="tc-qr-box">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Code Tiket ${ticket.reg_code}`} className="tc-qr-img" />
                ) : (
                  <div className="tc-qr-skeleton">Memuat QR...</div>
                )}
              </div>
              <span className="tc-qr-note">
                Tunjukkan QR Code ini kepada petugas pendata saat tiba di lokasi acara.
              </span>

              {/* Checkin Status Badge */}
              {isCheckedIn && (
                <div className="tc-checkin-badge">
                  <Icon name="check_circle" size={18} aria-hidden />
                  <span>Sudah Check-in ({formatDateWIB(ticket.checkin_at!, { showTime: true })})</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="tc-footer">
          <span>Happy Couple Class • happycoupleclass.com</span>
        </div>
      </div>

      {/* Action Buttons for download (Only if Paid) */}
      {isPaid && (
        <div className="tc-download-bar">
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={handleDownloadPng}
            disabled={downloadingPng}
          >
            <Icon name="download" size={18} aria-hidden />
            {downloadingPng ? 'Mengunduh...' : 'Unduh Tiket PNG'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={handleDownloadIcs}
          >
            <Icon name="calendar_month" size={18} aria-hidden />
            Tambah ke Kalender
          </button>
        </div>
      )}

      <style>{`
        .tc-wrapper {
          max-width: 500px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tc-unpaid-box {
          background: var(--warn-bg);
          border: 1px solid rgba(201, 138, 18, 0.3);
          border-radius: var(--radius-lg);
          padding: 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .tc-unpaid-icon {
          color: var(--warn);
          flex-shrink: 0;
        }

        .tc-unpaid-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 6px 0;
        }

        .tc-unpaid-content p {
          font-size: 13px;
          color: var(--ink-600);
          margin: 0 0 16px 0;
          line-height: 1.6;
        }

        /* Ticket Card */
        .tc-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          overflow: hidden;
          position: relative;
        }

        .tc-header {
          padding: 28px 28px 20px 28px;
          background: var(--white);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tc-logo-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tc-brand-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tc-logo {
          height: 30px;
          width: 30px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .tc-brand-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
          text-align: left;
        }

        .tc-brand-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--ink-900);
          letter-spacing: -0.01em;
        }

        .tc-brand-sub {
          font-size: 9px;
          font-weight: 600;
          color: var(--pink-600);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .tc-badge-pass {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--pink-600);
          background: var(--pink-50);
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid var(--pink-200);
        }

        .tc-event-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 4px 0 0 0;
          line-height: 1.35;
        }

        .tc-reg-code-label {
          font-size: 13px;
          color: var(--ink-600);
        }
        .tc-reg-code-label strong {
          color: var(--pink-600);
          font-family: monospace;
          font-size: 15px;
        }

        /* Perforated divider */
        .tc-perforated {
          position: relative;
          height: 24px;
          display: flex;
          align-items: center;
          background: var(--white);
        }

        .tc-dashed-line {
          width: 100%;
          border-bottom: 2px dashed var(--line);
        }

        .tc-hole {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--pink-50);
          border: 1px solid var(--line);
          z-index: 2;
        }

        .tc-hole-left {
          left: -10px;
          border-left: none;
        }

        .tc-hole-right {
          right: -10px;
          border-right: none;
        }

        /* Ticket Body */
        .tc-body {
          padding: 20px 28px 28px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tc-couple-box {
          background: var(--pink-50);
          border: 1px solid var(--pink-100);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tc-lbl {
          font-size: 12px;
          color: var(--ink-600);
          font-weight: 500;
        }

        .tc-names {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
          font-weight: 700;
          color: var(--ink-900);
          flex-wrap: wrap;
        }

        .tc-ampersand {
          color: var(--pink-500);
        }

        .tc-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .tc-info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tc-val {
          font-size: 14px;
          color: var(--ink-900);
          font-weight: 500;
        }

        /* QR */
        .tc-qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .tc-qr-box {
          padding: 12px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }

        .tc-qr-img {
          width: 190px;
          height: 190px;
          display: block;
        }

        .tc-qr-skeleton {
          width: 190px;
          height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-400);
          font-size: 13px;
        }

        .tc-qr-note {
          font-size: 12px;
          color: var(--ink-600);
          text-align: center;
          max-width: 320px;
        }

        .tc-checkin-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--ok-bg);
          color: var(--ok);
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          margin-top: 6px;
        }

        .tc-footer {
          padding: 12px 28px;
          background: #faf8f9;
          border-top: 1px solid var(--line);
          text-align: center;
          font-size: 11px;
          color: var(--ink-400);
        }

        /* Download bar */
        .tc-download-bar {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tc-download-bar .btn {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
