import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

export interface FormFieldItem {
  id?: string;
  field_key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'phone' | 'email' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  placeholder?: string | null;
  help_text?: string | null;
  is_required?: boolean;
  options?: { label: string; value: string }[] | null;
  validation?: Record<string, unknown> | null;
  sort_order?: number;
}

export interface FormRendererProps {
  eventTitle: string;
  fields: FormFieldItem[];
  isPreview?: boolean;
  onSubmit?: (values: Record<string, any>) => void;
  submitting?: boolean;
  errorMessage?: string | null;
}

export function FormRenderer({
  eventTitle,
  fields,
  isPreview = false,
  onSubmit,
  submitting = false,
  errorMessage,
}: FormRendererProps) {
  // Form states
  const [formData, setFormData] = useState<Record<string, any>>({
    husband_name: '',
    wife_name: '',
    whatsapp: '',
    email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleCheckboxChange = (key: string, optionValue: string, checked: boolean) => {
    const current = (formData[key] as string[]) || [];
    let updated: string[];
    if (checked) {
      updated = [...current, optionValue];
    } else {
      updated = current.filter((v) => v !== optionValue);
    }
    handleChange(key, updated);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Core validation
    if (!formData.husband_name?.trim()) newErrors.husband_name = 'Nama lengkap suami wajib diisi';
    if (!formData.wife_name?.trim()) newErrors.wife_name = 'Nama lengkap istri wajib diisi';
    if (!formData.whatsapp?.trim()) {
      newErrors.whatsapp = 'Nomor WhatsApp aktif wajib diisi';
    } else {
      const cleanWa = formData.whatsapp.replace(/\D/g, '');
      if (cleanWa.length < 9 || cleanWa.length > 15) {
        newErrors.whatsapp = 'Nomor WhatsApp tidak valid (contoh: 08123456789)';
      }
    }

    // Dynamic fields validation
    fields.forEach((f) => {
      if (f.is_required) {
        const val = formData[f.field_key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[f.field_key] = `${f.label} wajib diisi`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      alert('Ini adalah pratinjau form. Tombol kirim tidak aktif.');
      return;
    }
    if (!validate()) return;
    if (onSubmit) onSubmit(formData);
  };

  // Sort fields by sort_order
  const sortedFields = [...fields].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <form onSubmit={handleSubmit} className="renderer-form" noValidate>
      {/* Alert Error */}
      {errorMessage && (
        <div className="renderer-alert" role="alert">
          <Icon name="error" size={20} aria-hidden />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Core Fields Card */}
      <div className="renderer-card">
        <div className="renderer-card-header">
          <Icon name="favorite" size={22} className="renderer-header-icon" aria-hidden />
          <div>
            <h4 className="renderer-section-title">Data Pasangan (Couple)</h4>
            <p className="renderer-section-desc">1 Pendaftaran berlaku untuk 1 couple (suami dan istri).</p>
          </div>
        </div>

        <div className="renderer-card-body">
          <div className="renderer-field">
            <label htmlFor="husband_name" className="renderer-label">
              Nama Lengkap Suami <span className="renderer-required">*</span>
            </label>
            <input
              type="text"
              id="husband_name"
              className={`renderer-input ${errors.husband_name ? 'renderer-input-error' : ''}`}
              placeholder="Contoh: Muhammad Faris Al Arkan"
              value={formData.husband_name || ''}
              onChange={(e) => handleChange('husband_name', e.target.value)}
              disabled={submitting}
              required
            />
            {errors.husband_name && (
              <span className="renderer-error-text">
                <Icon name="error" size={14} aria-hidden />
                {errors.husband_name}
              </span>
            )}
          </div>

          <div className="renderer-field">
            <label htmlFor="wife_name" className="renderer-label">
              Nama Lengkap Istri <span className="renderer-required">*</span>
            </label>
            <input
              type="text"
              id="wife_name"
              className={`renderer-input ${errors.wife_name ? 'renderer-input-error' : ''}`}
              placeholder="Contoh: Aisyah Nurul Rahmah"
              value={formData.wife_name || ''}
              onChange={(e) => handleChange('wife_name', e.target.value)}
              disabled={submitting}
              required
            />
            {errors.wife_name && (
              <span className="renderer-error-text">
                <Icon name="error" size={14} aria-hidden />
                {errors.wife_name}
              </span>
            )}
          </div>

          <div className="renderer-field">
            <label htmlFor="whatsapp" className="renderer-label">
              Nomor WhatsApp Aktif <span className="renderer-required">*</span>
            </label>
            <input
              type="tel"
              id="whatsapp"
              className={`renderer-input ${errors.whatsapp ? 'renderer-input-error' : ''}`}
              placeholder="08xxxxxxxxxx"
              value={formData.whatsapp || ''}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              disabled={submitting}
              required
            />
            <span className="renderer-help">
              Digunakan untuk konfirmasi pembayaran dan pengiriman e-tiket QR hari-H.
            </span>
            {errors.whatsapp && (
              <span className="renderer-error-text">
                <Icon name="error" size={14} aria-hidden />
                {errors.whatsapp}
              </span>
            )}
          </div>

          <div className="renderer-field">
            <label htmlFor="email" className="renderer-label">
              Email (Opsional)
            </label>
            <input
              type="email"
              id="email"
              className="renderer-input"
              placeholder="nama@email.com"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Custom Questions Card */}
      {sortedFields.length > 0 && (
        <div className="renderer-card">
          <div className="renderer-card-header">
            <Icon name="article" size={22} className="renderer-header-icon" aria-hidden />
            <div>
              <h4 className="renderer-section-title">Informasi Tambahan</h4>
              <p className="renderer-section-desc">Mohon lengkapi kuesioner persiapan kelas di bawah ini.</p>
            </div>
          </div>

          <div className="renderer-card-body">
            {sortedFields.map((field) => {
              const fieldError = errors[field.field_key];

              return (
                <div key={field.field_key} className="renderer-field">
                  <label htmlFor={field.field_key} className="renderer-label">
                    {field.label}
                    {field.is_required && <span className="renderer-required"> *</span>}
                  </label>

                  {/* Text Input */}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      id={field.field_key}
                      className={`renderer-input ${fieldError ? 'renderer-input-error' : ''}`}
                      placeholder={field.placeholder || ''}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Textarea */}
                  {field.type === 'textarea' && (
                    <textarea
                      id={field.field_key}
                      className={`renderer-input renderer-textarea ${fieldError ? 'renderer-input-error' : ''}`}
                      placeholder={field.placeholder || ''}
                      rows={3}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Number */}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      id={field.field_key}
                      className={`renderer-input ${fieldError ? 'renderer-input-error' : ''}`}
                      placeholder={field.placeholder || ''}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Phone */}
                  {field.type === 'phone' && (
                    <input
                      type="tel"
                      id={field.field_key}
                      className={`renderer-input ${fieldError ? 'renderer-input-error' : ''}`}
                      placeholder={field.placeholder || '08xxxxxxxxxx'}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Email */}
                  {field.type === 'email' && (
                    <input
                      type="email"
                      id={field.field_key}
                      className={`renderer-input ${fieldError ? 'renderer-input-error' : ''}`}
                      placeholder={field.placeholder || 'nama@email.com'}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Date */}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      id={field.field_key}
                      className={`renderer-input ${fieldError ? 'renderer-input-error' : ''}`}
                      value={formData[field.field_key] || ''}
                      onChange={(e) => handleChange(field.field_key, e.target.value)}
                      disabled={submitting}
                    />
                  )}

                  {/* Select */}
                  {field.type === 'select' && (
                    <div className="renderer-select-wrap">
                      <select
                        id={field.field_key}
                        className={`renderer-input renderer-select ${fieldError ? 'renderer-input-error' : ''}`}
                        value={formData[field.field_key] || ''}
                        onChange={(e) => handleChange(field.field_key, e.target.value)}
                        disabled={submitting}
                      >
                        <option value="">{field.placeholder || '-- Pilih Salah Satu --'}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Icon name="expand_more" size={20} className="renderer-select-icon" aria-hidden />
                    </div>
                  )}

                  {/* Radio */}
                  {field.type === 'radio' && (
                    <div className="renderer-options-group">
                      {field.options?.map((opt) => (
                        <label key={opt.value} className="renderer-option-item">
                          <input
                            type="radio"
                            name={field.field_key}
                            value={opt.value}
                            checked={formData[field.field_key] === opt.value}
                            onChange={(e) => handleChange(field.field_key, e.target.value)}
                            disabled={submitting}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.type === 'checkbox' && (
                    <div className="renderer-options-group">
                      {field.options?.map((opt) => {
                        const checked = ((formData[field.field_key] as string[]) || []).includes(opt.value);
                        return (
                          <label key={opt.value} className="renderer-option-item">
                            <input
                              type="checkbox"
                              name={field.field_key}
                              value={opt.value}
                              checked={checked}
                              onChange={(e) => handleCheckboxChange(field.field_key, opt.value, e.target.checked)}
                              disabled={submitting}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* File */}
                  {field.type === 'file' && (
                    <div className="renderer-file-input">
                      <input
                        type="file"
                        id={field.field_key}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleChange(field.field_key, file.name);
                        }}
                        disabled={submitting}
                      />
                    </div>
                  )}

                  {field.help_text && <span className="renderer-help">{field.help_text}</span>}
                  {fieldError && (
                    <span className="renderer-error-text">
                      <Icon name="error" size={14} aria-hidden />
                      {fieldError}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="renderer-submit-wrap">
        <button
          type="submit"
          className="renderer-submit-btn"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner-dot" aria-hidden="true"></span>
              Memproses Pendaftaran...
            </>
          ) : (
            <>
              Daftar Sekarang
              <Icon name="arrow_forward" size={18} aria-hidden />
            </>
          )}
        </button>
      </div>

      <style>{`
        .renderer-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .renderer-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--danger-bg);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
        }

        .renderer-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }

        .renderer-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line);
        }

        .renderer-header-icon {
          color: var(--pink-500);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .renderer-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-900);
          margin: 0 0 2px 0;
        }

        .renderer-section-desc {
          font-size: 13px;
          color: var(--ink-600);
          margin: 0;
        }

        .renderer-card-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .renderer-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .renderer-label {
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-900);
        }

        .renderer-required {
          color: var(--danger);
        }

        .renderer-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border: 1px solid var(--line);
          border-radius: var(--radius-md);
          background: var(--white);
          color: var(--ink-900);
          font-family: inherit;
          font-size: 14px;
          transition: border-color 150ms ease, box-shadow 150ms ease;
          box-sizing: border-box;
          outline: none;
        }

        .renderer-input:focus {
          border-color: var(--pink-400);
          box-shadow: 0 0 0 3px var(--pink-100);
        }

        .renderer-input-error {
          border-color: var(--danger) !important;
        }

        .renderer-textarea {
          height: auto;
          min-height: 80px;
          padding: 10px 14px;
          resize: vertical;
        }

        .renderer-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .renderer-select {
          appearance: none;
          padding-right: 36px;
          cursor: pointer;
        }

        .renderer-select-icon {
          position: absolute;
          right: 12px;
          pointer-events: none;
          color: var(--ink-400);
        }

        .renderer-options-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 2px;
        }

        .renderer-option-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--ink-900);
          cursor: pointer;
        }

        .renderer-help {
          font-size: 12px;
          color: var(--ink-600);
        }

        .renderer-error-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--danger);
        }

        .renderer-submit-wrap {
          display: flex;
          justify-content: center;
          padding: 8px 0;
        }

        .renderer-submit-btn {
          width: 100%;
          height: 48px;
          background: var(--pink-500);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 150ms ease;
          box-shadow: var(--shadow-sm);
        }

        .renderer-submit-btn:hover:not(:disabled) {
          background: var(--pink-600);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }

        .renderer-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}
