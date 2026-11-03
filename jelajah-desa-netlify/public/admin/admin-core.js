"use strict";
/* Inti dashboard admin: autentikasi, router berbasis hash (#/halaman), helper upload & UI. */
window.ADM = (function () {
  const { sb, esc, fileUrl } = window.JD;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ADM = { sb, esc, fileUrl, $, $$, me: null, routes: {} };

  ADM.fmt = d => d ? new Date(d).toLocaleString("id-ID") : "";
  ADM.toast = (msg, type = "success") => {
    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${type} border-0`;
    el.setAttribute("role", "alert");
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div><button class="btn-close btn-close-white m-auto me-2" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
    $("#toasts").append(el);
    el.addEventListener("hidden.bs.toast", () => el.remove());
    new bootstrap.Toast(el, { delay: 4500 }).show();
  };
  ADM.err = e => ADM.toast(e && e.message ? e.message : String(e), "danger");

  // Dialog konfirmasi hapus -> Promise<boolean>
  ADM.confirm = (text, title = "Hapus data?", okLabel = "Ya, hapus") => new Promise(res => {
    const m = bootstrap.Modal.getOrCreateInstance($("#confirmModal"));
    $("#cmTitle").textContent = title; $("#cmText").textContent = text; $("#cmOk").textContent = okLabel;
    let done = false;
    const ok = $("#cmOk"), el = $("#confirmModal");
    const finish = v => { if (done) return; done = true; ok.onclick = null; el.removeEventListener("hidden.bs.modal", onHide); res(v); };
    const onHide = () => finish(false);
    ok.onclick = () => { finish(true); m.hide(); };
    el.addEventListener("hidden.bs.modal", onHide);
    m.show();
  });
  ADM.info = (title, node) => {
    $("#imTitle").textContent = title; const b = $("#imBody"); b.innerHTML = ""; b.append(node);
    bootstrap.Modal.getOrCreateInstance($("#infoModal")).show();
  };

  // Jalankan query Supabase dan lempar galat bila gagal
  ADM.must = async p => { const r = await p; if (r.error) throw r.error; return r; };
  ADM.log = action => sb.from("activity_logs").insert({ admin_id: ADM.me.id, admin_name: ADM.me.username, action }).then(() => {}, () => {});

  // ----- Upload foto ke Supabase Storage (bucket "uploads") -----
  ADM.uploadImage = async (file, maxMb = 3) => {
    if (!file || !file.size) return null;
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    if (!ext) throw new Error("Format harus JPG, PNG, atau WebP.");
    if (file.size > maxMb * 1048576) throw new Error(`Ukuran gambar maksimal ${maxMb} MB.`);
    const name = crypto.randomUUID().replace(/-/g, "") + "." + ext;
    const { error } = await sb.storage.from("uploads").upload(name, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error("Gagal mengunggah foto: " + error.message);
    return name;
  };
  ADM.removeFiles = async names => {
    const l = (names || []).filter(Boolean);
    if (l.length) await sb.storage.from("uploads").remove(l).catch(() => {});
  };

  ADM.slugify = (s, fallback) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
  ADM.uniqueSlug = async (table, base, excludeId) => {
    const { data } = await ADM.must(sb.from(table).select("id,slug").like("slug", base + "%"));
    const taken = new Set(data.filter(r => r.id !== excludeId).map(r => r.slug));
    let s = base, n = 1; while (taken.has(s)) s = `${base}-${++n}`; return s;
  };
  ADM.nextOrder = async table => {
    const { data } = await ADM.must(sb.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1));
    return ((data[0] && data[0].sort_order) || 0) + 1;
  };
  // Geser urutan satu langkah (up/down)
  ADM.reorder = async (table, id, dir) => {
    const { data } = await ADM.must(sb.from(table).select("id,sort_order").order("sort_order").order("id"));
    const ids = data.map(r => r.id), i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const old = Object.fromEntries(data.map(r => [r.id, r.sort_order]));
    const jobs = ids.map((x, n) => old[x] === n ? null : sb.from(table).update({ sort_order: n }).eq("id", x)).filter(Boolean);
    (await Promise.all(jobs)).forEach(r => { if (r.error) throw r.error; });
  };

  // ----- Tampilan -----
  const MENU = [
    ["dashboard", "Dashboard", "bi-speedometer2", "#/dashboard"],
    ["settings", "Pengaturan Website", "bi-gear", "#/settings"],
    ["destinations", "Kelola Destinasi Wisata", "bi-geo-alt", "#/destinations"],
    ["activities", "Kelola Aktivitas Wisata", "bi-compass", "#/crud/activities"],
    ["gallery", "Kelola Galeri Foto", "bi-images", "#/crud/gallery"],
    ["village", "Kelola Tentang Desa", "bi-house-heart", "#/village"],
    ["articles", "Kelola Berita & Artikel", "bi-newspaper", "#/crud/articles"],
    ["testimonials", "Kelola Testimoni", "bi-chat-quote", "#/crud/testimonials"],
    ["location", "Kelola Informasi Lokasi", "bi-signpost-2", "#/contact/location"],
    ["contact", "Kelola Kontak", "bi-telephone", "#/contact/contact"],
    ["requests", "Pesan & Permintaan Kunjungan", "bi-inbox", "#/requests"],
    ["admins", "Kelola Akun Admin", "bi-people", "#/admins"]
  ];
  ADM.mount = (title, active, html) => {
    $("#title").textContent = title;
    document.title = `${title} | Admin`;
    $$("#menu a[data-key]").forEach(a => a.classList.toggle("on", a.dataset.key === active));
    $("#view").innerHTML = html;
    return $("#view");
  };

  async function route() {
    const parts = (location.hash.replace(/^#\/?/, "") || "dashboard").split("/");
    const fn = ADM.routes[parts[0]];
    const off = bootstrap.Offcanvas.getInstance($("#side")); if (off) off.hide();
    if (!fn) return ADM.mount("Tidak ditemukan", "", '<div class="cardx">Halaman tidak ditemukan.</div>');
    $("#view").innerHTML = '<p class="text-muted">Memuat...</p>';
    try { await fn(parts.slice(1).map(decodeURIComponent)); }
    catch (e) { console.error(e); $("#view").innerHTML = `<div class="alert alert-danger">${esc(e.message || e)}</div>`; }
  }

  ADM.start = async () => {
    if (!sb) { document.body.innerHTML = '<p class="p-4">Supabase belum dikonfigurasi. Isi <code>public/js/config.js</code>.</p>'; return; }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return location.replace("login.html");
    const { data: row } = await sb.from("admins").select("*").eq("id", session.user.id).maybeSingle();
    if (!row || !row.is_active) { await sb.auth.signOut(); return location.replace("login.html?e=1"); }
    ADM.me = row;
    sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT") location.replace("login.html"); });

    $("#who").innerHTML = `<i class="bi bi-person-circle"></i> ${esc(row.username)} (${esc(row.role)})`;
    $("#menu").innerHTML = MENU.map(([k, l, i, h]) => `<a data-key="${k}" href="${h}"><i class="bi ${i}"></i>${esc(l)}</a>`).join("") +
      '<a href="#" id="logout"><i class="bi bi-box-arrow-right"></i>Logout</a>';
    $("#logout").onclick = async e => { e.preventDefault(); await sb.auth.signOut(); location.replace("login.html"); };
    sb.from("settings").select("setting_value").eq("setting_key", "site_name").maybeSingle()
      .then(r => { if (r.data && r.data.setting_value) $("#siteName").textContent = r.data.setting_value; });

    addEventListener("hashchange", route);
    route();
  };
  return ADM;
})();
