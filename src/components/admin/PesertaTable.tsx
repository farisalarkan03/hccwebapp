import React, { useState, useMemo } from 'react';
import { Icon } from '../ui/Icon';
import { buildWaLink } from '../../lib/wa';

export interface ParticipantItem {
  id: string;
  reg_code: string;
  ticket_token: string;
  husband_name: string;
  wife_name: string;
  whatsapp: string;
  email: string | null;
  payment_status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'waitlist';
  payment_confirmed_at: string | null;
  payment_confirmed_by: string | null;
  payment_note: string | null;
  payment_proof_url: string | null;
  created_at: string;
  checkin_at: string | null;
  checkin_by: string | null;
  wa_sent_at: string | null;
  answers: Record<string, any>;
  form_snapshot: Record<string, string>;
  confirmed_by_admin?: { name: string } | null;
}

interface PesertaTableProps {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  quota: number | null;
  initialParticipants: ParticipantItem[];
  defaultWaToUserTemplate: string;
}

export function PesertaTable({
  eventId,
  eventTitle,
  eventSlug,
  quota,
  initialParticipants,
  defaultWaToUserTemplate,
}: PesertaTableProps) {
  const [participants, setParticipants] = useState<ParticipantItem[]>(initialParticipants);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ParticipantItem | null>(null);

  // Confirm payment modal state
  const [confirmingItem, setConfirmingItem] = useState<ParticipantItem | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  // Delete participant modal state
  const [deletingItem, setDeletingItem] = useState<ParticipantItem | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Status numbers
  const total = participants.length;
  const pending = participants.filter((p) => p.payment_status === 'pending').length;
  const paid = participants.filter((p) => p.payment_status === 'paid').length;
  const attended = participants.filter((p) => p.checkin_at !== null).length;
  const waitlist = participants.filter((p) => p.payment_status === 'waitlist').length;
  const remainingQuota = quota ? Math.max(0, quota - (total - participants.filter((p) => ['expired', 'cancelled'].includes(p.payment_status)).length)) : null;

  // Filtered list
  const filtered = useMemo(() => {
    return participants.filter((p) => {
      // Search
      const q = search.toLowerCase().trim();
      if (q) {
        const matchCode = p.reg_code.toLowerCase().includes(q);
        const matchHusband = p.husband_name.toLowerCase().includes(q);
        const matchWife = p.wife_name.toLowerCase().includes(q);
        const matchWa = p.whatsapp.includes(q);
        if (!matchCode && !matchHusband && !matchWife && !matchWa) return false;
      }

      // Payment filter
      if (paymentFilter !== 'all' && p.payment_status !== paymentFilter) {
        return false;
      }

      // Attendance filter
      if (attendanceFilter === 'hadir' && !p.checkin_at) return false;
      if (attendanceFilter === 'belum' && p.checkin_at) return false;

      return true;
    });
  }, [participants, search, paymentFilter, attendanceFilter]);

  // Execute confirm payment
  const handleConfirmPayment = async () => {
    if (!confirmingItem) return;
    setLoadingConfirm(true);

    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: confirmingItem.id,
          note: confirmNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal mengonfirmasi pembayaran.');

      // Update state
      setParticipants((prev) =>
        prev.map((item) =>
          item.id === confirmingItem.id
            ? {
                ...item,
                payment_status: 'paid',
                payment_confirmed_at: new Date().toISOString(),
                payment_note: confirmNote.trim() || null,
              }
            : item
        )
      );

      // Also update selectedItem if open
      if (selectedItem?.id === confirmingItem.id) {
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                payment_status: 'paid',
                payment_confirmed_at: new Date().toISOString(),
                payment_note: confirmNote.trim() || null,
              }
            : null
        );
      }

      setConfirmingItem(null);
      setConfirmNote('');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  // Execute delete participant
  const handleDeleteParticipant = async () => {
    if (!deletingItem) return;
    setLoadingDelete(true);

    try {
      const res = await fetch('/api/admin/registrations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingItem.id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus data peserta.');

      // Update state
      setParticipants((prev) => prev.filter((item) => item.id !== deletingItem.id));

      if (selectedItem?.id === deletingItem.id) {
        setSelectedItem(null);
      }

      setDeletingItem(null);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem saat menghapus peserta.');
    } finally {
      setLoadingDelete(false);
    }
  };

  // Build WhatsApp Link to User (Ticket Confirmation)
  const getWaLinkToUser = (item: ParticipantItem) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://happycoupleclass.com';
    const ticketUrl = `${origin}/tiket/${item.ticket_token}`;
    return buildWaLink(item.whatsapp, defaultWaToUserTemplate, {
      event: eventTitle,
      husband: item.husband_name,
      wife: item.wife_name,
      reg_code: item.reg_code,
      ticket_link: ticketUrl,
    });
  };

  // Build WhatsApp Reminder Link (Payment Follow-up)
  const getWaReminderLink = (item: ParticipantItem) => {
    const reminderTemplate =
      'Assalamualaikum Wr. Wb. Halo Bapak/Ibu {husband} & {wife},\n\nKami dari panitia {event} ingin mengonfirmasi terkait pendaftaran Anda dengan kode registrasi *{reg_code}*.\n\nApakah Anda sudah melakukan pembayaran? Jika sudah, mohon berkenan mengirimkan bukti transfernya melalui pesan ini agar dapat segera kami verifikasi dan kami kirimkan e-tiket kedatangan Anda.\n\nTerima kasih banyak atas perhatiannya. 🙏';

    return buildWaLink(item.whatsapp, reminderTemplate, {
      event: eventTitle,
      husband: item.husband_name,
      wife: item.wife_name,
      reg_code: item.reg_code,
    });
  };

  const copyTicketLink = async (token: string) => {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(`${origin}/tiket/${token}`);
    alert('Link tiket berhasil disalin ke clipboard!');
  };

  const badgeClass = (status: ParticipantItem['payment_status']) => {
    switch (status) {
      case 'paid': return 'badge-ok';
      case 'pending': return 'badge-warn';
      case 'waitlist': return 'badge-pink';
      default: return 'badge-neutral';
    }
  };

  const badgeText = (status: ParticipantItem['payment_status']) => {
    switch (status) {
      case 'paid': return 'Lunas';
      case 'pending': return 'Menunggu';
      case 'waitlist': return 'Antrean';
      case 'expired': return 'Kedaluwarsa';
      case 'cancelled': return 'Dibatalkan';
    }
  };

  return (
    <div className="pt-container">
      {/* Stats Summary Cards */}
      <div className="pt-stats-row">
        <div className="pt-stat-card">
          <span className="pt-stat-lbl">Total Pasangan</span>
          <span className="pt-stat-val">{total}</span>
        </div>
        <div className="pt-stat-card">
          <span className="pt-stat-lbl">Menunggu Bayar</span>
          <span className="pt-stat-val text-warn">{pending}</span>
        </div>
        <div className="pt-stat-card">
          <span className="pt-stat-lbl">Lunas</span>
          <span className="pt-stat-val text-ok">{paid}</span>
        </div>
        <div className="pt-stat-card">
          <span className="pt-stat-lbl">Hadir Hari-H</span>
          <span className="pt-stat-val">{attended}</span>
        </div>
        {waitlist > 0 && (
          <div className="pt-stat-card">
            <span className="pt-stat-lbl">Daftar Tunggu</span>
            <span className="pt-stat-val text-pink">{waitlist}</span>
          </div>
        )}
        {quota && (
          <div className="pt-stat-card">
            <span className="pt-stat-lbl">Sisa Kuota</span>
            <span className="pt-stat-val">{remainingQuota}</span>
          </div>
        )}
      </div>

      {/* Filter and Action Bar */}
      <div className="pt-toolbar">
        <div className="pt-search-box">
          <Icon name="search" size={20} className="pt-search-icon" aria-hidden />
          <input
            type="text"
            className="pt-search-input"
            placeholder="Cari nama suami/istri, kode, atau WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="pt-clear-btn" onClick={() => setSearch('')}>
              <Icon name="close" size={16} aria-hidden />
            </button>
          )}
        </div>

        <div className="pt-filters-wrap">
          <select
            className="pt-select-filter"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="all">Semua Status Bayar</option>
            <option value="pending">Menunggu Bayar</option>
            <option value="paid">Lunas</option>
            <option value="waitlist">Antrean (Waitlist)</option>
            <option value="expired">Kedaluwarsa</option>
            <option value="cancelled">Dibatalkan</option>
          </select>

          <select
            className="pt-select-filter"
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
          >
            <option value="all">Semua Kehadiran</option>
            <option value="hadir">Sudah Hadir</option>
            <option value="belum">Belum Hadir</option>
          </select>

          <a
            href={`/api/admin/export?event_id=${eventId}`}
            className="btn btn-secondary btn-sm pt-export-btn"
            download
          >
            <Icon name="download" size={18} aria-hidden />
            Ekspor CSV
          </a>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="pt-table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Pasangan</th>
                <th>Nomor WhatsApp</th>
                <th>Status Pembayaran</th>
                <th>Status Hadir</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">
                    Tidak ditemukan peserta yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="pt-row" onClick={() => setSelectedItem(item)}>
                    <td>
                      <span className="pt-reg-code">{item.reg_code}</span>
                    </td>
                    <td>
                      <div className="pt-couple">
                        <strong>{item.husband_name}</strong> &amp; <strong>{item.wife_name}</strong>
                      </div>
                      {item.email && <span className="pt-email">{item.email}</span>}
                    </td>
                    <td>
                      <code className="pt-wa">{item.whatsapp}</code>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass(item.payment_status)}`}>
                        {badgeText(item.payment_status)}
                      </span>
                    </td>
                    <td>
                      {item.checkin_at ? (
                        <span className="badge badge-ok">
                          <Icon name="check" size={12} aria-hidden /> Hadir
                        </span>
                      ) : (
                        <span className="pt-not-attended">Belum</span>
                      )}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="pt-actions-row">
                        {item.payment_status === 'pending' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm pt-btn-confirm"
                            onClick={() => setConfirmingItem(item)}
                            title="Konfirmasi Pembayaran Selesai"
                          >
                            <Icon name="check_circle" size={16} aria-hidden />
                            Lunas
                          </button>
                        )}

                        {item.payment_status !== 'paid' && (
                          <a
                            href={getWaReminderLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm pt-btn-remind"
                            title="Ingatkan Pembayaran via WhatsApp"
                          >
                            <Icon name="chat" size={16} aria-hidden />
                            Ingatkan
                          </a>
                        )}

                        {item.payment_status === 'paid' && (
                          <a
                            href={getWaLinkToUser(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm pt-btn-wa"
                            title="Kirim Tiket via WhatsApp"
                          >
                            <Icon name="chat" size={16} aria-hidden />
                            Kirim WA
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => copyTicketLink(item.ticket_token)}
                          title="Salin Link Tiket"
                        >
                          <Icon name="link" size={16} aria-hidden />
                        </button>

                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => setSelectedItem(item)}
                          title="Lihat Detail Jawaban Form"
                        >
                          <Icon name="visibility" size={16} aria-hidden />
                        </button>

                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setDeletingItem(item)}
                          title="Hapus Data Peserta"
                        >
                          <Icon name="delete" size={16} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="pt-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pt-detail-header">
              <div>
                <span className="pt-reg-code">{selectedItem.reg_code}</span>
                <h3 className="pt-detail-title">
                  {selectedItem.husband_name} &amp; {selectedItem.wife_name}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedItem(null)}
                aria-label="Tutup detail"
              >
                <Icon name="close" size={24} aria-hidden />
              </button>
            </div>

            <div className="pt-detail-body">
              {/* Status Banner */}
              <div className="pt-status-banner">
                <div className="pt-banner-item">
                  <span className="lbl">Status Bayar</span>
                  <span className={`badge ${badgeClass(selectedItem.payment_status)}`}>
                    {badgeText(selectedItem.payment_status)}
                  </span>
                </div>
                <div className="pt-banner-item">
                  <span className="lbl">Kehadiran</span>
                  <span className="val">{selectedItem.checkin_at ? 'Hadir' : 'Belum Hadir'}</span>
                </div>
                <div className="pt-banner-item">
                  <span className="lbl">Nomor WhatsApp</span>
                  <span className="val">{selectedItem.whatsapp}</span>
                </div>
              </div>

              {/* Action Buttons inside detail */}
              <div className="pt-detail-actions">
                {selectedItem.payment_status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setConfirmingItem(selectedItem);
                    }}
                  >
                    <Icon name="check_circle" size={18} aria-hidden />
                    Konfirmasi Pembayaran Selesai
                  </button>
                )}
                {selectedItem.payment_status !== 'paid' && (
                  <a
                    href={getWaReminderLink(selectedItem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm pt-btn-remind"
                    title="Ingatkan Pembayaran via WhatsApp"
                  >
                    <Icon name="chat" size={18} aria-hidden />
                    Ingatkan Bayar via WA
                  </a>
                )}
                {selectedItem.payment_status === 'paid' && (
                  <a
                    href={getWaLinkToUser(selectedItem)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <Icon name="chat" size={18} aria-hidden />
                    Kirim Link Tiket via WA
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyTicketLink(selectedItem.ticket_token)}
                >
                  <Icon name="link" size={18} aria-hidden />
                  Salin Tautan Tiket
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm pt-btn-delete"
                  onClick={() => setDeletingItem(selectedItem)}
                >
                  <Icon name="delete" size={18} aria-hidden />
                  Hapus Peserta
                </button>
              </div>

              {/* Custom Form Answers */}
              <div className="pt-answers-section">
                <h4 className="pt-section-title">
                  <Icon name="assignment" size={18} aria-hidden />
                  Jawaban Formulir Peserta
                </h4>

                <div className="pt-answers-list">
                  {Object.keys(selectedItem.form_snapshot || {}).length === 0 ? (
                    <p className="text-muted">Tidak ada pertanyaan tambahan pada pendaftaran ini.</p>
                  ) : (
                    Object.entries(selectedItem.form_snapshot || {}).map(([key, label]) => {
                      const answer = selectedItem.answers?.[key];
                      const displayAnswer = Array.isArray(answer)
                        ? answer.join(', ')
                        : (answer !== undefined && answer !== null && answer !== '' ? String(answer) : '-');

                      return (
                        <div key={key} className="pt-answer-item">
                          <span className="pt-ans-label">{label}</span>
                          <span className="pt-ans-value">{displayAnswer}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PAYMENT MODAL */}
      {confirmingItem && (
        <div className="modal-backdrop" onClick={() => setConfirmingItem(null)}>
          <div className="pt-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Konfirmasi Pembayaran Selesai</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setConfirmingItem(null)}
                aria-label="Batal"
              >
                <Icon name="close" size={20} aria-hidden />
              </button>
            </div>
            <div className="modal-body">
              <p className="pt-confirm-text">
                Apakah Anda yakin telah menerima pembayaran pendaftaran dari pasangan:
              </p>
              <div className="pt-confirm-couple-box">
                <span className="reg-code">{confirmingItem.reg_code}</span>
                <strong>{confirmingItem.husband_name}</strong> &amp; <strong>{confirmingItem.wife_name}</strong>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Catatan Verifikasi (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Transfer BCA a.n Faris, rek 123"
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmingItem(null)}
                disabled={loadingConfirm}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmPayment}
                disabled={loadingConfirm}
              >
                {loadingConfirm ? 'Menyimpan...' : 'Ya, Pembayaran Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PARTICIPANT MODAL */}
      {deletingItem && (
        <div className="modal-backdrop" onClick={() => !loadingDelete && setDeletingItem(null)}>
          <div className="pt-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>Hapus Data Peserta</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !loadingDelete && setDeletingItem(null)}
                aria-label="Batal"
                disabled={loadingDelete}
              >
                <Icon name="close" size={20} aria-hidden />
              </button>
            </div>
            <div className="modal-body">
              <p className="pt-confirm-text">
                Apakah Anda yakin ingin menghapus data pendaftaran peserta berikut?
              </p>
              <div className="pt-confirm-couple-box" style={{ background: '#FFF5F5', borderColor: '#FECACA' }}>
                <span className="pt-reg-code">{deletingItem.reg_code}</span>
                <div>
                  <strong>{deletingItem.husband_name}</strong> &amp; <strong>{deletingItem.wife_name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--ink-500)', marginTop: '2px' }}>
                    WA: {deletingItem.whatsapp} • Status: {badgeText(deletingItem.payment_status)}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '12px', marginBottom: 0 }}>
                ⚠️ Pendaftaran ini akan dihapus dari sistem dan kuota acara akan dikembalikan.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDeletingItem(null)}
                disabled={loadingDelete}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDeleteParticipant}
                disabled={loadingDelete}
              >
                {loadingDelete ? 'Menghapus...' : 'Ya, Hapus Peserta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pt-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pt-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .pt-stat-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow-sm);
        }

        .pt-stat-lbl {
          font-size: 12px;
          color: var(--ink-600);
          font-weight: 500;
        }

        .pt-stat-val {
          font-size: 22px;
          font-weight: 700;
          color: var(--ink-900);
        }

        .pt-toolbar {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 12px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pt-search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
        }

        .pt-search-icon {
          position: absolute;
          left: 12px;
          color: var(--ink-400);
          pointer-events: none;
        }

        .pt-search-input {
          width: 100%;
          height: 40px;
          padding: 0 36px 0 38px;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color 150ms ease;
        }

        .pt-search-input:focus {
          border-color: var(--pink-400);
          box-shadow: 0 0 0 2px var(--pink-100);
        }

        .pt-clear-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: var(--ink-400);
          cursor: pointer;
          display: flex;
        }

        .pt-filters-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pt-select-filter {
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 13px;
          color: var(--ink-900);
          background: var(--white);
          outline: none;
        }

        .pt-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .pt-table-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .pt-row {
          cursor: pointer;
          transition: background-color 120ms ease;
        }

        .pt-row:hover {
          background-color: #faf7f8;
        }

        .pt-reg-code {
          font-family: monospace;
          font-weight: 600;
          color: var(--pink-600);
          background: var(--pink-50);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 12px;
        }

        .pt-couple strong {
          color: var(--ink-900);
          font-weight: 600;
        }

        .pt-email {
          display: block;
          font-size: 11px;
          color: var(--ink-400);
        }

        .pt-wa {
          font-family: monospace;
          font-size: 12px;
          color: var(--ink-600);
        }

        .pt-not-attended {
          font-size: 12px;
          color: var(--ink-400);
        }

        .pt-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }

        .pt-btn-confirm {
          gap: 4px;
        }

        .pt-btn-wa {
          gap: 4px;
          color: #25D366;
          border-color: #A3E7B8;
        }

        .pt-btn-wa:hover {
          background: #EAF8EE;
          color: #1F9D4D;
        }

        .pt-btn-remind {
          gap: 4px;
          color: #128C7E;
          border-color: #B2DFDB;
          background: #F0FDF4;
        }

        .pt-btn-remind:hover {
          background: #DCFCE7;
          color: #075E54;
          border-color: #86EFAC;
        }

        .btn-icon-danger {
          color: var(--ink-400);
        }

        .btn-icon-danger:hover {
          color: var(--danger);
          background: #FEE2E2;
        }

        .pt-btn-delete {
          color: var(--danger);
          border-color: #FECACA;
        }

        .pt-btn-delete:hover {
          background: #FEE2E2;
          color: #991B1B;
          border-color: #F87171;
        }

        /* Detail Modal */
        .pt-detail-modal {
          background: var(--white);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-md);
        }

        .pt-detail-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .pt-detail-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 6px 0 0 0;
        }

        .pt-detail-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pt-status-banner {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: var(--pink-50);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 12px 16px;
        }

        .pt-banner-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pt-banner-item .lbl {
          font-size: 11px;
          color: var(--ink-600);
          font-weight: 500;
        }

        .pt-banner-item .val {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-900);
        }

        .pt-detail-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pt-answers-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid var(--line);
          padding-top: 16px;
        }

        .pt-section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-900);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .pt-section-title .material-symbols-outlined { color: var(--pink-500); }

        .pt-answers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pt-answer-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: #faf8f9;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }

        .pt-ans-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-600);
        }

        .pt-ans-value {
          font-size: 13px;
          color: var(--ink-900);
          font-weight: 500;
        }

        /* Confirm Payment Modal */
        .pt-confirm-modal {
          background: var(--white);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 440px;
          box-shadow: var(--shadow-md);
        }

        .pt-confirm-text {
          font-size: 14px;
          color: var(--ink-600);
          margin: 0 0 12px 0;
        }

        .pt-confirm-couple-box {
          background: var(--pink-50);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
