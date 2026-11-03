"use strict";
(async function () {
  const { sb, esc } = window.JD;
  const $ = s => document.querySelector(s);
  const show = (t, type = "danger") => { $("#msg").innerHTML = `<div class="alert alert-${type} py-2" role="alert">${esc(t)}</div>`; };

  $("#tg").onclick = function () {
    const p = $("#pw"), s = p.type === "password";
    p.type = s ? "text" : "password";
    this.innerHTML = `<i class="bi bi-eye${s ? "-slash" : ""}"></i>`;
    this.setAttribute("aria-label", s ? "Sembunyikan password" : "Tampilkan password");
  };

  if (!sb) { show("Supabase belum dikonfigurasi. Isi public/js/config.js."); $("#form").hidden = true; return; }

  async function adminRow(userId) {
    const { data } = await sb.from("admins").select("*").eq("id", userId).maybeSingle();
    return data && data.is_active ? data : null;
  }

  // Sudah login? Tampilkan pilihan (sama seperti login.php lama)
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    const a = await adminRow(session.user.id);
    if (a) {
      $("#who").textContent = a.username; $("#already").hidden = false; $("#form").hidden = true;
      $("#switch").onclick = async () => { await sb.auth.signOut(); location.reload(); };
    } else await sb.auth.signOut();
  }
  if (new URLSearchParams(location.search).has("e")) show("Akun Anda tidak terdaftar sebagai admin aktif.");

  $("#form").onsubmit = async e => {
    e.preventDefault();
    const email = $("#email").value.trim(), password = $("#pw").value;
    if (!email || !password) return show("Email dan password wajib diisi.");
    const btn = $("#go"); btn.disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        show(/rate|too many/i.test(error.message) ? "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." : "Email atau password salah.");
        return;
      }
      const a = await adminRow(data.user.id);
      if (!a) { await sb.auth.signOut(); return show("Akun ini tidak terdaftar sebagai admin aktif."); }
      await sb.from("admins").update({ last_login: new Date().toISOString() }).eq("id", a.id);
      await sb.from("activity_logs").insert({ admin_id: a.id, admin_name: a.username, action: "Login berhasil" });
      location.href = "index.html";
    } catch (err) { show("Tidak dapat menghubungi server. Coba lagi."); }
    finally { btn.disabled = false; }
  };
})();
