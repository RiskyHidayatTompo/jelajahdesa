-- =====================================================================
-- Jelajah Desa - skema Supabase (PostgreSQL)
-- Jalankan SELURUH file ini sekali di: Supabase > SQL Editor > New query > Run
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- ---------- 1. TABEL ----------
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null check (char_length(username) between 2 and 50),
  email       text not null,
  role        text not null default 'admin' check (role in ('superadmin','admin')),
  is_active   boolean not null default true,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.settings (
  setting_key   text primary key,
  setting_value text,
  updated_at    timestamptz not null default now(),
  -- tautan hanya boleh http(s):// agar tidak bisa disisipi javascript:
  constraint settings_url_safe check (
    setting_key not in ('instagram','facebook','youtube','maps_url')
    or coalesce(setting_value,'') = '' or setting_value ~* '^https?://'
  )
);

create table if not exists public.destinations (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 1 and 150),
  slug         text not null unique,
  category     text not null check (char_length(category) <= 80),
  short_desc   text not null check (char_length(short_desc) <= 300),
  full_desc    text,
  location     text,
  access_info  text,
  ticket_price text,
  open_hours   text,
  facilities   text,
  main_image   text,
  status       text not null default 'draft' check (status in ('draft','published')),
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists destinations_status_sort on public.destinations (status, sort_order);

create table if not exists public.destination_images (
  id             bigint generated always as identity primary key,
  destination_id bigint not null references public.destinations(id) on delete cascade,
  image          text not null,
  caption        text,
  sort_order     int not null default 0
);
create index if not exists destination_images_dest on public.destination_images (destination_id);

create table if not exists public.activities (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) between 1 and 150),
  description  text not null,
  duration     text,
  price        text,
  requirements text,
  image        text,
  status       text not null default 'draft' check (status in ('draft','published')),
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.gallery (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) between 1 and 150),
  caption    text,
  category   text,
  image      text not null,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.village_profile (
  id               smallint primary key default 1 check (id = 1),
  history          text,
  profile          text,
  vision_mission   text,
  nature_potential text,
  culture          text,
  local_wisdom     text,
  products         text,
  image            text,
  updated_at       timestamptz not null default now()
);

