import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

export interface PageBlock {
  id: string;
  type: 'heading' | 'text' | 'image' | 'event_info' | 'button' | 'faq' | 'gallery';
  data: Record<string, any>;
}

export interface PageData {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  cover_url: string;
  related_event_id: string;
  show_on_landing: boolean;
  status: 'draft' | 'published';
  blocks: PageBlock[];
}

interface PageBlockEditorProps {
  initialPage: PageData;
  eventsList: { id: string; title: string; slug: string; date_start: string; location: string; price_per_couple: number }[];
}

export function PageBlockEditor({ initialPage, eventsList }: PageBlockEditorProps) {
  const [page, setPage] = useState<PageData>(initialPage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Add a new block
  const addBlock = (type: PageBlock['type']) => {
    const id = `blk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    let initialData: Record<string, any> = {};

    switch (type) {
      case 'heading':
        initialData = { text: 'Judul Bagian', level: 'h2' };
        break;
      case 'text':
        initialData = { text: 'Tuliskan isi keterangan atau informasi di sini...' };
        break;
      case 'image':
        initialData = { url: '', caption: '' };
        break;
      case 'event_info':
        initialData = { event_id: eventsList[0]?.id || '' };
        break;
      case 'button':
        initialData = {
          label: 'Daftar Kelas Sekarang',
          action: 'event',
          event_slug: eventsList[0]?.slug || '',
          url: '',
          style: 'primary',
        };
        break;
      case 'faq':
        initialData = {
          items: [
            { q: 'Pertanyaan umum?', a: 'Jawaban penjelasan secara lengkap dan ramah.' },
          ],
        };
        break;
      case 'gallery':
        initialData = {
          images: [{ url: '', caption: '' }],
        };
        break;
    }

    setPage((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { id, type, data: initialData }],
    }));
    setShowAddMenu(false);
  };

  // Reorder block up/down
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...page.blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setPage((prev) => ({ ...prev, blocks: newBlocks }));
  };

  // Duplicate block
  const duplicateBlock = (index: number) => {
    const target = page.blocks[index];
    const newBlock: PageBlock = {
      ...target,
      id: `blk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      data: JSON.parse(JSON.stringify(target.data)),
    };
    const newBlocks = [...page.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setPage((prev) => ({ ...prev, blocks: newBlocks }));
  };

  // Delete block
  const deleteBlock = (index: number) => {
    if (confirm('Hapus blok ini?')) {
      setPage((prev) => ({
        ...prev,
        blocks: prev.blocks.filter((_, i) => i !== index),
      }));
    }
  };

  // Update block data
  const updateBlockData = (index: number, newData: Record<string, any>) => {
    setPage((prev) => {
      const nextBlocks = [...prev.blocks];
      nextBlocks[index] = { ...nextBlocks[index], data: newData };
      return { ...prev, blocks: nextBlocks };
    });
  };

  // Auto-slug
  const handleTitleChange = (newTitle: string) => {
    const autoSlug = newTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setPage((prev) => ({
      ...prev,
      title: newTitle,
      slug: prev.slug === '' || !prev.id ? autoSlug : prev.slug,
    }));
  };

  // Save handler
  const handleSave = async (status: 'draft' | 'published') => {
    if (!page.title.trim()) {
      alert('Judul halaman wajib diisi.');
      return;
    }
    if (!page.slug.trim()) {
      alert('Slug URL wajib diisi.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...page,
        status,
      };

      const res = await fetch('/api/admin/halaman/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan halaman.');

      setMessage(`Halaman berhasil disimpan sebagai ${status === 'published' ? 'Diterbitkan' : 'Draft'}.`);
      setPage((prev) => ({ ...prev, status, id: json.id || prev.id }));

      if (!page.id && json.id) {
        window.history.replaceState(null, '', `/admin/halaman/${json.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDeletePage = async () => {
    if (!page.id) return;
    if (!confirm('Apakah Anda yakin ingin menghapus halaman ini? Halaman tidak akan dapat diakses lagi oleh publik.')) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/halaman/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: page.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus halaman.');
      window.location.href = '/admin/halaman';
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem saat menghapus halaman.');
      setDeleting(false);
    }
  };

  return (
    <div className="pbe-container">
      {/* Top action bar */}
      <div className="pbe-toolbar">
        <div className="pbe-toolbar-left">
          <span className={`badge ${page.status === 'published' ? 'badge-ok' : 'badge-neutral'}`}>
            {page.status === 'published' ? 'Diterbitkan' : 'Draft'}
          </span>
          {message && <span className="pbe-msg">{message}</span>}
        </div>

        <div className="pbe-toolbar-right">
          <div className="pbe-view-switch">
            <button
              type="button"
              className={`pbe-switch-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Icon name="edit" size={16} aria-hidden />
              Editor Blok
            </button>
            <button
              type="button"
              className={`pbe-switch-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <Icon name="visibility" size={16} aria-hidden />
              Pratinjau
            </button>
          </div>

          {page.id && (
            <a
              href={`/p/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              title="Buka Halaman Publik di Tab Baru"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon name="visibility" size={16} aria-hidden />
              Lihat Publik
            </a>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            Simpan Draft
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            <Icon name="publish" size={16} aria-hidden />
            {saving ? 'Menyimpan...' : 'Publikasikan'}
          </button>

          {page.id && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDeletePage}
              disabled={deleting}
              title="Hapus Halaman Ini"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--danger)', color: '#fff', border: 'none' }}
            >
              <Icon name="delete" size={16} aria-hidden />
              {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="pbe-editor-layout">
          {/* Settings Card */}
          <div className="pbe-card">
            <h3 className="pbe-card-title">
              <Icon name="settings" size={18} aria-hidden />
              Pengaturan Halaman
            </h3>

            <div className="pbe-grid-2">
              <div className="pbe-group">
                <label className="pbe-label">Judul Halaman <span className="required">*</span></label>
                <input
                  type="text"
                  className="pbe-input"
                  placeholder="Contoh: Bimbingan Pranikah Akbar Bandung"
                  value={page.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>

              <div className="pbe-group">
                <label className="pbe-label">Slug URL <span className="required">*</span></label>
                <div className="pbe-slug-wrap">
                  <span className="pbe-slug-prefix">happycoupleclass.com/p/</span>
                  <input
                    type="text"
                    className="pbe-input pbe-slug-input"
                    placeholder="pranikah-akbar-bandung"
                    value={page.slug}
                    onChange={(e) => setPage({ ...page, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="pbe-group">
                <label className="pbe-label">Event Terkait (Opsional)</label>
                <select
                  className="pbe-select"
                  value={page.related_event_id || ''}
                  onChange={(e) => setPage({ ...page, related_event_id: e.target.value })}
                >
                  <option value="">-- Tidak Terhubung ke Event --</option>
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div className="pbe-group">
                <label className="pbe-label">URL Gambar Sampul / Banner</label>
                <input
                  type="url"
                  className="pbe-input"
                  placeholder="https://... flyer atau cover postingan"
                  value={page.cover_url || ''}
                  onChange={(e) => setPage({ ...page, cover_url: e.target.value })}
                />
              </div>

              <div className="pbe-group col-span-2">
                <label className="pbe-label">Ringkasan Singkat (Meta Description)</label>
                <textarea
                  className="pbe-textarea"
                  rows={2}
                  placeholder="Ringkasan isi halaman untuk deskripsi SEO Google dan Open Graph..."
                  value={page.summary || ''}
                  onChange={(e) => setPage({ ...page, summary: e.target.value })}
                />
              </div>

              <div className="pbe-group col-span-2">
                <label className="pbe-checkbox">
                  <input
                    type="checkbox"
                    checked={page.show_on_landing}
                    onChange={(e) => setPage({ ...page, show_on_landing: e.target.checked })}
                  />
                  <span>Tampilkan postingan ini di section Event halaman utama (Landing Page)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Blocks List */}
          <div className="pbe-blocks-stack">
            <h3 className="pbe-blocks-title">
              <Icon name="view_stream" size={20} aria-hidden />
              Susunan Blok Konten ({page.blocks.length})
            </h3>

            {page.blocks.map((blk, idx) => (
              <div key={blk.id} className="pbe-block-card">
                <div className="pbe-block-header">
                  <span className="pbe-block-num">#{idx + 1}</span>
                  <span className="pbe-block-type-badge">{blk.type}</span>

                  <div className="pbe-block-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveBlock(idx, 'up')}
                      disabled={idx === 0}
                      title="Geser ke atas"
                    >
                      <Icon name="arrow_upward" size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => moveBlock(idx, 'down')}
                      disabled={idx === page.blocks.length - 1}
                      title="Geser ke bawah"
                    >
                      <Icon name="arrow_downward" size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => duplicateBlock(idx)}
                      title="Duplikat Blok"
                    >
                      <Icon name="content_copy" size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-delete"
                      onClick={() => deleteBlock(idx)}
                      title="Hapus Blok"
                    >
                      <Icon name="delete" size={16} aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="pbe-block-body">
                  {/* Heading */}
                  {blk.type === 'heading' && (
                    <div className="pbe-grid-2">
                      <div className="pbe-group col-span-2">
                        <label className="pbe-label">Teks Judul</label>
                        <input
                          type="text"
                          className="pbe-input"
                          value={blk.data.text || ''}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, text: e.target.value })}
                        />
                      </div>
                      <div className="pbe-group">
                        <label className="pbe-label">Ukuran Heading</label>
                        <select
                          className="pbe-select"
                          value={blk.data.level || 'h2'}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, level: e.target.value })}
                        >
                          <option value="h2">Heading 2 (Besar)</option>
                          <option value="h3">Heading 3 (Sedang)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Text */}
                  {blk.type === 'text' && (
                    <div className="pbe-group">
                      <label className="pbe-label">Isi Teks / Paragraf</label>
                      <textarea
                        className="pbe-textarea"
                        rows={4}
                        value={blk.data.text || ''}
                        onChange={(e) => updateBlockData(idx, { ...blk.data, text: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Image */}
                  {blk.type === 'image' && (
                    <div className="pbe-grid-2">
                      <div className="pbe-group col-span-2">
                        <label className="pbe-label">URL Gambar / Flyer</label>
                        <input
                          type="url"
                          className="pbe-input"
                          placeholder="https://... gambar flyer"
                          value={blk.data.url || ''}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, url: e.target.value })}
                        />
                      </div>
                      <div className="pbe-group col-span-2">
                        <label className="pbe-label">Keterangan Gambar (Caption)</label>
                        <input
                          type="text"
                          className="pbe-input"
                          placeholder="Contoh: Flyer Resmi Happy Couple Class"
                          value={blk.data.caption || ''}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, caption: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Event Info */}
                  {blk.type === 'event_info' && (
                    <div className="pbe-group">
                      <label className="pbe-label">Pilih Event yang Ditampilkan Otomatis</label>
                      <select
                        className="pbe-select"
                        value={blk.data.event_id || ''}
                        onChange={(e) => updateBlockData(idx, { ...blk.data, event_id: e.target.value })}
                      >
                        <option value="">-- Pilih Event --</option>
                        {eventsList.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                      <span className="pbe-help">
                        Blok ini akan otomatis menampilkan kotak informasi tanggal, lokasi acara, dan harga per couple.
                      </span>
                    </div>
                  )}

                  {/* Button */}
                  {blk.type === 'button' && (
                    <div className="pbe-grid-2">
                      <div className="pbe-group">
                        <label className="pbe-label">Label Tombol</label>
                        <input
                          type="text"
                          className="pbe-input"
                          value={blk.data.label || ''}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, label: e.target.value })}
                        />
                      </div>
                      <div className="pbe-group">
                        <label className="pbe-label">Aksi Klik Tombol</label>
                        <select
                          className="pbe-select"
                          value={blk.data.action || 'event'}
                          onChange={(e) => updateBlockData(idx, { ...blk.data, action: e.target.value })}
                        >
                          <option value="event">Buka Form Pendaftaran Event</option>
                          <option value="custom">Buka Tautan Bebas / Custom Link</option>
                        </select>
                      </div>

                      {blk.data.action === 'event' ? (
                        <div className="pbe-group col-span-2">
                          <label className="pbe-label">Tujuan Event</label>
                          <select
                            className="pbe-select"
                            value={blk.data.event_slug || ''}
                            onChange={(e) => updateBlockData(idx, { ...blk.data, event_slug: e.target.value })}
                          >
                            <option value="">-- Pilih Event --</option>
                            {eventsList.map((ev) => (
                              <option key={ev.slug} value={ev.slug}>{ev.title} (/daftar/{ev.slug})</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="pbe-group col-span-2">
                          <label className="pbe-label">URL Bebas</label>
                          <input
                            type="url"
                            className="pbe-input"
                            placeholder="https://..."
                            value={blk.data.url || ''}
                            onChange={(e) => updateBlockData(idx, { ...blk.data, url: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* FAQ */}
                  {blk.type === 'faq' && (
                    <div className="pbe-faq-editor">
                      <label className="pbe-label">Daftar Pertanyaan &amp; Jawaban</label>
                      {(blk.data.items || []).map((faqItem: any, fIdx: number) => (
                        <div key={fIdx} className="pbe-faq-row">
                          <input
                            type="text"
                            className="pbe-input"
                            placeholder="Tanya..."
                            value={faqItem.q}
                            onChange={(e) => {
                              const updated = [...blk.data.items];
                              updated[fIdx].q = e.target.value;
                              updateBlockData(idx, { ...blk.data, items: updated });
                            }}
                          />
                          <textarea
                            className="pbe-textarea"
                            rows={2}
                            placeholder="Jawab..."
                            value={faqItem.a}
                            onChange={(e) => {
                              const updated = [...blk.data.items];
                              updated[fIdx].a = e.target.value;
                              updateBlockData(idx, { ...blk.data, items: updated });
                            }}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const updated = [...(blk.data.items || []), { q: '', a: '' }];
                          updateBlockData(idx, { ...blk.data, items: updated });
                        }}
                      >
                        + Tambah FAQ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Block Menu */}
            <div className="pbe-add-block-wrap">
              {!showAddMenu ? (
                <button
                  type="button"
                  className="pbe-btn-add"
                  onClick={() => setShowAddMenu(true)}
                >
                  <Icon name="add_circle" size={20} aria-hidden />
                  Tambah Blok Konten
                </button>
              ) : (
                <div className="pbe-type-menu">
                  <div className="pbe-menu-header">
                    <span>Pilih Tipe Blok:</span>
                    <button type="button" className="btn-icon" onClick={() => setShowAddMenu(false)}>
                      <Icon name="close" size={18} aria-hidden />
                    </button>
                  </div>
                  <div className="pbe-type-buttons">
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('heading')}>
                      <Icon name="title" size={20} aria-hidden />
                      Judul / Heading
                    </button>
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('text')}>
                      <Icon name="notes" size={20} aria-hidden />
                      Teks / Paragraf
                    </button>
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('image')}>
                      <Icon name="image" size={20} aria-hidden />
                      Gambar / Flyer
                    </button>
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('event_info')}>
                      <Icon name="event" size={20} aria-hidden />
                      Info Jadwal Event
                    </button>
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('button')}>
                      <Icon name="smart_button" size={20} aria-hidden />
                      Tombol Daftar
                    </button>
                    <button type="button" className="pbe-type-btn" onClick={() => addBlock('faq')}>
                      <Icon name="help" size={20} aria-hidden />
                      FAQ Accordion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Live Preview */
        <div className="pbe-preview-box">
          <div className="pbe-page-preview">
            <h1 className="preview-title">{page.title || 'Judul Halaman'}</h1>
            {page.cover_url && (
              <div className="preview-cover-wrap">
                <img src={page.cover_url} alt={page.title} className="preview-cover" />
              </div>
            )}

            <div className="preview-blocks">
              {page.blocks.map((blk) => (
                <div key={blk.id} className="preview-block">
                  {blk.type === 'heading' && (
                    blk.data.level === 'h3' ? <h3>{blk.data.text}</h3> : <h2>{blk.data.text}</h2>
                  )}

                  {blk.type === 'text' && (
                    <div className="preview-text">
                      {blk.data.text?.split('\n').map((p: string, i: number) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  )}

                  {blk.type === 'image' && blk.data.url && (
                    <div className="preview-img-wrap">
                      <img src={blk.data.url} alt={blk.data.caption || ''} />
                      {blk.data.caption && <span className="caption">{blk.data.caption}</span>}
                    </div>
                  )}

                  {blk.type === 'event_info' && (
                    <div className="preview-event-card">
                      <Icon name="event" size={24} className="icon-pink" aria-hidden />
                      <div>
                        <h4>Informasi Jadwal Kelas</h4>
                        <p>Kotak jadwal otomatis sesuai event yang dipilih.</p>
                      </div>
                    </div>
                  )}

                  {blk.type === 'button' && (
                    <div className="preview-btn-wrap">
                      <a href="#" className="btn btn-primary btn-lg" onClick={(e) => e.preventDefault()}>
                        {blk.data.label}
                        <Icon name="arrow_forward" size={18} aria-hidden />
                      </a>
                    </div>
                  )}

                  {blk.type === 'faq' && (
                    <div className="preview-faq-list">
                      {(blk.data.items || []).map((item: any, i: number) => (
                        <details key={i} className="faq-preview-item" open>
                          <summary><strong>{item.q}</strong></summary>
                          <p>{item.a}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pbe-container {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pbe-toolbar {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .pbe-toolbar-left, .pbe-toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pbe-msg {
          font-size: 13px;
          color: var(--ok);
          font-weight: 500;
        }

        .pbe-view-switch {
          display: flex;
          background: var(--pink-50);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 2px;
        }

        .pbe-switch-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          color: var(--ink-600);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }

        .pbe-switch-btn.active {
          background: var(--white);
          color: var(--pink-500);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
        }

        .pbe-editor-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pbe-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pbe-card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }
        .pbe-card-title .material-symbols-outlined { color: var(--pink-500); }

        .pbe-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .col-span-2 { grid-column: span 2; }

        .pbe-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pbe-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--ink-900);
        }

        .pbe-input, .pbe-select, .pbe-textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 150ms ease;
        }

        .pbe-input:focus, .pbe-select:focus, .pbe-textarea:focus {
          border-color: var(--pink-400);
          box-shadow: 0 0 0 3px var(--pink-100);
        }

        .pbe-slug-wrap {
          display: flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          background: var(--white);
          overflow: hidden;
        }

        .pbe-slug-prefix {
          padding: 0 12px;
          background: var(--pink-50);
          color: var(--ink-600);
          font-size: 13px;
          border-right: 1px solid var(--line);
          height: 40px;
          display: flex;
          align-items: center;
        }

        .pbe-slug-input { border: none; border-radius: 0; }
        .pbe-slug-input:focus { box-shadow: none; }

        .pbe-checkbox {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }

        .pbe-help { font-size: 11px; color: var(--ink-400); }

        /* Blocks */
        .pbe-blocks-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pbe-blocks-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 8px 0 0 0;
        }

        .pbe-block-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .pbe-block-header {
          padding: 12px 18px;
          background: var(--white);
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pbe-block-num {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-400);
          margin-right: 8px;
        }

        .pbe-block-type-badge {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          background: var(--pink-50);
          color: var(--pink-600);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .pbe-block-actions {
          display: flex;
          gap: 6px;
        }

        .pbe-block-body {
          padding: 20px;
        }

        /* FAQ block editor */
        .pbe-faq-editor {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pbe-faq-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: #faf8f9;
          border: 1px solid var(--line);
          padding: 12px;
          border-radius: var(--radius-md);
        }

        /* Add Block */
        .pbe-btn-add {
          width: 100%;
          height: 48px;
          background: var(--white);
          border: 2px dashed var(--pink-400);
          color: var(--pink-500);
          border-radius: var(--radius-lg);
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 150ms ease;
        }

        .pbe-btn-add:hover {
          background: var(--pink-50);
        }

        .pbe-type-menu {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 18px;
          box-shadow: var(--shadow-md);
        }

        .pbe-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .pbe-type-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
        }

        .pbe-type-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: #faf8f9;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 13px;
          color: var(--ink-900);
          cursor: pointer;
          transition: all 150ms ease;
        }

        .pbe-type-btn:hover {
          background: var(--pink-50);
          color: var(--pink-500);
          border-color: var(--pink-400);
        }

        .pbe-type-btn .material-symbols-outlined { color: var(--pink-500); }

        /* Preview Box */
        .pbe-preview-box {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 40px 32px;
          box-shadow: var(--shadow-sm);
        }

        .pbe-page-preview {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .preview-title {
          font-size: 32px;
          font-weight: 700;
          color: var(--ink-900);
          margin: 0;
          line-height: 1.3;
        }

        .preview-cover-wrap {
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .preview-cover {
          width: 100%;
          height: auto;
          display: block;
        }

        .preview-blocks {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .preview-block h2 {
          font-size: 24px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0;
        }

        .preview-block h3 {
          font-size: 19px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0;
        }

        .preview-text {
          font-size: 15px;
          line-height: 1.75;
          color: var(--ink-600);
        }

        .preview-img-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .preview-img-wrap img {
          width: 100%;
          border-radius: var(--radius-md);
        }

        .preview-img-wrap .caption {
          font-size: 12px;
          color: var(--ink-400);
          text-align: center;
        }

        .preview-event-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--pink-50);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 16px 20px;
        }

        .preview-event-card h4 {
          margin: 0 0 2px 0;
          font-size: 15px;
          color: var(--ink-900);
        }

        .preview-event-card p {
          margin: 0;
          font-size: 13px;
          color: var(--ink-600);
        }

        .preview-btn-wrap {
          display: flex;
          justify-content: center;
        }

        .preview-faq-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-preview-item {
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          background: #faf8f9;
        }

        @media (max-width: 640px) {
          .pbe-grid-2 { grid-template-columns: 1fr; }
          .col-span-2 { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
}
