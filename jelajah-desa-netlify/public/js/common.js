"use strict";
/* Helper bersama untuk situs publik dan admin. Memerlukan config.js dan supabase-js (CDN). */
(function () {
  const C = window.JD_CONFIG || {};
  const configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !/YOUR-/.test(C.SUPABASE_URL + C.SUPABASE_ANON_KEY));
  const sb = configured && window.supabase
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

  // Escape HTML (pengganti e() di PHP). Semua data dari database WAJIB lewat sini sebelum masuk innerHTML.
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl2br = s => String(s ?? "").replace(/\r?\n/g, "<br>");
  // Teks polos -> paragraf (paragraf dipisah baris kosong), sama seperti paras() di PHP
  const paras = t => {
    t = String(t ?? "").trim();
    if (!t) return "";
    return t.split(/\r?\n\s*\r?\n/).map(p => "<p>" + nl2br(esc(p.trim())) + "</p>").join("");
  };
  // URL publik file di bucket "uploads"
  const fileUrl = name => name ? `${C.SUPABASE_URL}/storage/v1/object/public/uploads/${encodeURIComponent(name)}` : "";
  // Hanya izinkan http(s) agar tidak ada javascript: di href
  const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
  const fmtDate = d => { if (!d) return ""; const x = new Date(d); return isNaN(x) ? "" : x.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-"); };

  window.JD = { sb, configured, esc, nl2br, paras, fileUrl, safeUrl, fmtDate, url: C.SUPABASE_URL };
})();
