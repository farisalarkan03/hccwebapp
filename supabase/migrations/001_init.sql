-- ============================================================
-- Happy Couple Class (HCC) - Initial Database Schema
-- Migration: 001_init.sql
-- ============================================================

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ENUMS
create type event_status as enum ('draft', 'open', 'closed', 'done');
create type payment_status as enum ('pending', 'paid', 'expired', 'cancelled', 'waitlist');
create type admin_role as enum ('super_admin', 'admin');
create type field_type as enum ('text', 'textarea', 'number', 'phone', 'email', 'date', 'select', 'radio', 'checkbox', 'file');
create type page_status as enum ('draft', 'published');

-- TABLES

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  whatsapp text not null,
  role admin_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payment_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  flyer_url text,
  date_start timestamptz not null,
  date_end timestamptz,
  location text not null,
  location_map_url text,
  price_per_couple numeric(12, 0) not null default 0,
  quota int,
  waitlist_enabled boolean not null default false,
  allow_duplicate_wa boolean not null default false,
  payment_deadline_hours int not null default 24,
  status event_status not null default 'draft',
  success_message text,
  wa_to_admin_template text,
  wa_to_user_template text,
  show_on_landing boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_payment_accounts (
  event_id uuid not null references events(id) on delete cascade,
  payment_account_id uuid not null references payment_accounts(id) on delete cascade,
  primary key (event_id, payment_account_id)
);

create table event_confirmators (
  event_id uuid not null references events(id) on delete cascade,
  admin_id uuid not null references admins(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (event_id, admin_id)
);

create table event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references events(id) on delete cascade,
  password_hash text not null,
  is_active boolean not null default true,
  locked_until timestamptz,
  failed_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table form_fields (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  field_key text not null,
  label text not null,
  type field_type not null default 'text',
  placeholder text,
  help_text text,
  is_required boolean not null default false,
  options jsonb,
  validation jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, field_key)
);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  reg_code text not null unique,
  ticket_token text not null unique,
  husband_name text not null,
  wife_name text not null,
  whatsapp text not null,
  email text,
  answers jsonb not null default '{}',
  form_snapshot jsonb not null default '{}',
  payment_status payment_status not null default 'pending',
  payment_proof_url text,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references admins(id),
  payment_note text,
  payment_deadline timestamptz,
  wa_sent_at timestamptz,
  confirmed_by_admin_id uuid references admins(id),
  checkin_at timestamptz,
  checkin_by text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checkin_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  registration_id uuid references registrations(id) on delete set null,
  ticket_token text,
  result text not null,
  checked_in_by text,
  created_at timestamptz not null default now()
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  cover_url text,
  blocks jsonb not null default '[]',
  status page_status not null default 'draft',
  related_event_id uuid references events(id) on delete set null,
  show_on_landing boolean not null default false,
  sort_order int not null default 0,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id) on delete set null,
  admin_name text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- INDEXES
create index idx_events_slug on events(slug) where deleted_at is null;
create index idx_events_status on events(status) where deleted_at is null;
create index idx_registrations_event_id on registrations(event_id) where deleted_at is null;
create index idx_registrations_ticket_token on registrations(ticket_token);
create index idx_registrations_whatsapp on registrations(event_id, whatsapp) where deleted_at is null;
create index idx_registrations_payment_status on registrations(event_id, payment_status) where deleted_at is null;
create index idx_checkin_logs_event_id on checkin_logs(event_id);
create index idx_pages_slug on pages(slug) where deleted_at is null;
create index idx_form_fields_event_id on form_fields(event_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);

-- FUNCTIONS

create or replace function generate_reg_code(p_event_id uuid)
returns text language plpgsql as $$
declare
  v_event_date date;
  v_count int;
begin
  select date_start::date into v_event_date from events where id = p_event_id;
  select count(*) + 1 into v_count from registrations where event_id = p_event_id;
  return 'HCC-' || to_char(v_event_date, 'YYYYMMDD') || '-' || lpad(v_count::text, 4, '0');
end;
$$;

create or replace function register_couple(
  p_event_id uuid,
  p_husband_name text,
  p_wife_name text,
  p_whatsapp text,
  p_email text,
  p_answers jsonb,
  p_form_snapshot jsonb
)
returns jsonb language plpgsql security definer as $$
declare
  v_event events%rowtype;
  v_current_count int;
  v_reg_code text;
  v_token text;
  v_reg_id uuid;
  v_status payment_status;
  v_deadline timestamptz;
  v_confirmator_wa text;
  v_account jsonb;
