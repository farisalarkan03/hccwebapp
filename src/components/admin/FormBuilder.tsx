import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '../ui/Icon';
import { FormRenderer, type FormFieldItem } from '../register/FormRenderer';

interface FormBuilderProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  initialFields: FormFieldItem[];
  registrationCount: number;
  initialStatus?: 'draft' | 'open' | 'closed' | 'done';
}

const FIELD_TYPES = [
  { type: 'text', label: 'Teks Singkat', icon: 'short_text' },
  { type: 'textarea', label: 'Paragraf / Teks Panjang', icon: 'notes' },
  { type: 'number', label: 'Angka', icon: 'pin' },
  { type: 'phone', label: 'Nomor HP / WA', icon: 'call' },
  { type: 'email', label: 'Email', icon: 'mail' },
  { type: 'date', label: 'Tanggal', icon: 'calendar_month' },
  { type: 'select', label: 'Pilihan Dropdown', icon: 'arrow_drop_down_circle' },
  { type: 'radio', label: 'Pilihan Tunggal (Radio)', icon: 'radio_button_checked' },
  { type: 'checkbox', label: 'Kotak Centang (Banyak Pilihan)', icon: 'check_box' },
  { type: 'file', label: 'Unggah File / Bukti', icon: 'upload_file' },
] as const;

