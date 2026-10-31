// Supabase client helpers
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Public (anon) client - for use in browser/components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client factory using service role key
// ONLY to be used in server-side code (Pages Functions, Astro server routes)
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the client
export function createServiceClient() {
  const serviceRoleKey =
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Types for database rows
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      admins: {
        Row: {
          id: string;
          name: string;
          email: string;
          whatsapp: string;
          role: 'super_admin' | 'admin';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admins']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['admins']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          category_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          flyer_url: string | null;
          date_start: string;
          date_end: string | null;
          location: string;
          location_map_url: string | null;
          price_per_couple: number;
          quota: number | null;
          waitlist_enabled: boolean;
          allow_duplicate_wa: boolean;
          payment_deadline_hours: number;
          status: 'draft' | 'open' | 'closed' | 'done';
          success_message: string | null;
          wa_to_admin_template: string | null;
          wa_to_user_template: string | null;
          show_on_landing: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          reg_code: string;
          ticket_token: string;
          husband_name: string;
          wife_name: string;
          whatsapp: string;
          email: string | null;
          answers: Record<string, unknown>;
          form_snapshot: Record<string, string>;
          payment_status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'waitlist';
          payment_proof_url: string | null;
          payment_confirmed_at: string | null;
          payment_confirmed_by: string | null;
          payment_note: string | null;
          payment_deadline: string | null;
          wa_sent_at: string | null;
          confirmed_by_admin_id: string | null;
          checkin_at: string | null;
          checkin_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      form_fields: {
        Row: {
          id: string;
          event_id: string;
          field_key: string;
          label: string;
          type: 'text' | 'textarea' | 'number' | 'phone' | 'email' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
          placeholder: string | null;
          help_text: string | null;
          is_required: boolean;
          options: { label: string; value: string }[] | null;
          validation: Record<string, unknown> | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
      };
      site_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
        };
      };
      pages: {
        Row: {
          id: string;
          title: string;
          slug: string;
          summary: string | null;
          cover_url: string | null;
          blocks: unknown[];
          status: 'draft' | 'published';
          related_event_id: string | null;
          show_on_landing: boolean;
          sort_order: number;
          published_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