begin
  select * into v_event from events where id = p_event_id and deleted_at is null for update;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.status <> 'open' then raise exception 'EVENT_NOT_OPEN'; end if;

  if not v_event.allow_duplicate_wa then
    if exists (
      select 1 from registrations
      where event_id = p_event_id and whatsapp = p_whatsapp
        and payment_status not in ('expired', 'cancelled') and deleted_at is null
    ) then raise exception 'DUPLICATE_PHONE'; end if;
  end if;

  select count(*) into v_current_count from registrations
  where event_id = p_event_id and payment_status not in ('expired', 'cancelled') and deleted_at is null;

  if v_event.quota is not null and v_current_count >= v_event.quota then
    if v_event.waitlist_enabled then v_status := 'waitlist';
    else raise exception 'EVENT_FULL'; end if;
  else
    v_status := 'pending';
  end if;

  v_reg_code := generate_reg_code(p_event_id);
  v_token := replace(replace(replace(encode(gen_random_bytes(18), 'base64'), '+', 'A'), '/', 'B'), '=', 'C');
  if v_status = 'pending' then
    v_deadline := now() + (v_event.payment_deadline_hours || ' hours')::interval;
  end if;

  insert into registrations (event_id, reg_code, ticket_token, husband_name, wife_name, whatsapp, email, answers, form_snapshot, payment_status, payment_deadline, confirmed_by_admin_id)
  select p_event_id, v_reg_code, v_token, p_husband_name, p_wife_name, p_whatsapp, p_email, p_answers, p_form_snapshot, v_status, v_deadline, ec.admin_id
  from event_confirmators ec where ec.event_id = p_event_id and ec.is_primary = true limit 1
  returning id into v_reg_id;

  if v_reg_id is null then
    insert into registrations (event_id, reg_code, ticket_token, husband_name, wife_name, whatsapp, email, answers, form_snapshot, payment_status, payment_deadline)
    values (p_event_id, v_reg_code, v_token, p_husband_name, p_wife_name, p_whatsapp, p_email, p_answers, p_form_snapshot, v_status, v_deadline)
    returning id into v_reg_id;
  end if;

  select a.whatsapp into v_confirmator_wa from event_confirmators ec
  join admins a on a.id = ec.admin_id where ec.event_id = p_event_id and ec.is_primary = true limit 1;

  select jsonb_agg(jsonb_build_object('bank_name', pa.bank_name, 'account_number', pa.account_number, 'account_name', pa.account_name))
  into v_account from event_payment_accounts epa join payment_accounts pa on pa.id = epa.payment_account_id
  where epa.event_id = p_event_id and pa.is_active = true;

  return jsonb_build_object(
    'registration_id', v_reg_id, 'reg_code', v_reg_code, 'ticket_token', v_token,
    'status', v_status, 'payment_deadline', v_deadline,
    'payment_accounts', coalesce(v_account, '[]'::jsonb), 'confirmator_wa', v_confirmator_wa
  );
end;
$$;

create or replace function confirm_payment(p_registration_id uuid, p_admin_id uuid, p_note text default null)
returns void language plpgsql security definer as $$
begin
  update registrations set payment_status = 'paid', payment_confirmed_at = now(),
    payment_confirmed_by = p_admin_id, payment_note = p_note, updated_at = now()
  where id = p_registration_id and payment_status = 'pending' and deleted_at is null;
  if not found then raise exception 'REGISTRATION_NOT_FOUND_OR_INVALID'; end if;
  insert into audit_logs (admin_id, action, target_type, target_id, details)
  values (p_admin_id, 'confirm_payment', 'registration', p_registration_id::text, jsonb_build_object('note', p_note));
end;
$$;

create or replace function checkin_ticket(p_token text, p_event_id uuid, p_checked_in_by text default null)
returns jsonb language plpgsql security definer as $$
declare
  v_reg registrations%rowtype;
  v_result text;
begin
  select * into v_reg from registrations where ticket_token = p_token and deleted_at is null;
  if v_reg.id is null then v_result := 'invalid';
  elsif v_reg.event_id <> p_event_id then v_result := 'wrong_event';
  elsif v_reg.payment_status <> 'paid' then v_result := 'unpaid';
  elsif v_reg.checkin_at is not null then v_result := 'already';
  else
    v_result := 'ok';
    update registrations set checkin_at = now(), checkin_by = p_checked_in_by, updated_at = now() where id = v_reg.id;
  end if;
  insert into checkin_logs (event_id, registration_id, ticket_token, result, checked_in_by)
  values (p_event_id, v_reg.id, p_token, v_result, p_checked_in_by);
  return jsonb_build_object('result', v_result, 'husband_name', v_reg.husband_name,
    'wife_name', v_reg.wife_name, 'reg_code', v_reg.reg_code, 'checkin_at', v_reg.checkin_at);
end;
$$;

create or replace function set_event_staff_password(p_event_id uuid, p_password text)
returns void language plpgsql security definer as $$
begin
  insert into event_staff (event_id, password_hash)
  values (p_event_id, crypt(p_password, gen_salt('bf')))
  on conflict (event_id) do update
    set password_hash = crypt(p_password, gen_salt('bf')), is_active = true,
        locked_until = null, failed_attempts = 0, updated_at = now();
end;
$$;

create or replace function verify_event_staff(p_event_id uuid, p_password text)
returns boolean language plpgsql security definer as $$
declare v_staff event_staff%rowtype;
begin
  select * into v_staff from event_staff where event_id = p_event_id and is_active = true;
  if v_staff.id is null then return false; end if;
  if v_staff.locked_until is not null and v_staff.locked_until > now() then raise exception 'ACCOUNT_LOCKED'; end if;
  if v_staff.password_hash = crypt(p_password, v_staff.password_hash) then
    update event_staff set failed_attempts = 0, locked_until = null, updated_at = now() where id = v_staff.id;
    return true;
  else
    update event_staff set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
      updated_at = now() where id = v_staff.id;
    return false;
  end if;
