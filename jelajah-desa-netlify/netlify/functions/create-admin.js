// Netlify Function: membuat akun admin baru. Hanya bisa dipanggil oleh SUPERADMIN yang sedang login.
// Memakai service_role key (rahasia) yang disimpan di Environment Variables Netlify, tidak pernah dikirim ke browser.
const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Metode tidak diizinkan." });
  const URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !KEY) return json(500, { error: "Server belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });

  const token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Belum login." });

  // 1. Verifikasi token pemanggil
  const u = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!u.ok) return json(401, { error: "Sesi tidak valid. Login ulang." });
  const caller = await u.json();
  if (!/^[0-9a-f-]{36}$/i.test(caller.id || "")) return json(401, { error: "Sesi tidak valid." });

  // 2. Pastikan pemanggil superadmin aktif
  const r = await fetch(`${URL}/rest/v1/admins?id=eq.${caller.id}&role=eq.superadmin&is_active=eq.true&select=id`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) return json(403, { error: "Hanya superadmin yang dapat menambah akun." });

  // 3. Validasi input
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Data tidak valid." }); }
  const username = String(b.username || "").trim(), email = String(b.email || "").trim().toLowerCase(), password = String(b.password || "");
  const role = b.role === "superadmin" ? "superadmin" : "admin";
  if (username.length < 2 || username.length > 50) return json(422, { error: "Username 2-50 karakter." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(422, { error: "Email tidak valid." });
  if (password.length < 10) return json(422, { error: "Password minimal 10 karakter." });

  // 4. Buat user (trigger database otomatis membuat baris di tabel admins)
  const c = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username } })
  });
  const created = await c.json().catch(() => ({}));
  if (!c.ok) return json(c.status === 422 ? 422 : 400, { error: /already|registered/i.test(created.msg || created.message || "") ? "Email sudah terdaftar." : (created.msg || created.message || "Gagal membuat akun.") });

  // 5. Atur peran bila superadmin
  if (role === "superadmin") {
    await fetch(`${URL}/rest/v1/admins?id=eq.${created.id}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "superadmin" })
    });
  }
  return json(200, { ok: true });
};
