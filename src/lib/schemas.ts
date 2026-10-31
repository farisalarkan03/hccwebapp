// Zod schemas for HCC - used on both client and server
import { z } from 'zod';

// Normalize Indonesian WhatsApp number to 62xxxxxxxxxx format
export function normalizeWhatsApp(raw: string): string {
  let num = raw.replace(/[\s\-().+]/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  return num;
}

// WhatsApp validator
const waSchema = z
  .string()
  .min(8, 'Nomor WhatsApp tidak valid')
  .transform(normalizeWhatsApp)
  .refine((v) => /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid');

// Registration schema
export const RegisterSchema = z.object({
  event_id: z.string().uuid(),
  husband_name: z.string().min(2, 'Nama suami minimal 2 karakter').max(100),
  wife_name: z.string().min(2, 'Nama istri minimal 2 karakter').max(100),
  whatsapp: waSchema,
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  answers: z.record(z.unknown()).default({}),
  turnstile_token: z.string().min(1, 'Verifikasi captcha diperlukan'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// Admin login schema
export const AdminLoginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  turnstile_token: z.string().min(1, 'Verifikasi captcha diperlukan'),
});

export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

// QRClass login schema
export const QrClassLoginSchema = z.object({
  event_id: z.string().min(1, 'ID Event wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
  staff_name: z.string().optional(),
  turnstile_token: z.string().min(1, 'Verifikasi captcha diperlukan'),
});

export type QrClassLoginInput = z.infer<typeof QrClassLoginSchema>;

// Event schema (for admin forms)
export const EventSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda minus'),
  description: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  date_start: z.string().datetime({ offset: true }),
  date_end: z.string().datetime({ offset: true }).optional().nullable(),
  location: z.string().min(2, 'Lokasi wajib diisi'),
  location_map_url: z.string().url().optional().or(z.literal('')),
  price_per_couple: z.coerce.number().min(0),
  quota: z.coerce.number().int().positive().optional().nullable(),
  waitlist_enabled: z.boolean().default(false),
  allow_duplicate_wa: z.boolean().default(false),
  payment_deadline_hours: z.coerce.number().int().min(1).max(168).default(24),
  status: z.enum(['draft', 'open', 'closed', 'done']).default('draft'),
  success_message: z.string().optional(),
  wa_to_admin_template: z.string().optional(),
  wa_to_user_template: z.string().optional(),
  show_on_landing: z.boolean().default(false),
  payment_account_ids: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 rekening'),
  confirmator_ids: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 admin konfirmator'),
  primary_confirmator_id: z.string().uuid().optional(),
});

export type EventInput = z.infer<typeof EventSchema>;

// Form field schema
export const FormFieldSchema = z.object({
  field_key: z.string().regex(/^[a-z0-9_]+$/, 'Field key hanya huruf kecil, angka, underscore'),
  label: z.string().min(1, 'Label wajib diisi'),
  type: z.enum(['text', 'textarea', 'number', 'phone', 'email', 'date', 'select', 'radio', 'checkbox', 'file']),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
  is_required: z.boolean().default(false),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  validation: z.record(z.unknown()).optional(),
  sort_order: z.number().int().default(0),
});

export type FormFieldInput = z.infer<typeof FormFieldSchema>;

// Confirm payment schema
export const ConfirmPaymentSchema = z.object({
  registration_id: z.string().uuid(),
  note: z.string().optional(),
});

// Payment account schema
export const PaymentAccountSchema = z.object({
  bank_name: z.string().min(1, 'Nama bank wajib diisi'),
  account_number: z.string().min(5, 'Nomor rekening tidak valid'),
  account_name: z.string().min(2, 'Nama pemilik rekening wajib diisi'),
});
