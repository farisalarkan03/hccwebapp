-- Perbaiki infinite recursion pada RLS policy tabel admins
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query

-- 1. Hapus policy lama yang menyebabkan rekursi
drop policy if exists "admins_read_admins" on admins;
drop policy if exists "super_admin_write_admins" on admins;

-- 2. Buat policy baru yang tidak rekursif
-- Setiap authenticated user bisa baca baris miliknya sendiri (untuk proses login)
create policy "admins_read_own_row" on admins
  for select to authenticated
  using (id = auth.uid());

-- Admin aktif bisa baca semua baris admin (gunakan auth.jwt() bukan query rekursif)
create policy "admins_read_all_admins" on admins
  for select to authenticated
  using (
    exists (
      select 1 from admins a2
      where a2.id = auth.uid() and a2.is_active = true
    ) or id = auth.uid()
  );

-- Cara lebih aman: gunakan security definer function untuk cek admin
create or replace function is_active_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.admins
    where id = auth.uid() and is_active = true
  );
$$;

-- Drop policy rekursif jika masih ada
drop policy if exists "admins_read_all_admins" on admins;

-- Buat policy final yang aman: cek via function security definer
create policy "admins_read_admins_v2" on admins
  for select to authenticated
  using (id = auth.uid() or is_active_admin());

create policy "super_admin_write_admins_v2" on admins
  for all to authenticated
  using (is_active_admin());

-- Perbaiki juga policy lain yang menggunakan subquery rekursif
-- Ganti semua "exists (select 1 from admins where ...)" dengan is_active_admin()

drop policy if exists "admins_read_registrations" on registrations;
drop policy if exists "admins_update_registrations" on registrations;
create policy "admins_read_registrations_v2" on registrations for select to authenticated using (is_active_admin());
create policy "admins_update_registrations_v2" on registrations for update to authenticated using (is_active_admin());

drop policy if exists "admins_read_payment_accounts" on payment_accounts;
drop policy if exists "super_admin_write_payment_accounts" on payment_accounts;
create policy "admins_read_payment_accounts_v2" on payment_accounts for select to authenticated using (is_active_admin());
create policy "super_admin_write_payment_accounts_v2" on payment_accounts for all to authenticated using (is_active_admin());

drop policy if exists "admins_read_audit_logs" on audit_logs;
create policy "admins_read_audit_logs_v2" on audit_logs for select to authenticated using (is_active_admin());

drop policy if exists "admins_read_event_confirmators" on event_confirmators;
create policy "admins_read_event_confirmators_v2" on event_confirmators for select to authenticated using (is_active_admin());

drop policy if exists "admins_manage_event_payment_accounts" on event_payment_accounts;
create policy "admins_manage_event_payment_accounts_v2" on event_payment_accounts for all to authenticated using (is_active_admin());
