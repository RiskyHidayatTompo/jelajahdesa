# Jelajah Desa: Netlify + Supabase

Versi baru website Jelajah Desa **tanpa PHP dan MySQL**.

| Bagian | Sebelumnya | Sekarang |
|---|---|---|
| Hosting | XAMPP / Apache | **Netlify** (situs statis) |
| Database | MySQL | **Supabase** (PostgreSQL) |
| Login admin | session PHP + tabel `admins` | **Supabase Auth** (email + password) |
| Foto | folder `uploads/` | **Supabase Storage** (bucket `uploads`) |
| Logika | PHP | **JavaScript** di browser (`supabase-js`) |
| Tambah akun admin | `admin/admins.php` | Netlify Function `create-admin` |

## Struktur

```
netlify.toml                    konfigurasi Netlify (folder publish, header keamanan)
supabase/schema.sql             tabel, RLS, bucket foto, data awal
netlify/functions/create-admin.js   tambah akun admin (memakai service_role key)
public/                         isi situs yang dipublikasikan
  index.html, artikel.html
  css/style.css
  js/config.js                  <- ISI URL & anon key Supabase di sini
  js/common.js, site.js, script.js, artikel.js
  admin/                        login.html, index.html (dashboard) + admin-*.js
  assets/images/                foto bawaan situs (opsional)
```

## Langkah 1 - Siapkan Supabase

1. Buat proyek di <https://supabase.com> (pilih region terdekat, mis. Singapore).
2. Buka **SQL Editor > New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
   Ini membuat 11 tabel, aturan keamanan (RLS), bucket foto `uploads`, dan data awal.
3. **Authentication > Sign In / Providers > Email**: **matikan "Allow new users to sign up"**.
   Ini penting agar orang asing tidak bisa mendaftar sebagai admin.
4. **Authentication > Users > Add user > Create new user**: isi email dan password (min. 10 karakter),
   centang **Auto Confirm User**. Akun **pertama** otomatis menjadi **superadmin**.
5. **Project Settings > API**: salin **Project URL** dan **anon public key**.

## Langkah 2 - Isi konfigurasi

Edit `public/js/config.js`:

```js
window.JD_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

Anon key memang aman dipublikasikan; perlindungan data ada di aturan RLS pada `schema.sql`.
**Jangan** memasukkan `service_role` key ke file mana pun di folder `public/`.

## Langkah 3 - Deploy ke Netlify

**Disarankan lewat GitHub** (supaya Netlify Function ikut aktif):

1. Unggah folder ini ke repository GitHub.
2. Netlify > **Add new site > Import an existing project** > pilih repository.
3. Pengaturan build sudah terbaca dari `netlify.toml` (publish: `public`, tanpa build command). Klik **Deploy**.
4. Untuk fitur **tambah akun admin**, buka **Site configuration > Environment variables** dan tambahkan:
   - `SUPABASE_URL` = Project URL Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = *service_role key* (Project Settings > API). **Rahasia**, jangan dibagikan.

   Lalu **Deploys > Trigger deploy > Clear cache and deploy site**.

Drag-and-drop folder `public/` ke Netlify juga bisa, tetapi tanpa Netlify Function.
Akun admin tambahan lalu dibuat manual di Supabase (Authentication > Users > Add user).

## Langkah 4 - Pakai

1. Buka `https://situs-anda.netlify.app/admin/login.html` (atau tautan "Login Admin" di footer) dan login dengan email akun tadi.
2. Isi **Pengaturan Website, Kontak, Lokasi, Tentang Desa**, lalu tambah destinasi, aktivitas, galeri, berita, dan testimoni.
3. Seluruh fitur dashboard lama tetap ada. Konten berstatus draft atau disembunyikan tidak tampil di website.

## Perubahan dari versi PHP

- **Login memakai email**, bukan username atau email. Username tetap ada sebagai nama tampilan.
- **Pembatasan login** (5 percobaan) kini ditangani Supabase Auth; halaman `admin/setup.php` tidak diperlukan lagi.
- **Lupa password**: pakai Supabase (Authentication > Users > Send password recovery, atau atur ulang manual).
- **Statistik** di beranda kini menghitung data nyata (destinasi, aktivitas, foto galeri, berita) menggantikan angka contoh.
- **Berita** dibuka lewat `artikel.html?slug=...` (bukan `artikel.php`).
- **Peran akun** (admin / superadmin) masih ditetapkan saat akun dibuat; superadmin dapat mengaktifkan/menonaktifkan akun.
- Batas foto: 3 MB (hero 5 MB), format JPG/PNG/WebP, dibatasi di browser dan di bucket Supabase.
- Teks kredit footer ("Dikembangkan oleh ...") ada di `public/js/script.js` (objek `CONFIG.credit`).
- Data lama di MySQL **tidak otomatis ikut pindah**. Jika ada, ekspor dari phpMyAdmin dan impor lewat Supabase (Table Editor > Import CSV), dan unggah ulang foto lama lewat dashboard.

## Keamanan yang diterapkan

- **RLS aktif di semua tabel**: pengunjung hanya bisa membaca konten yang dipublikasikan, dan hanya bisa *menambah* permintaan kunjungan (tidak bisa membacanya).
- Hanya admin aktif yang dapat mengubah konten dan mengunggah foto (dicek di database dan Storage, bukan hanya di tampilan).
- Admin biasa tidak bisa mengubah peran/status; superadmin terakhir dan akun sendiri tidak bisa dinonaktifkan (trigger database).
- Formulir kunjungan: validasi di database, honeypot, dan batas 40 permintaan/jam.
- Semua data dari database di-escape sebelum ditampilkan (anti-XSS); tautan hanya http(s).
- Header keamanan dan Content-Security-Policy di `netlify.toml`.

## Catatan pengujian

Kode diperiksa sintaksnya dan dijalankan di lingkungan simulasi (jsdom) dengan Supabase tiruan: halaman publik, artikel, serta seluruh 16 halaman admin dirender tanpa galat. **Belum diuji dengan proyek Supabase dan Netlify sungguhan**, jadi lakukan pengecekan berikut setelah deploy:

- [ ] Beranda menampilkan konten setelah Anda menambah destinasi berstatus *Dipublikasikan*.
- [ ] Login admin berhasil; login dengan email lain ditolak.
- [ ] Unggah foto di destinasi, lalu foto tampil di beranda.
- [ ] Formulir kunjungan: data masuk ke menu *Pesan & Permintaan Kunjungan*.
- [ ] Tambah akun admin (perlu environment variable di langkah 3).
- [ ] `https://situs-anda.netlify.app/admin/` tanpa login diarahkan ke halaman login.

Jika halaman kosong, buka Console browser (F12). Pesan umum: URL/anon key salah di `config.js`, atau `schema.sql` belum dijalankan.
