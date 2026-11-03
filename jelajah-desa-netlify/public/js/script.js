"use strict";

/* ============ 1. KONFIGURASI (EDIT DI SINI) ============ */
const CONFIG = {
  whatsapp: "6281234567890", // format internasional tanpa + atau 0 di depan
  mapsUrl: "https://www.google.com/maps", // ganti dengan link lokasi desa dari Google Maps
  address: "[Contoh] Alamat desa, Kecamatan, Kabupaten, Provinsi",
  access: "[Contoh] 45 menit dari pusat kota dengan mobil atau motor",
  transport: "[Contoh] Tersedia ojek desa dan sewa mobil lokal",
  phone: "+62 812-3456-7890",
  email: "info@contoh-desa.id",
  credit: "Dikembangkan oleh [Nama Pengembang]"
};

// Nilai dari Supabase (js/site.js) menggantikan nilai di atas bila diisi di dashboard
Object.assign(CONFIG, window.SITE || {});

const DESTINATIONS = [];

// Destinasi dari database (js/site.js) menggantikan data contoh
if (Array.isArray(window.SITE && window.SITE.destinations)) { DESTINATIONS.length = 0; DESTINATIONS.push(...window.SITE.destinations); }

const ACTIVITIES = [];

const GALLERY = [];


const TESTIMONIALS = [];

// Data dari database (js/site.js) menggantikan data contoh
[["activities", ACTIVITIES], ["gallery", GALLERY], ["testimonials", TESTIMONIALS]].forEach(([k, arr]) => { if (Array.isArray(window.SITE && window.SITE[k])) { arr.length = 0; arr.push(...window.SITE[k]); } });