// Sortable Item Component
function SortableFieldCard({
  field,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  field: FormFieldItem;
  index: number;
  onUpdate: (updated: FormFieldItem) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.field_key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [expanded, setExpanded] = useState(true);

  const handleOptionChange = (optIndex: number, text: string) => {
    const currentOptions = field.options || [];
    const updated = [...currentOptions];
    updated[optIndex] = { label: text, value: text.toLowerCase().replace(/\s+/g, '_') };
    onUpdate({ ...field, options: updated });
  };

  const addOption = () => {
    const currentOptions = field.options || [];
    const nextNum = currentOptions.length + 1;
    onUpdate({
      ...field,
      options: [
        ...currentOptions,
        { label: `Pilihan ${nextNum}`, value: `pilihan_${nextNum}` },
      ],
    });
  };

  const removeOption = (optIndex: number) => {
    const currentOptions = field.options || [];
    onUpdate({
      ...field,
      options: currentOptions.filter((_, i) => i !== optIndex),
    });
  };

  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  return (
    <div ref={setNodeRef} style={style} className="fb-field-card">
      <div className="fb-field-header">
        <button
          type="button"
          className="fb-drag-handle"
          {...attributes}
          {...listeners}
          title="Geser untuk mengubah urutan"
          aria-label="Geser urutan pertanyaan"
        >
          <Icon name="drag_indicator" size={20} aria-hidden />
        </button>

        <div className="fb-field-header-info" onClick={() => setExpanded(!expanded)}>
          <span className="fb-field-number">#{index + 1}</span>
          <span className="fb-field-header-label">{field.label || 'Pertanyaan Baru'}</span>
          <span className="fb-field-badge">{field.type}</span>
          {field.is_required && <span className="fb-req-badge">Wajib</span>}
        </div>

        <div className="fb-field-actions">
          <button
            type="button"
            className="fb-action-btn"
            onClick={onDuplicate}
            title="Duplikat Pertanyaan"
            aria-label="Duplikat pertanyaan"
          >
            <Icon name="content_copy" size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="fb-action-btn fb-btn-delete"
            onClick={onDelete}
            title="Hapus Pertanyaan"
            aria-label="Hapus pertanyaan"
          >
            <Icon name="delete" size={18} aria-hidden />
          </button>
          <button
            type="button"
            className="fb-action-btn"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Kecilkan' : 'Perluas'}
          >
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} aria-hidden />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fb-field-body">
          <div className="fb-form-row">
            <div className="fb-form-group fb-col-8">
              <label className="fb-label">Pertanyaan / Label</label>
              <input
                type="text"
                className="fb-input"
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                placeholder="Contoh: Pekerjaan Suami saat ini"
              />
            </div>

            <div className="fb-form-group fb-col-4">
              <label className="fb-label">Tipe Isian</label>
              <select
                className="fb-select"
                value={field.type}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  const needsOptions = ['select', 'radio', 'checkbox'].includes(newType);
                  onUpdate({
                    ...field,
                    type: newType,
                    options: needsOptions && (!field.options || field.options.length === 0)
                      ? [
                          { label: 'Opsi 1', value: 'opsi_1' },
                          { label: 'Opsi 2', value: 'opsi_2' },
                        ]
                      : field.options,
                  });
                }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fb-form-row">
            <div className="fb-form-group fb-col-6">
              <label className="fb-label">Teks Placeholder (Opsional)</label>
              <input
                type="text"
                className="fb-input"
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
                placeholder="Teks petunjuk di dalam kotak isian"
              />
            </div>

            <div className="fb-form-group fb-col-6">
              <label className="fb-label">Teks Bantuan (Keterangan di Bawah)</label>
              <input
                type="text"
                className="fb-input"
                value={field.help_text || ''}
                onChange={(e) => onUpdate({ ...field, help_text: e.target.value })}
                placeholder="Contoh: Jika belum bekerja, isi wiraswasta"
              />
            </div>
          </div>

          {/* Options Builder (for select, radio, checkbox) */}
          {hasOptions && (
            <div className="fb-options-section">
              <label className="fb-label">Daftar Pilihan Jawaban</label>
              <div className="fb-options-list">
                {(field.options || []).map((opt, optIdx) => (
                  <div key={optIdx} className="fb-option-row">
                    <Icon
                      name={
                        field.type === 'radio'
                          ? 'radio_button_unchecked'
                          : field.type === 'checkbox'
                          ? 'check_box_outline_blank'
                          : 'format_list_bulleted'
                      }
                      size={18}
                      className="fb-opt-icon"
                      aria-hidden
                    />
                    <input
                      type="text"
                      className="fb-input fb-opt-input"
                      value={opt.label}
                      onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                      placeholder={`Pilihan ${optIdx + 1}`}
                    />
                    {(field.options?.length || 0) > 1 && (
                      <button
                        type="button"
                        className="fb-opt-del-btn"
                        onClick={() => removeOption(optIdx)}
                        aria-label="Hapus pilihan ini"
                      >
                        <Icon name="close" size={16} aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="fb-add-opt-btn" onClick={addOption}>
                <Icon name="add" size={16} aria-hidden />
                Tambah Pilihan
              </button>
            </div>
          )}

          <div className="fb-field-footer">
            <label className="fb-checkbox-label">
              <input
                type="checkbox"
                checked={field.is_required || false}
                onChange={(e) => onUpdate({ ...field, is_required: e.target.checked })}
              />
              <span>Pertanyaan Wajib Diisi</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function FormBuilder({
  eventId,
  eventSlug,
  eventTitle,
  initialFields,
  registrationCount,
  initialStatus = 'draft',
}: FormBuilderProps) {
  const [fields, setFields] = useState<FormFieldItem[]>(initialFields);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [eventStatus, setEventStatus] = useState<string>(initialStatus);
  const [isOpeningReg, setIsOpeningReg] = useState(false);

  const handleOpenRegistration = async () => {
    if (!confirm('Buka pendaftaran untuk kelas ini sekarang? Form pendaftaran akan langsung aktif untuk calon peserta.')) {
      return;
    }

    setIsOpeningReg(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuka pendaftaran');

      setEventStatus('open');
      alert('Pendaftaran kelas berhasil dibuka! Calon peserta sudah dapat mendaftar.');

      // Update any parent banner/buttons if present in DOM
      const banner = document.getElementById('draft-banner');
      if (banner) banner.style.display = 'none';
      const topBtn = document.getElementById('btn-top-open-reg');
      if (topBtn) {
        topBtn.outerHTML = '<span class="status-pill-open"><span class="material-symbols-outlined">check_circle</span> Pendaftaran Aktif</span>';
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat membuka pendaftaran.');
    } finally {
      setIsOpeningReg(false);
    }
  };

  const isInitialMount = useRef(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle Drag End
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.field_key === active.id);
        const newIndex = items.findIndex((i) => i.field_key === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, idx) => ({ ...item, sort_order: idx }));
      });
      setSaveStatus('dirty');
    }
  };

  // Add new field
  const addField = (type: FormFieldItem['type']) => {
    const nextNum = fields.length + 1;
    const key = `custom_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newField: FormFieldItem = {
      field_key: key,
      label: `Pertanyaan Baru ${nextNum}`,
      type,
      placeholder: '',
      help_text: '',
      is_required: false,
      sort_order: fields.length,
      options: ['select', 'radio', 'checkbox'].includes(type)
        ? [
            { label: 'Opsi 1', value: 'opsi_1' },
            { label: 'Opsi 2', value: 'opsi_2' },
          ]
        : null,
    };
    setFields((prev) => [...prev, newField]);
    setShowTypeMenu(false);
    setSaveStatus('dirty');
  };

  // Duplicate field
  const duplicateField = (index: number) => {
    const target = fields[index];
    const key = `custom_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: FormFieldItem = {
      ...target,
      id: undefined,
      field_key: key,
      label: `${target.label} (Salinan)`,
      sort_order: index + 1,
    };
    const nextList = [...fields];
    nextList.splice(index + 1, 0, duplicated);
    setFields(nextList.map((f, i) => ({ ...f, sort_order: i })));
    setSaveStatus('dirty');
  };

  // Delete field
  const deleteField = (index: number) => {
    if (confirm('Hapus pertanyaan ini?')) {
      const nextList = fields.filter((_, i) => i !== index);
      setFields(nextList.map((f, i) => ({ ...f, sort_order: i })));
      setSaveStatus('dirty');
    }
  };

  // Update single field
  const updateField = (index: number, updated: FormFieldItem) => {
    const nextList = [...fields];
    nextList[index] = updated;
    setFields(nextList);
    setSaveStatus('dirty');
  };

  // Auto-save debounce effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}/form-save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields }),
        });
        if (!res.ok) throw new Error('Gagal menyimpan formulir');
        setSaveStatus('saved');
      } catch (e) {
        console.error('Auto-save error:', e);
        setSaveStatus('dirty');
      }
    }, 1000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fields, eventId]);

  // Copy public form link
  const copyFormLink = async () => {
    const origin = window.location.origin;
    const formUrl = `${origin}/daftar/${eventSlug}`;
    await navigator.clipboard.writeText(formUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="fb-container">
      {/* Top action bar */}
      <div className="fb-toolbar">
        <div className="fb-toolbar-left">
          <div className="fb-save-status">
            {saveStatus === 'saved' && (
              <span className="fb-status-badge fb-status-saved">
                <Icon name="check_circle" size={16} aria-hidden />
                Tersimpan
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="fb-status-badge fb-status-saving">
                <Icon name="sync" size={16} className="spin-icon" aria-hidden />
                Menyimpan...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="fb-status-badge fb-status-dirty">
                <Icon name="warning" size={16} aria-hidden />
                Belum tersimpan
              </span>
            )}
          </div>

          {registrationCount > 0 && (
            <div className="fb-reg-warning" title="Formulir telah diisi peserta">
              <Icon name="info" size={16} aria-hidden />
              <span>Event ini memiliki {registrationCount} pendaftar. Snapshot form pendaftar lama tetap aman.</span>
            </div>
          )}
        </div>

        <div className="fb-toolbar-right">
          {eventStatus !== 'open' ? (
            <button
              type="button"
              className="btn btn-primary btn-sm btn-open-reg"
              onClick={handleOpenRegistration}
              disabled={isOpeningReg}
              title="Buka pendaftaran agar formulir dapat diakses oleh publik"
            >
              <Icon
                name={isOpeningReg ? 'sync' : 'rocket_launch'}
                size={18}
                className={isOpeningReg ? 'spin-icon' : ''}
                aria-hidden
              />
              <span>{isOpeningReg ? 'Membuka...' : 'Buka Pendaftaran'}</span>
            </button>
          ) : (
            <span className="fb-reg-open-pill" title="Pendaftaran kelas ini aktif dan dapat diisi oleh peserta">
              <Icon name="check_circle" size={16} aria-hidden />
              <span>Pendaftaran Dibuka</span>
            </span>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={copyFormLink}
          >
            <Icon name={copySuccess ? 'check' : 'link'} size={18} aria-hidden />
            {copySuccess ? 'Tautan Disalin!' : 'Salin Tautan Form'}
          </button>

          <a
            href={`/daftar/${eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Icon name="open_in_new" size={18} aria-hidden />
            Buka Form Publik
          </a>
        </div>
      </div>

      {/* Mobile view switch tabs */}
      <div className="fb-mobile-tabs">
        <button
          type="button"
          className={`fb-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <Icon name="edit_note" size={18} aria-hidden />
          Editor Form
        </button>
        <button
          type="button"
          className={`fb-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Icon name="visibility" size={18} aria-hidden />
          Pratinjau Langsung
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="fb-split-layout">
        {/* LEFT COLUMN: Builder Editor */}
        <div className={`fb-editor-pane ${activeTab === 'editor' ? 'pane-active' : ''}`}>
          {/* Card 1: Core Fields (Locked) */}
          <div className="fb-locked-card">
            <div className="fb-locked-header">
              <div className="fb-locked-title-row">
                <Icon name="lock" size={20} className="fb-lock-icon" aria-hidden />
                <div>
                  <h4 className="fb-locked-title">Pertanyaan Inti Pasangan (Terkunci)</h4>
                  <p className="fb-locked-desc">
                    Field ini selalu ada di bagian paling atas: Nama Suami, Nama Istri, WhatsApp, dan Email.
                  </p>
                </div>
              </div>
            </div>
            <div className="fb-locked-tags">
              <span className="fb-tag"><Icon name="person" size={14} aria-hidden /> Nama Suami *</span>
              <span className="fb-tag"><Icon name="person" size={14} aria-hidden /> Nama Istri *</span>
              <span className="fb-tag"><Icon name="chat" size={14} aria-hidden /> WhatsApp *</span>
              <span className="fb-tag"><Icon name="mail" size={14} aria-hidden /> Email</span>
            </div>
          </div>

          {/* Card 2: Custom Questions with DnD */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.field_key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="fb-fields-list">
                {fields.map((field, idx) => (
                  <SortableFieldCard
                    key={field.field_key}
                    field={field}
                    index={idx}
                    onUpdate={(updated) => updateField(idx, updated)}
                    onDelete={() => deleteField(idx)}
                    onDuplicate={() => duplicateField(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Question Button & Menu */}
          <div className="fb-add-bar">
            {!showTypeMenu ? (
              <button
                type="button"
                className="fb-btn-add-question"
                onClick={() => setShowTypeMenu(true)}
              >
                <Icon name="add_circle" size={20} aria-hidden />
                Tambah Pertanyaan Baru
              </button>
            ) : (
              <div className="fb-type-menu-card">
                <div className="fb-type-menu-header">
                  <span>Pilih Tipe Pertanyaan:</span>
                  <button
                    type="button"
                    className="fb-close-menu-btn"
                    onClick={() => setShowTypeMenu(false)}
                    aria-label="Tutup menu"
                  >
                    <Icon name="close" size={18} aria-hidden />
                  </button>
                </div>
                <div className="fb-type-grid">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      className="fb-type-choice"
                      onClick={() => addField(t.type)}
                    >
                      <Icon name={t.icon} size={20} className="fb-choice-icon" aria-hidden />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Preview */}
        <div className={`fb-preview-pane ${activeTab === 'preview' ? 'pane-active' : ''}`}>
          <div className="fb-preview-sticky">
            <div className="fb-preview-header">
              <span className="material-symbols-outlined" aria-hidden="true">preview</span>
              <span>Pratinjau Formulir Peserta</span>
            </div>
            <div className="fb-preview-frame">
              <FormRenderer
                eventTitle={eventTitle}
                fields={fields}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fb-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1300px;
          margin: 0 auto;
        }

        .fb-toolbar {
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

        .fb-toolbar-left, .fb-toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .fb-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
        }

        .fb-status-saved { background: var(--ok-bg); color: var(--ok); }
        .fb-status-saving { background: var(--pink-50); color: var(--pink-500); }
        .fb-status-dirty { background: var(--warn-bg); color: var(--warn); }

        .fb-reg-open-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
        }

        .btn-open-reg {
          background: var(--pink-500);
          color: var(--white);
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(224, 76, 136, 0.2);
          transition: all 150ms ease;
        }

        .btn-open-reg:hover:not(:disabled) {
          background: var(--pink-600);
          box-shadow: 0 2px 4px rgba(224, 76, 136, 0.3);
        }

        .btn-open-reg:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        .fb-reg-warning {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--ink-600);
          background: var(--pink-50);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }

        .fb-mobile-tabs {
          display: none;
          gap: 8px;
        }

        .fb-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-600);
          cursor: pointer;
        }

        .fb-tab-btn.active {
          background: var(--pink-50);
          color: var(--pink-500);
          border-color: var(--pink-400);
          font-weight: 600;
        }

        .fb-split-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }

        .fb-editor-pane {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Locked Core Card */
        .fb-locked-card {
          background: #faf8f9;
          border: 1px dashed var(--pink-200);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
        }

        .fb-locked-title-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .fb-lock-icon {
          color: var(--pink-500);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .fb-locked-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 2px 0;
        }

        .fb-locked-desc {
          font-size: 12px;
          color: var(--ink-600);
          margin: 0;
        }

        .fb-locked-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .fb-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--white);
          border: 1px solid var(--line);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-600);
        }

        /* Field Cards */
        .fb-fields-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .fb-field-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          transition: border-color 150ms ease;
        }

        .fb-field-card:hover {
          border-color: var(--pink-200);
        }

        .fb-field-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: var(--white);
          border-bottom: 1px solid var(--line);
          gap: 12px;
        }

        .fb-drag-handle {
          background: none;
          border: none;
          cursor: grab;
          color: var(--ink-400);
          display: flex;
          align-items: center;
          padding: 4px;
        }
        .fb-drag-handle:active { cursor: grabbing; }

        .fb-field-header-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .fb-field-number {
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-400);
        }

        .fb-field-header-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-900);
        }

        .fb-field-badge {
          font-size: 11px;
          background: var(--pink-50);
          color: var(--pink-600);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .fb-req-badge {
          font-size: 11px;
          background: var(--danger-bg);
          color: var(--danger);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .fb-field-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fb-action-btn {
          background: none;
          border: none;
          color: var(--ink-400);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }

        .fb-action-btn:hover {
          background: var(--pink-50);
          color: var(--ink-900);
        }

        .fb-btn-delete:hover {
          background: var(--danger-bg);
          color: var(--danger);
        }

        .fb-field-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .fb-form-row {
          display: flex;
          gap: 12px;
        }

        .fb-col-8 { flex: 8; }
        .fb-col-4 { flex: 4; }
        .fb-col-6 { flex: 6; }

        .fb-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .fb-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--ink-900);
        }

        .fb-input, .fb-select {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 150ms ease;
        }

        .fb-input:focus, .fb-select:focus {
          border-color: var(--pink-400);
          box-shadow: 0 0 0 2px var(--pink-100);
        }

        /* Options */
        .fb-options-section {
          background: #faf8f9;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fb-options-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fb-option-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fb-opt-icon { color: var(--ink-400); }

        .fb-opt-input {
          height: 36px;
          font-size: 13px;
        }

        .fb-opt-del-btn {
          background: none;
          border: none;
          color: var(--ink-400);
          cursor: pointer;
          padding: 4px;
          display: flex;
        }
        .fb-opt-del-btn:hover { color: var(--danger); }

        .fb-add-opt-btn {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px dashed var(--pink-400);
          color: var(--pink-500);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }

        .fb-field-footer {
          padding-top: 10px;
          border-top: 1px solid var(--line);
        }

        .fb-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }

        /* Add Bar */
        .fb-btn-add-question {
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

        .fb-btn-add-question:hover {
          background: var(--pink-50);
          transform: translateY(-1px);
        }

        .fb-type-menu-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 16px;
          box-shadow: var(--shadow-md);
        }

        .fb-type-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-900);
          margin-bottom: 12px;
        }

        .fb-close-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--ink-400);
        }

        .fb-type-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .fb-type-choice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #faf8f9;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 13px;
          color: var(--ink-900);
          cursor: pointer;
          text-align: left;
          transition: all 150ms ease;
        }

        .fb-type-choice:hover {
          background: var(--pink-50);
          border-color: var(--pink-400);
          color: var(--pink-500);
        }

        .fb-choice-icon { color: var(--pink-500); }

        /* Preview Pane */
        .fb-preview-sticky {
          position: sticky;
          top: 80px;
        }

        .fb-preview-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-600);
          margin-bottom: 12px;
          padding: 0 4px;
        }

        .fb-preview-frame {
          border: 2px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 20px;
          background: #fdfafc;
          max-height: calc(100vh - 140px);
          overflow-y: auto;
        }

        @media (max-width: 960px) {
          .fb-mobile-tabs { display: flex; }
          .fb-split-layout { grid-template-columns: 1fr; }
          .fb-editor-pane, .fb-preview-pane { display: none; }
          .pane-active { display: flex !important; }
          .fb-preview-sticky { position: static; }
          .fb-preview-frame { max-height: none; }
        }
      `}</style>
    </div>
  );
}
