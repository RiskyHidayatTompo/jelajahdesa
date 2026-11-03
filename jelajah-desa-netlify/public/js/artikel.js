"use strict";
(async function () {
  const { sb, esc, paras, fileUrl, fmtDate } = window.JD;
  const app = document.getElementById("app");
  const slug = new URLSearchParams(location.search).get("slug") || "";
  let name = "Jelajah Desa";

  try {
    if (!sb) throw new Error("Supabase belum dikonfigurasi");
    const { data: st } = await sb.from("settings").select("setting_key,setting_value").in("setting_key", ["site_name", "theme_color"]);
    (st || []).forEach(r => {
      if (r.setting_key === "site_name" && r.setting_value) name = r.setting_value;
      if (r.setting_key === "theme_color" && /^#[0-9a-fA-F]{6}$/.test(r.setting_value || "")) document.documentElement.style.setProperty("--forest", r.setting_value);
    });
    document.getElementById("siteName").textContent = name;

    if (slug) {
      const { data: a, error } = await sb.from("articles").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!a) {
        document.title = `Artikel tidak ditemukan | ${name}`;
        app.innerHTML = '<h1 class="title">Artikel tidak ditemukan</h1><p>Artikel mungkin belum dipublikasikan atau sudah dihapus. <a href="artikel.html">Lihat semua artikel</a>.</p>';
        return;
      }
      document.title = `${a.title} | ${name}`;
      const meta = [a.category, fmtDate(a.published_at), a.author_name ? "Oleh " + a.author_name : ""].filter(Boolean).map(esc).join(" | ");
      app.innerHTML = `<article><h1 class="title">${esc(a.title)}</h1><p class="text-muted small">${meta}</p>` +
        (a.cover_image ? `<img class="w-100 rounded-4 mb-4" src="${esc(fileUrl(a.cover_image))}" alt="${esc(a.title)}">` : "") +
        paras(a.content) + '<a href="artikel.html">&larr; Semua artikel</a></article>';
    } else {
      document.title = `Berita dan Artikel | ${name}`;
      const { data: list, error } = await sb.from("articles").select("title,slug,cover_image,category,excerpt,published_at")
        .order("published_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(30);
      if (error) throw error;
      app.innerHTML = '<h1 class="title mb-4">Berita dan Artikel</h1>' +
        (list.length ? "" : '<p class="text-muted">Belum ada artikel yang dipublikasikan.</p>') +
        '<div class="row g-4">' + list.map(r => `<div class="col-md-6"><a class="text-decoration-none text-reset" href="artikel.html?slug=${encodeURIComponent(r.slug)}"><div class="dest-card">` +
          (r.cover_image ? `<div class="ph"><img src="${esc(fileUrl(r.cover_image))}" alt="" loading="lazy"></div>` : "") +
          `<div class="dest-body"><h2 class="h5 fw-bold">${esc(r.title)}</h2><div class="meta">${esc(r.category)} ${esc(fmtDate(r.published_at))}</div><p class="mb-0">${esc(r.excerpt)}...</p></div></div></a></div>`).join("") + "</div>";
    }
  } catch (err) {
    console.error(err);
    app.innerHTML = '<p class="text-danger">Konten tidak dapat dimuat. Muat ulang halaman beberapa saat lagi.</p>';
  }
})();