/* ============ 2. UTILITAS ============ */
const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Ilustrasi pengganti bila foto belum tersedia
function placeholder(i) {
  const h = [140, 120, 160, 100, 175, 90][i % 6];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="hsl(${h},35%,84%)"/><circle cx="620" cy="140" r="52" fill="hsl(42,85%,86%)"/><path d="M0 420Q200 260 400 400T800 380V600H0Z" fill="hsl(${h},35%,48%)"/><path d="M0 490Q250 360 500 470T800 450V600H0Z" fill="hsl(${h},42%,30%)"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
function img(src, alt, i, cls = "") {
  return `<img src="${src}" alt="${alt}" loading="lazy" data-i="${i}" class="${cls}">`;
}
function armFallbacks(root = document) {
  root.querySelectorAll("img[data-i]").forEach(im => {
    const swap = () => { im.src = placeholder(+im.dataset.i); };
    im.addEventListener("error", swap, { once: true });
    if (im.complete && im.naturalWidth === 0) swap();
  });
}
function toast(msg, type = "success") {
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${type} border-0`;
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
  $("#toasts").append(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  new bootstrap.Toast(el, { delay: 4500 }).show();
}
const modalEl = $("#modal");
const modal = new bootstrap.Modal(modalEl);
function openModal(title, html) {
  $("#modalTitle").innerHTML = title;
  $("#modalBody").innerHTML = html;
  armFallbacks($("#modalBody"));
  modal.show();
}

/* ============ 3. RENDER KONTEN ============ */
function renderStats() {
  const st = (window.SITE && window.SITE.stats) || {};
  const STATS = [
    { n: DESTINATIONS.length, l: "Destinasi Wisata", i: "bi-geo-alt" },
    { n: ACTIVITIES.length, l: "Aktivitas Wisata", i: "bi-compass" },
    { n: GALLERY.length, l: "Foto Galeri", i: "bi-images" },
    { n: st.articles || 0, l: "Berita & Artikel", i: "bi-newspaper" }
  ];
  $("#stats").innerHTML = STATS.map(s => `<div class="col-6 col-md-3 stat"><i class="bi ${s.i}"></i><b data-n="${s.n}">0</b><span>${s.l}</span></div>`).join("");
}
function renderDestinations() {
  $("#destGrid").innerHTML = DESTINATIONS.map((d, i) => `
    <div class="col-md-6 col-lg-4 dest-item reveal" data-cat="${d.cat}">
      <article class="dest-card">
        <div class="ph">${img(d.img, d.name, i)}<span class="cat">${d.cat}</span></div>
        <div class="dest-body">
          <h3>${d.name}</h3>
          <div class="meta"><i class="bi bi-geo-alt"></i> ${d.loc}</div>
          <div class="meta"><i class="bi bi-ticket-perforated"></i> ${d.price}</div>
          <p class="mt-2">${d.desc}</p>
          <button class="btn btn-forest btn-sm" data-detail="${i}">Lihat Detail</button>
        </div>
      </article>
    </div>`).join("");
  const cats = ["Semua", ...new Set(DESTINATIONS.map(d => d.cat))];
  $("#filters").innerHTML = cats.map((c, i) => `<button class="chip ${i ? "" : "active"}" data-filter="${c}" aria-pressed="${!i}">${c}</button>`).join("");
  $("#dest").innerHTML = `<option value="">Pilih destinasi...</option>` + DESTINATIONS.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
}
function renderActivities() {
  $("#actGrid").innerHTML = ACTIVITIES.map((a, i) => `
    <div class="col-md-6 col-lg-4 reveal"><article class="act-card">${img(a.img, a.t, i + 1)}<div class="txt"><h3>${a.t}</h3><p>${a.d}</p>${a.m ? `<small>${a.m}</small>` : ""}</div></article></div>`).join("");
}
function renderGallery() {
  $("#gallery").innerHTML = GALLERY.map((g, i) => `
    <button type="button" data-g="${i}" aria-label="Perbesar foto: ${g.cap}">${img(g.img, g.cap, i, "")}<span>${g.cap}</span></button>`).join("");
  document.querySelectorAll("#gallery img").forEach((im, i) => { im.style.aspectRatio = GALLERY[i].ratio; im.style.objectFit = "cover"; });
}
function renderTestimonials() {
  $("#testi").innerHTML = TESTIMONIALS.map(t => `
    <div class="col-md-4 reveal"><div class="card-box">
      <div class="stars mb-2" aria-label="Penilaian ${t.s} dari 5">${"<i class='bi bi-star-fill'></i>".repeat(t.s)}${"<i class='bi bi-star'></i>".repeat(5 - t.s)}</div>
      <p>${t.c}</p>
      <div class="d-flex align-items-center gap-3">${t.p ? `<img class="avatar" src="${t.p}" alt="" style="object-fit:cover">` : `<div class="avatar" aria-hidden="true">${t.n.charAt(0)}</div>`}<div><b>${t.n}</b><br><small class="text-muted">${t.demo ? "Data demo" : "Pengunjung"}</small></div></div>
    </div></div>`).join("");
}
function renderInfo() {
  const rows = [["bi-geo-alt", "Lokasi", CONFIG.address], ["bi-signpost-2", "Akses", CONFIG.access], ["bi-bus-front", "Transportasi", CONFIG.transport], ...(CONFIG.hours ? [["bi-clock", "Jam pelayanan", CONFIG.hours]] : []), ["bi-telephone", "Pengelola", `${CONFIG.phone}<br>${CONFIG.email}`]];
  $("#info").innerHTML = rows.map(r => `<li><i class="bi ${r[0]}"></i><span><b>${r[1]}</b><br>${r[2]}</span></li>`).join("");
  $("#footInfo").innerHTML = `<li>${CONFIG.phone}</li><li>${CONFIG.email}</li><li>${CONFIG.address}</li>`;
  $("#mapBtn").href = CONFIG.mapsUrl;
  $("#credit").textContent = CONFIG.credit;
  $("#year").textContent = new Date().getFullYear();
}

/* ============ 4. INTERAKSI ============ */
function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) return items.forEach(e => e.classList.add("in"));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
  items.forEach(e => io.observe(e));
}
function setupCounters() {
  const els = document.querySelectorAll("[data-n]");
  const run = el => {
    const end = +el.dataset.n;
    if (reduceMotion) return (el.textContent = end);
    const t0 = performance.now();
    const step = t => { const p = Math.min((t - t0) / 1200, 1); el.textContent = Math.round(end * p); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: .6 });
  els.forEach(e => io.observe(e));
}
function setupFilters() {
  $("#filters").addEventListener("click", e => {
    const b = e.target.closest("[data-filter]"); if (!b) return;
    document.querySelectorAll(".chip").forEach(c => { c.classList.toggle("active", c === b); c.setAttribute("aria-pressed", c === b); });
    document.querySelectorAll(".dest-item").forEach(it => it.classList.toggle("hide", b.dataset.filter !== "Semua" && it.dataset.cat !== b.dataset.filter));
  });
}
function setupModals() {
  $("#gallery").addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    const g = GALLERY[+b.dataset.g];
    openModal(g.cap, img(g.img, g.cap, +b.dataset.g));
  });
  $("#destGrid").addEventListener("click", e => {
    const b = e.target.closest("[data-detail]"); if (!b) return;
    const i = +b.dataset.detail, d = DESTINATIONS[i];
    openModal(d.name, `${img(d.img, d.name, i)}<p class="mt-3">${d.full || d.desc}</p><p class="meta"><i class="bi bi-tag"></i> ${d.cat}<br><i class="bi bi-geo-alt"></i> ${d.loc}<br><i class="bi bi-ticket-perforated"></i> ${d.price}</p>${d.hours ? `<p class="meta"><i class="bi bi-clock"></i> ${d.hours}</p>` : ""}${d.access ? `<p class="meta"><i class="bi bi-signpost-2"></i> ${d.access}</p>` : ""}${d.fac ? `<p class="meta"><i class="bi bi-check2-circle"></i> Fasilitas:<br>${d.fac}</p>` : ""}${(d.gallery || []).map(g => img(g, d.name, i, "mt-2")).join("")}<button class="btn btn-wa" data-book="${i}"><i class="bi bi-calendar-check"></i> Rencanakan kunjungan</button>`);
  });
  $("#modalBody").addEventListener("click", e => {
    const b = e.target.closest("[data-book]"); if (!b) return;
    $("#dest").value = DESTINATIONS[+b.dataset.book].id;
    modal.hide();
    setTimeout(() => $("#kontak").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 250);
  });
}
function setupNavbar() {
  const nav = $("#nav"), top = $("#toTop"), menu = $("#menu");
  const onScroll = () => { nav.classList.toggle("scrolled", scrollY > 60); top.classList.toggle("show", scrollY > 500); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  top.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  menu.addEventListener("click", e => { if (e.target.closest("a") && menu.classList.contains("show")) bootstrap.Collapse.getInstance(menu)?.hide(); });
}

/* ============ 5. FORMULIR & WHATSAPP ============ */
function setupForm() {
  const f = $("#form"), tgl = $("#tgl");
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  tgl.min = today; tgl.value = today;

  const rules = {
    nama: v => v.trim().length >= 3,
    hp: v => /^(\+62|62|0)8\d{8,12}$/.test(v.replace(/[\s-]/g, "")),
    email: v => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    dest: v => v !== "",
    jumlah: v => Number.isInteger(+v) && +v >= 1 && +v <= 100,
    tgl: v => v !== "" && v >= today
  };
  const check = id => { const el = $("#" + id), ok = rules[id](el.value); el.classList.toggle("is-invalid", !ok); el.classList.toggle("is-valid", ok && el.value !== ""); return ok; };
  Object.keys(rules).forEach(id => $("#" + id).addEventListener("blur", () => check(id)));

  const saveRequest = async () => {
    const btn = $("#saveBtn"); btn.disabled = true;
    try {
      if ($("#website").value) { toast("Terima kasih."); btn.disabled = false; return; } // honeypot bot
      const sb = window.JD && window.JD.sb;
      if (!sb) throw new Error("not configured");
      const { error } = await sb.from("visit_requests").insert({
        visitor_name: $("#nama").value.trim().slice(0, 100),
        phone: $("#hp").value.replace(/[\s-]/g, ""),
        email: $("#email").value.trim() || null,
        destination_id: +$("#dest").value,
        visitors: +$("#jumlah").value,
        visit_date: tgl.value,
        message: $("#pesan").value.trim().slice(0, 1000) || null
      });
      if (error) {
        const limited = /terlalu banyak/i.test(error.message || "");
        toast(limited ? "Terlalu banyak permintaan. Coba lagi nanti atau hubungi pengelola langsung." : "Permintaan tidak dapat disimpan. Periksa isian atau gunakan tombol WhatsApp.", "danger");
      } else {
        toast("Permintaan kunjungan tersimpan. Ini belum berarti reservasi terkonfirmasi: pengelola akan menghubungi Anda untuk memastikan jadwal.");
        f.reset(); tgl.value = today; f.querySelectorAll(".is-valid").forEach(x => x.classList.remove("is-valid"));
      }
    } catch (err) { toast("Server tidak dapat dihubungi. Coba lagi atau gunakan tombol WhatsApp.", "danger"); }
    btn.disabled = false;
  };
  f.addEventListener("submit", e => {
    e.preventDefault();
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) { toast("Beberapa isian belum benar. Periksa kolom yang berwarna merah.", "danger"); $(".is-invalid", f)?.focus(); return; }
    if (!(e.submitter && e.submitter.id === "waBtn")) return saveRequest();
    const [y, m, d] = tgl.value.split("-");
    const msg = ["Halo, saya ingin merencanakan kunjungan ke desa wisata.", "",
      `Nama: ${$("#nama").value.trim()}`, `Telepon: ${$("#hp").value.trim()}`,
      ...($("#email").value ? [`Email: ${$("#email").value.trim()}`] : []),
      `Destinasi: ${$("#dest").selectedOptions[0].text}`, `Jumlah pengunjung: ${$("#jumlah").value} orang`, `Tanggal kunjungan: ${d}-${m}-${y}`,
      ...($("#pesan").value.trim() ? [`Pesan: ${$("#pesan").value.trim()}`] : [])].join("\n");
    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    const w = window.open(url, "_blank", "noopener");
    toast(w ? "WhatsApp dibuka. Tekan kirim di WhatsApp untuk menghubungi pengelola." : `Pop-up diblokir. <a class="text-white" href="${url}" target="_blank" rel="noopener">Buka WhatsApp di sini</a>.`, w ? "success" : "warning");
  });
}

/* ============ 6. MULAI ============ */
renderStats(); renderDestinations(); if (!DESTINATIONS.length) $("#destGrid").innerHTML = '<p class="text-muted">Belum ada destinasi yang dipublikasikan.</p>'; renderActivities(); renderGallery(); renderTestimonials(); renderInfo();
[["#actGrid", ACTIVITIES, "aktivitas"], ["#gallery", GALLERY, "foto"], ["#testi", TESTIMONIALS, "testimoni"]].forEach(([s, a, n]) => { if (!a.length) $(s).innerHTML = `<p class="text-muted">Belum ada ${n} yang ditampilkan.</p>`; });
armFallbacks();
setupReveal(); setupCounters(); setupFilters(); setupModals(); setupNavbar(); setupForm();

if (window.SITE && window.SITE.loadError) toast("Konten tidak dapat dimuat dari server. Muat ulang halaman beberapa saat lagi.", "danger");
