"use strict";
/* Mengambil konten dari Supabase, mengisi halaman, membentuk window.SITE, lalu memuat js/script.js.
   Pengganti logika PHP di index.php. */
(async function () {
  const { sb, esc, nl2br, paras, fileUrl, safeUrl, fmtDate } = window.JD;
  const $ = s => document.querySelector(s);
  const NONE = "assets/images/kosong.jpg"; // tidak ada file -> script.js menampilkan ilustrasi pengganti
  const SITE = { destinations: [], activities: [], gallery: [], testimonials: [], stats: { articles: 0 } };
  let S = {}, vp = {}, news = [];

  const q = async p => { const r = await p; if (r.error) throw r.error; return r; };

  try {
    if (!sb) throw new Error("Supabase belum dikonfigurasi (js/config.js).");
    const [st, de, vpr, ar, arCount, ac, ga, te] = await Promise.all([
      q(sb.from("settings").select("setting_key,setting_value")),
      q(sb.from("destinations").select("*, destination_images(id,image)").order("sort_order").order("id").order("id", { referencedTable: "destination_images" })),
      q(sb.from("village_profile").select("*").eq("id", 1).maybeSingle()),
      q(sb.from("articles").select("title,slug,cover_image,category,excerpt,published_at").order("published_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(3)),
      q(sb.from("articles").select("id", { count: "exact", head: true })),
      q(sb.from("activities").select("*").order("sort_order").order("id")),
      q(sb.from("gallery").select("*").order("sort_order").order("id")),
      q(sb.from("testimonials").select("*").order("id", { ascending: false }))
    ]);
    st.data.forEach(r => S[r.setting_key] = r.setting_value);
    vp = vpr.data || {};
    news = ar.data;
    SITE.stats.articles = arCount.count || 0;

    SITE.destinations = de.data.map(r => ({
      id: r.id, name: esc(r.name), cat: esc(r.category), desc: esc(r.short_desc), full: nl2br(esc(r.full_desc)),
      loc: esc(r.location || "-"), price: esc(r.ticket_price || "Hubungi pengelola"), hours: esc(r.open_hours),
      access: nl2br(esc(r.access_info)), fac: nl2br(esc(r.facilities)),
      img: r.main_image ? esc(fileUrl(r.main_image)) : NONE,
      gallery: (r.destination_images || []).map(g => esc(fileUrl(g.image)))
    }));
    SITE.activities = ac.data.map(r => ({
      t: esc(r.name), d: esc(r.description), m: esc([r.duration, r.price].filter(Boolean).join(" | ")),
      img: r.image ? esc(fileUrl(r.image)) : NONE
    }));
    SITE.gallery = ga.data.map(r => ({ cap: esc(r.title), img: esc(fileUrl(r.image)), ratio: "" }));
    SITE.testimonials = te.data.map(r => ({
      n: esc(r.visitor_name), s: Math.max(1, Math.min(5, +r.rating || 5)), c: esc(r.comment),
      p: r.photo ? esc(fileUrl(r.photo)) : "", demo: !!r.is_demo
    }));
  } catch (err) {
    console.error("Gagal memuat data:", err);
    SITE.loadError = true;
  }

  const set = (k, d = "") => (S[k] ?? "") !== "" ? S[k] : d;
  const name = set("site_name", "Jelajah Desa");

  // ----- Kontak & info lokasi (diteruskan ke script.js lewat window.SITE) -----
  const extra = {
    whatsapp: set("whatsapp"), address: esc(set("address")), email: esc(set("email")), phone: esc(set("phone")),
    access: esc(set("access_info")), transport: esc(set("transport")), hours: esc(set("service_hours")),
    mapsUrl: safeUrl(set("maps_url"))
  };
  Object.entries(extra).forEach(([k, v]) => { if (v) SITE[k] = v; });
  window.SITE = SITE;

  // ----- Meta, tema, logo -----
  document.title = `${name} | Wisata Alam, Budaya, dan Kuliner Desa`;
  $('meta[name="description"]')?.setAttribute("content", set("site_desc"));
  const tc = set("theme_color", "#1d4a37");
  if (/^#[0-9a-fA-F]{6}$/.test(tc)) document.documentElement.style.setProperty("--forest", tc);
  if (set("favicon")) { const l = document.createElement("link"); l.rel = "icon"; l.href = fileUrl(set("favicon")); document.head.append(l); }
  document.querySelectorAll(".js-name").forEach(el => el.textContent = name);
  if (set("logo")) document.querySelectorAll(".js-logo").forEach(el => { el.innerHTML = `<img src="${esc(fileUrl(set("logo")))}" alt="" height="32" class="me-1">`; });

  // ----- Hero -----
  $("#heroTitle").textContent = set("hero_title", "Temukan Keindahan Tersembunyi di Desa Kami");
  $("#heroDesc").textContent = set("hero_desc");
  if (set("hero_image")) $(".hero-img").src = fileUrl(set("hero_image"));

  // ----- Tentang desa -----
  const vpSec = { history: "Sejarah desa", profile: "Profil desa", vision_mission: "Visi dan misi", nature_potential: "Potensi alam", culture: "Budaya dan tradisi", local_wisdom: "Kearifan lokal", products: "Produk unggulan" };
  const filled = Object.keys(vpSec).filter(k => String(vp[k] ?? "").trim() !== "");
  if (filled.length) {
    $("#aboutText").innerHTML = '<h2 class="title">Desa kecil dengan cerita yang besar</h2>' +
      filled.map(k => `<h3 class="h5 fw-bold mt-3" style="color:var(--forest)">${esc(vpSec[k])}</h3>${paras(vp[k])}`).join("");
  }
  if (vp.image) $("#aboutImg").src = fileUrl(vp.image);

  // ----- Berita terbaru -----
  if (news.length) {
    $("#berita").hidden = false;
    $("#newsGrid").innerHTML = news.map(r => `<div class="col-md-4 reveal"><a class="text-decoration-none text-reset" href="artikel.html?slug=${encodeURIComponent(r.slug)}"><article class="dest-card">${r.cover_image ? `<div class="ph"><img src="${esc(fileUrl(r.cover_image))}" alt="" loading="lazy"></div>` : ""}<div class="dest-body"><h3>${esc(r.title)}</h3><div class="meta">${esc(r.category)}</div><p class="mb-0">${esc(r.excerpt)}...</p></div></article></a></div>`).join("");
  }

  // ----- Footer -----
  $("#footDesc").textContent = set("site_desc");
  $("#copy").textContent = set("copyright", "Jelajah Desa. Hak cipta dilindungi.");
  const soc = { instagram: "https://instagram.com", facebook: "https://facebook.com", youtube: "https://youtube.com" };
  Object.entries(soc).forEach(([k, d]) => { $("#soc-" + k).href = safeUrl(set(k)) || d; });
  if (set("instagram") || set("facebook") || set("youtube")) $("#socNote").hidden = true;
  if (extra.address && (extra.phone || extra.email)) $("#locNote").hidden = true;

  // ----- Muat script interaksi (setelah window.SITE siap) -----
  const s = document.createElement("script");
  s.src = "js/script.js";
  document.body.append(s);
})();