create table if not exists public.articles (
  id           bigint generated always as identity primary key,
  title        text not null check (char_length(title) between 1 and 200),
  slug         text not null unique,
  cover_image  text,
  content      text not null,
  excerpt      text generated always as (left(content, 160)) stored,
  category     text,
  author_id    uuid references public.admins(id) on delete set null,
  author_name  text,
  published_at timestamptz,
  status       text not null default 'draft' check (status in ('draft','published')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists articles_status_pub on public.articles (status, published_at desc);

create table if not exists public.testimonials (
  id           bigint generated always as identity primary key,
  visitor_name text not null check (char_length(visitor_name) between 1 and 100),
  comment      text not null,
  rating       smallint not null default 5 check (rating between 1 and 5),
  photo        text,
  is_demo      boolean not null default false,
  is_visible   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.visit_requests (
  id               bigint generated always as identity primary key,
  visitor_name     text not null,
  phone            text not null,
  email            text,
  destination_id   bigint references public.destinations(id) on delete set null,
  destination_name text,
  visitors         int  not null,
  visit_date       date not null,
  message          text,
  status           text not null default 'baru' check (status in ('baru','diproses','dikonfirmasi','selesai','dibatalkan')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists visit_requests_status on public.visit_requests (status, created_at desc);

create table if not exists public.activity_logs (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.admins(id) on delete set null,
  admin_name text,
  action     text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created on public.activity_logs (created_at desc);

-- ---------- 2. FUNGSI BANTU ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid() and is_active)
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid() and is_active and role = 'superadmin')
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['admins','settings','destinations','activities','village_profile','articles','visit_requests'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format('create trigger trg_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Akun baru di Supabase Auth otomatis dibuatkan baris admin.
-- Akun PERTAMA menjadi superadmin, berikutnya admin biasa.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.admins (id, username, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)),
    new.email,
    case when exists (select 1 from public.admins) then 'admin' else 'superadmin' end
  ) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Jika sudah ada user di Authentication sebelum skema ini dijalankan:
insert into public.admins (id, username, email, role)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1)), u.email,
       case when row_number() over (order by u.created_at) = 1
                 and not exists (select 1 from public.admins) then 'superadmin' else 'admin' end
from auth.users u
where not exists (select 1 from public.admins a where a.id = u.id);

-- Pengaman akun admin: admin biasa tidak bisa mengubah peran/status; superadmin terakhir terlindungi.
create or replace function public.admins_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    new.id := old.id; new.email := old.email; new.role := old.role; new.is_active := old.is_active;
  end if;
  if auth.uid() is not null and new.id = auth.uid() and old.is_active and not new.is_active then
    raise exception 'Anda tidak bisa menonaktifkan akun sendiri.';
  end if;
  if old.role = 'superadmin' and old.is_active and (new.role <> 'superadmin' or not new.is_active)
     and not exists (select 1 from public.admins where role = 'superadmin' and is_active and id <> old.id) then
    raise exception 'Tidak bisa menonaktifkan satu-satunya superadmin aktif.';
  end if;
  return new;
end $$;
drop trigger if exists trg_admins_guard on public.admins;
create trigger trg_admins_guard before update on public.admins
  for each row execute function public.admins_guard();

-- Formulir kunjungan publik: batasi 40 permintaan/jam, paksa status 'baru', isi nama destinasi dari database.
create or replace function public.visit_requests_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.visit_requests where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Terlalu banyak permintaan. Coba lagi nanti atau hubungi pengelola langsung.';
  end if;
  new.status := 'baru';
  new.destination_name := (select name from public.destinations where id = new.destination_id);
  return new;
end $$;
drop trigger if exists trg_visit_requests_insert on public.visit_requests;
create trigger trg_visit_requests_insert before insert on public.visit_requests
  for each row execute function public.visit_requests_before_insert();

-- ---------- 3. ROW LEVEL SECURITY ----------
alter table public.admins             enable row level security;
alter table public.settings           enable row level security;
alter table public.destinations       enable row level security;
alter table public.destination_images enable row level security;
alter table public.activities         enable row level security;
alter table public.gallery            enable row level security;
alter table public.village_profile    enable row level security;
alter table public.articles           enable row level security;
alter table public.testimonials       enable row level security;
alter table public.visit_requests     enable row level security;
alter table public.activity_logs      enable row level security;

-- admins
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins for select to authenticated
  using (id = auth.uid() or public.is_superadmin());
drop policy if exists admins_update on public.admins;
create policy admins_update on public.admins for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());

-- konten publik: pengunjung hanya melihat yang dipublikasikan / ditampilkan
drop policy if exists settings_public on public.settings;
create policy settings_public on public.settings for select to anon, authenticated using (true);

drop policy if exists destinations_public on public.destinations;
create policy destinations_public on public.destinations for select to anon, authenticated using (status = 'published');

drop policy if exists destination_images_public on public.destination_images;
create policy destination_images_public on public.destination_images for select to anon, authenticated
  using (exists (select 1 from public.destinations d where d.id = destination_id and d.status = 'published'));

drop policy if exists activities_public on public.activities;
create policy activities_public on public.activities for select to anon, authenticated using (status = 'published');

drop policy if exists gallery_public on public.gallery;
create policy gallery_public on public.gallery for select to anon, authenticated using (is_visible);

drop policy if exists village_public on public.village_profile;
create policy village_public on public.village_profile for select to anon, authenticated using (true);

drop policy if exists articles_public on public.articles;
create policy articles_public on public.articles for select to anon, authenticated using (status = 'published');

drop policy if exists testimonials_public on public.testimonials;
create policy testimonials_public on public.testimonials for select to anon, authenticated using (is_visible);

-- formulir kunjungan: publik hanya boleh MENAMBAH (tidak bisa membaca)
drop policy if exists visit_requests_insert on public.visit_requests;
create policy visit_requests_insert on public.visit_requests for insert to anon, authenticated
  with check (
    char_length(visitor_name) between 3 and 100
    and phone ~ '^(\+62|62|0)8[0-9]{8,12}$'
    and (email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
    and visitors between 1 and 100
    and visit_date >= current_date - 1
    and char_length(coalesce(message, '')) <= 1000
    and exists (select 1 from public.destinations d where d.id = destination_id and d.status = 'published')
  );

-- admin aktif: akses penuh ke semua tabel konten
do $$
declare t text;
begin
  foreach t in array array['settings','destinations','destination_images','activities','gallery','village_profile','articles','testimonials','visit_requests'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists logs_select on public.activity_logs;
create policy logs_select on public.activity_logs for select to authenticated using (public.is_admin());
drop policy if exists logs_insert on public.activity_logs;
create policy logs_insert on public.activity_logs for insert to authenticated with check (public.is_admin());

-- ---------- 4. PENYIMPANAN FOTO (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists uploads_admin_select on storage.objects;
create policy uploads_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and public.is_admin());
drop policy if exists uploads_admin_insert on storage.objects;
create policy uploads_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and public.is_admin());
drop policy if exists uploads_admin_update on storage.objects;
create policy uploads_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'uploads' and public.is_admin());
drop policy if exists uploads_admin_delete on storage.objects;
create policy uploads_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and public.is_admin());

-- ---------- 5. DATA AWAL ----------
insert into public.village_profile (id) values (1) on conflict (id) do nothing;

insert into public.settings (setting_key, setting_value) values
  ('site_name','Jelajah Desa'),
  ('site_desc','Platform promosi wisata desa: alam, budaya, tradisi, dan kuliner lokal.'),
  ('hero_title','Temukan Keindahan Tersembunyi di Desa Kami'),
  ('hero_desc','Berjalan di antara sawah dan hutan, menyapa warga yang ramah, mencicipi masakan rumahan, dan mengenal tradisi yang masih dijaga.'),
  ('hero_image',''),('logo',''),('favicon',''),('theme_color','#1d4a37'),
  ('whatsapp',''),('email',''),('address',''),
  ('instagram',''),('facebook',''),('youtube',''),
  ('copyright','Jelajah Desa. Hak cipta dilindungi.')
on conflict (setting_key) do nothing;
