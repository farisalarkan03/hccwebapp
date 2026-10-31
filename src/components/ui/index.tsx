import React from 'react';
import { Icon } from './Icon';

// =====================
// Button Component
// =====================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  as?: 'button' | 'a';
  href?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  as: Tag = 'button',
  href,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
        </span>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <Icon name={icon} size={size === 'sm' ? 16 : 20} aria-hidden />
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <Icon name={icon} size={size === 'sm' ? 16 : 20} aria-hidden />
      )}
    </>
  );

  if (Tag === 'a' && href) {
    return (
      <a href={href} className={classes} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

// =====================
// Input Component
// =====================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  helpText,
  fullWidth = true,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  return (
    <div className={`field ${fullWidth ? 'field-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {props.required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`field-input ${error ? 'field-input-error' : ''}`}
        aria-describedby={[error ? errorId : '', helpText ? helpId : ''].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {helpText && !error && (
        <p id={helpId} className="field-help">{helpText}</p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          <Icon name="error" size={14} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

// =====================
// Textarea Component
// =====================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  fullWidth?: boolean;
}

export function Textarea({
  label,
  error,
  helpText,
  fullWidth = true,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`field ${fullWidth ? 'field-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {props.required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={`field-input field-textarea ${error ? 'field-input-error' : ''}`}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {helpText && !error && <p className="field-help">{helpText}</p>}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          <Icon name="error" size={14} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

// =====================
// Select Component
// =====================

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  fullWidth?: boolean;
}

export function Select({
  label,
  error,
  helpText,
  options,
  placeholder,
  fullWidth = true,
  id,
  className = '',
  ...props
}: SelectProps) {
  const inputId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`field ${fullWidth ? 'field-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {props.required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className="field-select-wrap">
        <select
          id={inputId}
          className={`field-input field-select ${error ? 'field-input-error' : ''}`}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <Icon name="expand_more" size={20} className="field-select-icon" aria-hidden />
      </div>
      {helpText && !error && <p className="field-help">{helpText}</p>}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          <Icon name="error" size={14} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

// =====================
// Card Component
// =====================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  id?: string;
}

export function Card({ children, className = '', hoverable = false, onClick, id }: CardProps) {
  return (
    <div
      id={id}
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// =====================
// Badge Component
// =====================

type BadgeStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'waitlist' | 'hadir' | 'draft' | 'open' | 'closed' | 'done' | 'published';

const badgeLabels: Record<BadgeStatus, string> = {
  pending: 'Menunggu',
  paid: 'Lunas',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  waitlist: 'Antrean',
  hadir: 'Hadir',
  draft: 'Draft',
  open: 'Buka',
  closed: 'Tutup',
  done: 'Selesai',
  published: 'Diterbitkan',
};

const badgeVariants: Record<BadgeStatus, string> = {
  pending: 'badge-warn',
  paid: 'badge-ok',
  expired: 'badge-neutral',
  cancelled: 'badge-neutral',
  waitlist: 'badge-pink',
  hadir: 'badge-ok',
  draft: 'badge-neutral',
  open: 'badge-ok',
  closed: 'badge-neutral',
  done: 'badge-neutral',
  published: 'badge-ok',
};

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

export function Badge({ status, label, className = '' }: BadgeProps) {
  return (
    <span className={`badge ${badgeVariants[status]} ${className}`}>
      {label ?? badgeLabels[status]}
    </span>
  );
}

// =====================
// Skeleton Component
// =====================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, rounded = false, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded ? 'skeleton-rounded' : ''} ${className}`}
      style={{ width, height }}
      aria-busy="true"
      aria-label="Memuat..."
    />
  );
}

// =====================
// Empty State Component
// =====================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={48} className="empty-state-icon" aria-hidden />
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

// =====================
// Toast Component
// =====================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
}

const toastIcons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export function Toast({ type, message, onClose }: ToastProps) {
  return (
    <div className={`toast toast-${type}`} role="alert" aria-live="polite">
      <Icon name={toastIcons[type]} size={20} className="toast-icon" aria-hidden />
      <span className="toast-message">{message}</span>
      {onClose && (
        <button
          className="toast-close"
          onClick={onClose}
          aria-label="Tutup notifikasi"
        >
          <Icon name="close" size={18} aria-hidden />
        </button>
      )}
    </div>
  );
}