end;
$$;

-- ROW LEVEL SECURITY

alter table registrations enable row level security;
alter table event_staff enable row level security;
alter table payment_accounts enable row level security;
alter table audit_logs enable row level security;
alter table admins enable row level security;
alter table event_confirmators enable row level security;
alter table event_payment_accounts enable row level security;
alter table categories enable row level security;
alter table events enable row level security;
alter table form_fields enable row level security;
alter table pages enable row level security;
alter table site_settings enable row level security;
alter table checkin_logs enable row level security;

-- Registrations
create policy "service_role_all_registrations" on registrations for all to service_role using (true);
create policy "admins_read_registrations" on registrations for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));
create policy "admins_update_registrations" on registrations for update to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Event staff
create policy "service_role_all_event_staff" on event_staff for all to service_role using (true);

-- Payment accounts
create policy "service_role_all_payment_accounts" on payment_accounts for all to service_role using (true);
create policy "admins_read_payment_accounts" on payment_accounts for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));
create policy "super_admin_write_payment_accounts" on payment_accounts for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true and role = 'super_admin'));

-- Audit logs
create policy "service_role_all_audit_logs" on audit_logs for all to service_role using (true);
create policy "admins_read_audit_logs" on audit_logs for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Admins
create policy "service_role_all_admins" on admins for all to service_role using (true);
create policy "admins_read_admins" on admins for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));
create policy "super_admin_write_admins" on admins for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true and role = 'super_admin'));

-- Event confirmators
create policy "service_role_all_event_confirmators" on event_confirmators for all to service_role using (true);
create policy "admins_read_event_confirmators" on event_confirmators for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Event payment accounts
create policy "service_role_all_event_payment_accounts" on event_payment_accounts for all to service_role using (true);
create policy "admins_manage_event_payment_accounts" on event_payment_accounts for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Categories
create policy "public_read_categories" on categories for select to anon, authenticated using (true);
create policy "admins_write_categories" on categories for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Events
create policy "public_read_events" on events for select to anon, authenticated using (deleted_at is null);
create policy "service_role_all_events" on events for all to service_role using (true);
create policy "admins_write_events" on events for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Form fields
create policy "public_read_form_fields" on form_fields for select to anon, authenticated using (true);
create policy "service_role_all_form_fields" on form_fields for all to service_role using (true);
create policy "admins_write_form_fields" on form_fields for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Pages
create policy "public_read_published_pages" on pages for select to anon using (status = 'published' and deleted_at is null);
create policy "authenticated_read_pages" on pages for select to authenticated using (deleted_at is null);
create policy "service_role_all_pages" on pages for all to service_role using (true);
create policy "admins_write_pages" on pages for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- Site settings
create policy "public_read_site_settings" on site_settings for select to anon, authenticated using (true);
create policy "super_admin_write_site_settings" on site_settings for all to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true and role = 'super_admin'));
create policy "service_role_all_site_settings" on site_settings for all to service_role using (true);

-- Checkin logs
create policy "service_role_all_checkin_logs" on checkin_logs for all to service_role using (true);
create policy "admins_read_checkin_logs" on checkin_logs for select to authenticated using (exists (select 1 from admins where id = auth.uid() and is_active = true));

-- SEED DATA
insert into site_settings (key, value) values
  ('stats', '{"alumni": 900, "cities": 70, "satisfaction": 98, "events_held": 50}'),
  ('faq', '[{"q":"Apa itu Happy Couple Class?","a":"HCC adalah kelas pernikahan berbasis Islam yang membantu pasangan membangun rumah tangga yang sakinah, mawaddah, dan rahmah."},{"q":"Siapa yang bisa mendaftar?","a":"Pasangan suami dan istri yang ingin memperkuat fondasi rumah tangga mereka."},{"q":"Bagaimana cara pembayaran?","a":"Pembayaran dilakukan via transfer bank ke rekening yang tertera, lalu konfirmasi lewat WhatsApp admin."},{"q":"Apakah ada tiket digital?","a":"Ya! Setelah pembayaran dikonfirmasi, Anda akan mendapatkan tiket digital berisi QR code."}]'),
  ('social', '{"instagram":"happycoupleclass","whatsapp":"628123456789"}'),
  ('wa_templates', '{"default_wa_to_admin":"Assalamualaikum, saya {husband} & {wife} ingin konfirmasi pembayaran pendaftaran HCC *{event}* dengan kode *{reg_code}*. Terlampir bukti transfer.","default_wa_to_user":"Assalamualaikum Kak {husband} & {wife}, pembayaran pendaftaran HCC *{event}* (kode *{reg_code}*) sudah kami konfirmasi. Berikut link tiket Anda: {ticket_url}","default_success_message":"Selamat, pendaftaran Anda sudah kami rekam. Silakan lakukan pembayaran lalu konfirmasi lewat tombol di bawah."}')
on conflict (key) do nothing;
