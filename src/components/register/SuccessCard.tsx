import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';
import { buildWaLink } from '../../lib/wa';

interface SuccessCardProps {
  eventSlug: string;
}

interface RegistrationData {
  reg_code: string;
  ticket_token: string;
  status: 'pending' | 'waitlist' | 'paid';
  payment_deadline?: string;
  payment_accounts?: { bank_name: string; account_number: string; account_name: string }[];
  confirmator_wa?: string;
  event_title?: string;
  price_per_couple?: number;
  success_message?: string;
  wa_to_admin_template?: string;
  husband_name?: string;
  wife_name?: string;
  whatsapp?: string;
}

export function SuccessCard({ eventSlug }: SuccessCardProps) {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`hcc_registration_${eventSlug}`);
    if (!raw) {
      window.location.href = `/event/${eventSlug}`;
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setData(parsed);
    } catch {
      window.location.href = `/event/${eventSlug}`;
    }
  }, [eventSlug]);

  if (!data) {
    return (
      <div className="sc-loading">
        <Icon name="sync" size={28} className="sc-spin" aria-hidden />
        <span>Memuat data pendaftaran Anda...</span>
      </div>
    );
  }

  const isWaitlist = data.status === 'waitlist';

  // Format currency
  const formattedPrice = data.price_per_couple
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.price_per_couple)
    : 'Rp 0';

  // Format deadline WIB
  const formatDeadline = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d) + ' WIB';
    } catch {
      return isoString;
    }
  };

  const copyText = async (text: string, type: 'code' | 'acc', accNum?: string) => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedAcc(accNum || text);
      setTimeout(() => setCopiedAcc(null), 2000);
    }
  };

  // Build WA Link
  const template = data.wa_to_admin_template ||
    'Halo Admin HCC, saya ingin konfirmasi pembayaran untuk {event}.\nNama: {husband} & {wife}\nKode: {reg_code}';
  const confirmatorNumber = data.confirmator_wa || '628123456789';
  const waUrl = buildWaLink(confirmatorNumber, template, {
    event: data.event_title || 'Happy Couple Class',
    husband: data.husband_name || '',
    wife: data.wife_name || '',
    reg_code: data.reg_code || '',
  });

  return (
    <div className="sc-container">
      {/* Success Badge & Header */}
      <div className="sc-header-card">
        <div className="sc-icon-circle">
          <Icon name={isWaitlist ? 'schedule' : 'check_circle'} size={44} aria-hidden />
        </div>
        <h1 className="sc-title">
          {isWaitlist ? 'Pendaftaran Masuk Antrean (Waitlist)' : 'Pendaftaran Berhasil Direkam!'}
        </h1>
        <p className="sc-desc">
          {isWaitlist
            ? 'Kuota kelas saat ini sedang penuh. Anda berada di daftar tunggu prioritas. Admin kami akan menghubungi Anda jika ada kuota yang tersedia.'
            : (data.success_message ||
              'Selamat, pendaftaran Anda sudah kami rekam. Silakan lakukan pembayaran transfer lalu konfirmasi melalui tombol WhatsApp di bawah.')}
        </p>
      </div>

      {/* Registration Details Card */}
      <div className="sc-details-card">
        <h3 className="sc-section-title">
          <Icon name="receipt_long" size={20} aria-hidden />
          Ringkasan Pendaftaran
        </h3>

        <div className="sc-details-grid">
          <div className="sc-detail-item">
            <span className="sc-detail-lbl">Kode Pendaftaran</span>
            <div className="sc-code-row">
              <span className="sc-code-text">{data.reg_code}</span>
              <button
                type="button"
                className="sc-copy-btn"
                onClick={() => copyText(data.reg_code, 'code')}
                title="Salin kode"
              >
                <Icon name={copiedCode ? 'check' : 'content_copy'} size={16} aria-hidden />
                {copiedCode ? 'Disalin' : 'Salin'}
              </button>
            </div>
          </div>

          <div className="sc-detail-item">
            <span className="sc-detail-lbl">Nama Pasangan</span>
            <span className="sc-detail-val">
              <strong>{data.husband_name}</strong> &amp; <strong>{data.wife_name}</strong>
            </span>
          </div>

          <div className="sc-detail-item">
            <span className="sc-detail-lbl">Kelas yang Diikuti</span>
            <span className="sc-detail-val">{data.event_title}</span>
          </div>

          {!isWaitlist && (
            <>
              <div className="sc-detail-item">
                <span className="sc-detail-lbl">Nominal yang Harus Dibayar</span>
                <span className="sc-price-val">{formattedPrice}</span>
              </div>

              {data.payment_deadline && (
                <div className="sc-detail-item col-span-2">
                  <span className="sc-detail-lbl">Batas Waktu Pembayaran</span>
                  <div className="sc-deadline-badge">
                    <Icon name="schedule" size={16} aria-hidden />
                    <span>Sebelum {formatDeadline(data.payment_deadline)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Accounts Card (Only if NOT waitlist) */}
      {!isWaitlist && data.payment_accounts && data.payment_accounts.length > 0 && (
        <div className="sc-bank-card">
          <h3 className="sc-section-title">
            <Icon name="account_balance" size={20} aria-hidden />
            Rekening Tujuan Transfer
          </h3>
          <p className="sc-bank-desc">
            Silakan transfer tepat sebesar <strong>{formattedPrice}</strong> ke salah satu rekening resmi di bawah:
          </p>

          <div className="sc-accounts-list">
            {data.payment_accounts.map((acc) => {
              const isCopied = copiedAcc === acc.account_number;
              return (
                <div key={acc.account_number} className="sc-acc-box">
                  <div className="sc-acc-info">
                    <span className="sc-bank-name">{acc.bank_name}</span>
                    <span className="sc-acc-num">{acc.account_number}</span>
                    <span className="sc-acc-name">a.n {acc.account_name}</span>
                  </div>
                  <button
                    type="button"
                    className="sc-btn-copy-acc"
                    onClick={() => copyText(acc.account_number, 'acc', acc.account_number)}
                  >
                    <Icon name={isCopied ? 'check' : 'content_copy'} size={18} aria-hidden />
                    {isCopied ? 'Disalin!' : 'Salin Nomor'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WhatsApp CTA */}
      {!isWaitlist && (
        <div className="sc-cta-card">
          <div className="sc-cta-text">
            <h4>Langkah Terakhir: Konfirmasi Transfer</h4>
            <p>Setelah melakukan transfer, klik tombol di bawah untuk mengirim bukti bayar ke admin via WhatsApp.</p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-wa-btn"
          >
            <Icon name="chat" size={22} aria-hidden />
            Konfirmasi Pembayaran via WhatsApp
          </a>
        </div>
      )}

      <div className="sc-back-wrap">
        <a href={`/event/${eventSlug}`} className="sc-back-link">
          <Icon name="arrow_back" size={16} aria-hidden />
          Kembali ke Halaman Event
        </a>
      </div>

      <style>{`
        .sc-container {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sc-loading {
          text-align: center;
          padding: 80px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--ink-600);
        }

        .sc-spin {
          animation: spin 1s linear infinite;
          color: var(--pink-500);
        }

        .sc-header-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 36px 28px;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }

        .sc-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--pink-50);
          color: var(--pink-500);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .sc-title {
          font-size: 22px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 10px 0;
          letter-spacing: -0.01em;
        }

        .sc-desc {
          font-size: 14px;
          color: var(--ink-600);
          margin: 0;
          line-height: 1.65;
          max-width: 520px;
          margin: 0 auto;
        }

        .sc-details-card, .sc-bank-card, .sc-cta-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 24px 28px;
          box-shadow: var(--shadow-sm);
        }

        .sc-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
        }

        .sc-section-title .material-symbols-outlined {
          color: var(--pink-500);
        }

        .sc-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .col-span-2 { grid-column: span 2; }

        .sc-detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sc-detail-lbl {
          font-size: 12px;
          color: var(--ink-600);
          font-weight: 500;
        }

        .sc-detail-val {
          font-size: 14px;
          color: var(--ink-900);
        }

        .sc-code-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sc-code-text {
          font-family: monospace;
          font-size: 16px;
          font-weight: 700;
          color: var(--pink-600);
          background: var(--pink-50);
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .sc-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 12px;
          color: var(--ink-600);
          cursor: pointer;
          transition: all 150ms ease;
        }

        .sc-copy-btn:hover {
          background: var(--pink-50);
          color: var(--pink-500);
        }

        .sc-price-val {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink-900);
        }

        .sc-deadline-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--warn-bg);
          color: var(--warn);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          align-self: flex-start;
        }

        /* Bank Accounts */
        .sc-bank-desc {
          font-size: 13px;
          color: var(--ink-600);
          margin: 0 0 16px 0;
        }

        .sc-accounts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sc-acc-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--pink-50);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          gap: 16px;
        }

        .sc-acc-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sc-bank-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--pink-600);
          text-transform: uppercase;
        }

        .sc-acc-num {
          font-family: monospace;
          font-size: 18px;
          font-weight: 700;
          color: var(--ink-900);
          letter-spacing: 1px;
        }

        .sc-acc-name {
          font-size: 12px;
          color: var(--ink-600);
        }

        .sc-btn-copy-acc {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--white);
          border: 1px solid var(--pink-300);
          color: var(--pink-600);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
          flex-shrink: 0;
        }

        .sc-btn-copy-acc:hover {
          background: var(--pink-500);
          color: white;
          border-color: var(--pink-500);
        }

        /* WA CTA */
        .sc-cta-card {
          border: 2px solid var(--pink-200);
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }

        .sc-cta-text h4 {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 4px 0;
        }

        .sc-cta-text p {
          font-size: 13px;
          color: var(--ink-600);
          margin: 0;
        }

        .sc-wa-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #25D366;
          color: white;
          text-decoration: none;
          height: 50px;
          border-radius: var(--radius-md);
          font-size: 15px;
          font-weight: 600;
          transition: all 150ms ease;
          box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
        }

        .sc-wa-btn:hover {
          background: #20BA5A;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);
        }

        .sc-back-wrap {
          text-align: center;
          padding: 8px 0;
        }

        .sc-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--ink-600);
          text-decoration: none;
        }

        .sc-back-link:hover {
          color: var(--pink-500);
        }

        @media (max-width: 640px) {
          .sc-header-card, .sc-details-card, .sc-bank-card, .sc-cta-card {
            padding: 24px 18px;
          }
          .sc-details-grid { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
          .sc-acc-box { flex-direction: column; align-items: flex-start; gap: 12px; }
          .sc-btn-copy-acc { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
