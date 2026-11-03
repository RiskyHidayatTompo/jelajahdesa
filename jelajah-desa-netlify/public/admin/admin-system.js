"use strict";
/* Modul: Dashboard, Pengaturan, Tentang Desa, Lokasi/Kontak, Permintaan Kunjungan, Akun Admin. */
(function () {
  const A = window.ADM, { sb, esc, fileUrl, $, $$, must } = A;
  const IMG_ACCEPT = "image/jpeg,image/png,image/webp";
  const isUrl = v => /^https?:\/\//i.test(v);
  const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const getSettings = async () => Object.fromEntries((await must(sb.from("settings").select("setting_key,setting_value"))).data.map(r => [r.setting_key, r.setting_value]));
  const saveSettings = obj => must(sb.from("settings").upsert(Object.entries(obj).map(([setting_key, setting_value]) => ({ setting_key, setting_value })), { onConflict: "setting_key" }));

  /* ============ DASHBOARD ============ */
  A.routes.dashboard = async () => {
    const defs = [["Destinasi Wisata", "destinations", "bi-geo-alt"], ["Foto Galeri", "gallery", "bi-images"], ["Aktivitas Wisata", "activities", "bi-compass"], ["Berita & Artikel", "articles", "bi-newspaper"], ["Permintaan Kunjungan", "visit_requests", "bi-inbox"]];
    const [counts, logs] = await Promise.all([
      Promise.all(defs.map(d => sb.from(d[1]).select("id", { count: "exact", head: true }))),
      must(sb.from("activity_logs").select("*").order("id", { ascending: false }).limit(10))
    ]);
    A.mount("Dashboard", "dashboard", `<div class="row g-3 mb-4">${defs.map((d, i) => `<div class="col-6 col-xl"><div class="cardx text-center"><i class="bi ${d[2]} fs-2" style="color:#3b8a5b"></i><div class="fs-2 fw-bold">${counts[i].count ?? 0}</div><div class="small text-muted">${esc(d[0])}</div></div></div>`).join("")}</div>
      <div class="cardx"><h2 class="h6 fw-bold">Aktivitas Pengelolaan Terbaru</h2>${!logs.data.length ? '<p class="text-muted mb-0">Belum ada aktivitas.</p>' :
        `<div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Waktu</th><th>Admin</th><th>Aktivitas</th></tr></thead><tbody>${logs.data.map(r => `<tr><td class="text-nowrap">${esc(A.fmt(r.created_at))}</td><td>${esc(r.admin_name || "-")}</td><td>${esc(r.action)}</td></tr>`).join("")}</tbody></table></div>`}</div>`);
  };

  /* ============ PENGATURAN WEBSITE ============ */
  A.routes.settings = async () => {
    const s = await getSettings(), v = k => esc(s[k] ?? "");
    A.mount("Pengaturan Website", "settings", `<form class="cardx" id="f"><div class="row g-3">
      <div class="col-md-6"><label class="form-label">Nama website</label><input class="form-control" name="site_name" required maxlength="100" value="${v("site_name")}"></div>
      <div class="col-md-6"><label class="form-label">Warna tema</label><input class="form-control form-control-color" type="color" name="theme_color" value="${v("theme_color") || "#1d4a37"}"></div>
      <div class="col-12"><label class="form-label">Deskripsi singkat website</label><textarea class="form-control" name="site_desc" rows="2" maxlength="300">${v("site_desc")}</textarea></div>
      <div class="col-12"><label class="form-label">Judul hero</label><input class="form-control" name="hero_title" maxlength="150" value="${v("hero_title")}"></div>
      <div class="col-12"><label class="form-label">Deskripsi hero</label><textarea class="form-control" name="hero_desc" rows="2" maxlength="400">${v("hero_desc")}</textarea></div>
      ${[["logo", "Logo"], ["favicon", "Favicon"], ["hero_image", "Foto latar hero"]].map(([k, l]) => `<div class="col-md-4"><label class="form-label">${l} (JPG/PNG/WebP)</label><input class="form-control" type="file" id="file_${k}" accept="${IMG_ACCEPT}">${s[k] ? `<img class="mt-2 rounded border" style="max-height:80px" src="${esc(fileUrl(s[k]))}" alt="${l} saat ini">` : ""}</div>`).join("")}
      <div class="col-md-6"><label class="form-label">WhatsApp pengelola (62...)</label><input class="form-control" name="whatsapp" inputmode="numeric" value="${v("whatsapp")}"></div>
      <div class="col-md-6"><label class="form-label">Email pengelola</label><input class="form-control" type="email" name="email" value="${v("email")}"></div>
      <div class="col-12"><label class="form-label">Alamat desa</label><input class="form-control" name="address" maxlength="255" value="${v("address")}"></div>
      ${[["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"]].map(([k, l]) => `<div class="col-md-4"><label class="form-label">Tautan ${l}</label><input class="form-control" type="url" name="${k}" placeholder="https://" value="${v(k)}"></div>`).join("")}
      <div class="col-12"><label class="form-label">Teks copyright footer</label><input class="form-control" name="copyright" maxlength="150" value="${v("copyright")}"></div>
      <div class="col-12"><button class="btn btn-forest px-4" id="sv">Simpan pengaturan</button></div></div></form>`);
    $("#f").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sv"); btn.disabled = true;
      const uploaded = []; let dbDone = false;
      try {
        const fd = new FormData(e.target), g = k => String(fd.get(k) || "").trim();
        const n = { site_name: g("site_name").slice(0, 100), site_desc: g("site_desc").slice(0, 300), hero_title: g("hero_title").slice(0, 150), hero_desc: g("hero_desc").slice(0, 400), address: g("address").slice(0, 255), copyright: g("copyright").slice(0, 150), theme_color: g("theme_color") };
        if (!n.site_name) throw new Error("Nama website wajib diisi.");
        if (!/^#[0-9a-fA-F]{6}$/.test(n.theme_color)) throw new Error("Warna tema tidak valid.");
        n.whatsapp = g("whatsapp").replace(/\D/g, "");
        if (n.whatsapp && !/^62\d{8,13}$/.test(n.whatsapp)) throw new Error("WhatsApp harus diawali 62, contoh 6281234567890.");
        n.email = g("email"); if (n.email && !isEmail(n.email)) throw new Error("Email tidak valid.");
        for (const k of ["instagram", "facebook", "youtube"]) { n[k] = g(k); if (n[k] && !isUrl(n[k])) throw new Error(`Tautan ${k} harus diawali http:// atau https://.`); }
        const up = {};
        for (const k of ["logo", "favicon", "hero_image"]) { const nm = await A.uploadImage($("#file_" + k).files[0], k === "hero_image" ? 5 : 2); if (nm) { up[k] = nm; uploaded.push(nm); } }
        await saveSettings({ ...n, ...up }); dbDone = true;
        await A.removeFiles(Object.keys(up).map(k => s[k]));
        A.log("Memperbarui pengaturan website"); A.toast("Pengaturan berhasil disimpan.");
        A.routes.settings();
      } catch (x) { if (!dbDone) await A.removeFiles(uploaded); A.err(x); btn.disabled = false; }
    };
  };

  /* ============ TENTANG DESA ============ */
  const VP = { history: "Sejarah desa", profile: "Profil desa", vision_mission: "Visi dan misi", nature_potential: "Potensi alam", culture: "Budaya dan tradisi", local_wisdom: "Kearifan lokal", products: "Produk unggulan" };
  A.routes.village = async () => {
    const d = (await must(sb.from("village_profile").select("*").eq("id", 1).maybeSingle())).data || {};
    A.mount("Kelola Tentang Desa", "village", `<form class="cardx" id="f"><div class="row g-3">
      <p class="text-muted small mb-0">Teks polos. Pisahkan paragraf dengan baris kosong. Bagian yang dikosongkan tidak ditampilkan.</p>
      ${Object.entries(VP).map(([k, l]) => `<div class="col-12"><label class="form-label" for="${k}">${esc(l)}</label><textarea class="form-control" id="${k}" name="${k}" rows="4" maxlength="5000">${esc(d[k] ?? "")}</textarea></div>`).join("")}
      <div class="col-12"><label class="form-label">Foto pendukung (JPG/PNG/WebP)</label><input class="form-control" type="file" id="imgIn" accept="${IMG_ACCEPT}">${d.image ? `<img class="mt-2 rounded" style="max-height:110px" src="${esc(fileUrl(d.image))}" alt="Foto saat ini">` : ""}</div>
      <div class="col-12"><button class="btn btn-forest px-4" id="sv">Simpan</button></div></div></form>`);
    $("#f").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sv"); btn.disabled = true; let nm = null, dbDone = false;
      try {
        const fd = new FormData(e.target), v = { id: 1 };
        Object.keys(VP).forEach(k => v[k] = String(fd.get(k) || "").trim().slice(0, 5000));
        nm = await A.uploadImage($("#imgIn").files[0]); if (nm) v.image = nm;
        await must(sb.from("village_profile").upsert(v, { onConflict: "id" })); dbDone = true;
        if (nm) await A.removeFiles([d.image]);
        A.log("Memperbarui Tentang Desa"); A.toast("Profil desa berhasil disimpan."); A.routes.village();
      } catch (x) { if (!dbDone && nm) await A.removeFiles([nm]); A.err(x); btn.disabled = false; }
    };
  };

  /* ============ INFORMASI LOKASI & KONTAK ============ */
  const SEC = {
    location: ["Kelola Informasi Lokasi", [["address", "Alamat desa", "text", 255], ["maps_url", "Tautan Google Maps (salin dari tombol Bagikan di Google Maps)", "url", 500], ["access_info", "Petunjuk perjalanan", "area", 500], ["transport", "Informasi transportasi", "area", 500]]],
    contact: ["Kelola Kontak", [["phone", "Nomor telepon", "text", 30], ["whatsapp", "WhatsApp (awali 62, contoh 6281234567890)", "wa", 20], ["email", "Email", "email", 120], ["service_hours", "Jam pelayanan", "text", 100], ["instagram", "Instagram", "url", 300], ["facebook", "Facebook", "url", 300], ["youtube", "YouTube", "url", 300]]]
  };
  A.routes.contact = async a => {
    const sec = SEC[a[0]] ? a[0] : "location", [title, fields] = SEC[sec], s = await getSettings();
    A.mount(title, sec, `<form class="cardx" id="f"><div class="row g-3">${fields.map(([k, l, ty, max]) => `<div class="col-12"><label class="form-label" for="${k}">${esc(l)}</label>` +
      (ty === "area" ? `<textarea class="form-control" id="${k}" name="${k}" rows="3" maxlength="${max}">${esc(s[k] ?? "")}</textarea>` : `<input class="form-control" id="${k}" name="${k}" maxlength="${max}" value="${esc(s[k] ?? "")}">`) + "</div>").join("")}
      <div class="col-12"><button class="btn btn-forest px-4" id="sv">Simpan</button></div></div></form>`);
    $("#f").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sv"); btn.disabled = true;
      try {
        const fd = new FormData(e.target), v = {};
        for (const [k, l, ty, max] of fields) {
          let x = String(fd.get(k) || "").trim().slice(0, max);
          if (ty === "wa") { x = x.replace(/\D/g, ""); if (x && !/^62\d{8,13}$/.test(x)) throw new Error("WhatsApp harus diawali 62."); }
          if (ty === "email" && x && !isEmail(x)) throw new Error("Email tidak valid.");
          if (ty === "url" && x && !isUrl(x)) throw new Error(`${l} harus diawali http:// atau https://.`);
          v[k] = x;
        }
        await saveSettings(v); A.log("Memperbarui " + title); A.toast("Perubahan berhasil disimpan.");
      } catch (x) { A.err(x); }
      btn.disabled = false;
    };
  };

  /* ============ PERMINTAAN KUNJUNGAN ============ */
  const ST = { baru: "Baru", diproses: "Diproses", dikonfirmasi: "Dikonfirmasi", selesai: "Selesai", dibatalkan: "Dibatalkan" };
  const CL = { baru: "primary", diproses: "info", dikonfirmasi: "success", selesai: "secondary", dibatalkan: "danger" };
  A.routes.requests = async () => {
    const { data } = await must(sb.from("visit_requests").select("*").order("id", { ascending: false }).limit(200));
    const root = A.mount("Pesan & Permintaan Kunjungan", "requests", `<div class="cardx"><div class="row g-2 mb-3">
      <div class="col-md-5"><input class="form-control" id="q" placeholder="Cari nama atau telepon"></div>
      <div class="col-6 col-md-3"><select class="form-select" id="fs"><option value="">Semua status</option>${Object.entries(ST).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div></div>
      <p class="small text-muted">Permintaan kunjungan bukan reservasi terkonfirmasi sampai pengelola menghubungi pengunjung dan mengubah status menjadi Dikonfirmasi.</p><div id="tbl"></div></div>`);
    const draw = () => {
      const q = $("#q").value.toLowerCase(), fs = $("#fs").value;
      const rows = data.filter(r => (r.visitor_name + " " + r.phone).toLowerCase().includes(q) && (!fs || r.status === fs));
      $("#tbl").innerHTML = !rows.length ? '<p class="text-muted mb-0">Belum ada permintaan.</p>' :
        `<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Masuk</th><th>Pengunjung</th><th>Destinasi</th><th>Kunjungan</th><th>Status</th><th class="text-end">Aksi</th></tr></thead><tbody>` +
        rows.map(r => { let wa = r.phone.replace(/\D/g, ""); if (wa.startsWith("0")) wa = "62" + wa.slice(1);
          return `<tr><td class="small text-nowrap">${esc(A.fmt(r.created_at))}</td><td class="fw-semibold">${esc(r.visitor_name)}<div class="small fw-normal"><a href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${esc(r.phone)}</a></div></td>
          <td>${esc(r.destination_name)}</td><td class="small">${esc(r.visit_date)}<br>${+r.visitors} orang</td>
          <td><select class="form-select form-select-sm border-${CL[r.status]}" data-st="${r.id}" aria-label="Status">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></td>
          <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary" data-act="show" data-id="${r.id}"><i class="bi bi-eye"></i> Detail</button> <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${r.id}" aria-label="Hapus"><i class="bi bi-trash"></i></button></td></tr>`; }).join("") + "</tbody></table></div>";
    };
    root.addEventListener("input", e => { if (e.target.id === "q") draw(); });
    root.addEventListener("change", async e => {
      if (e.target.id === "fs") return draw();
      const id = e.target.dataset && e.target.dataset.st; if (!id) return;
      try {
        await must(sb.from("visit_requests").update({ status: e.target.value }).eq("id", +id));
        data.find(r => r.id === +id).status = e.target.value;
        A.log(`Status permintaan #${id} menjadi ${e.target.value}`); A.toast("Status diperbarui."); draw();
      } catch (x) { A.err(x); }
    });
    root.addEventListener("click", async e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const r = data.find(x => x.id === +b.dataset.id);
      if (b.dataset.act === "show") {
        const box = document.createElement("div");
        [["Nama", r.visitor_name], ["Telepon", r.phone], ["Email", r.email || "-"], ["Destinasi", r.destination_name], ["Tanggal kunjungan", r.visit_date], ["Jumlah pengunjung", r.visitors + " orang"], ["Pesan", r.message || "-"], ["Dikirim", A.fmt(r.created_at)]].forEach(([k, v]) => {
          const p = document.createElement("p"), s = document.createElement("b"); p.className = "mb-2"; p.style.whiteSpace = "pre-wrap"; s.textContent = k + ": "; p.append(s, document.createTextNode(v)); box.append(p);
        });
        return A.info("Detail permintaan", box);
      }
      if (!await A.confirm(`Permintaan dari "${r.visitor_name}" akan dihapus permanen.`, "Hapus permintaan?")) return;
      try { await must(sb.from("visit_requests").delete().eq("id", r.id)); data.splice(data.indexOf(r), 1); A.log(`Menghapus permintaan #${r.id}`); A.toast("Permintaan dihapus."); draw(); } catch (x) { A.err(x); }
    });
    draw();
  };

  /* ============ AKUN ADMIN ============ */
  A.routes.admins = async () => {
    const me = A.me, sup = me.role === "superadmin";
    const all = sup ? (await must(sb.from("admins").select("*").order("created_at"))).data : [];
    A.mount("Kelola Akun Admin", "admins", `<div class="row g-4"><div class="col-lg-5"><form class="cardx" id="fp"><h2 class="h6 fw-bold">Akun saya</h2>
      <label class="form-label">Email (untuk login)</label><input class="form-control mb-2" value="${esc(me.email)}" disabled>
      <label class="form-label">Username</label><input class="form-control mb-2" name="username" required minlength="2" maxlength="50" value="${esc(me.username)}">
      <label class="form-label">Password baru (kosongkan jika tidak diganti)</label><input class="form-control mb-2" type="password" name="np" minlength="10" autocomplete="new-password">
      <label class="form-label">Ulangi password baru</label><input class="form-control mb-2" type="password" name="np2" autocomplete="new-password">
      <label class="form-label">Password saat ini (wajib untuk menyimpan)</label><input class="form-control mb-3" type="password" name="cur" required autocomplete="current-password">
      <button class="btn btn-forest" id="svp">Simpan akun</button></form></div>
      ${sup ? `<div class="col-lg-7"><div class="cardx mb-4"><h2 class="h6 fw-bold">Daftar akun admin</h2><div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Username</th><th>Peran</th><th>Status</th><th>Dibuat</th><th></th></tr></thead><tbody>
      ${all.map(r => `<tr><td>${esc(r.username)}<div class="small text-muted">${esc(r.email)}</div></td><td>${esc(r.role)}</td><td>${r.is_active ? '<span class="badge text-bg-success">Aktif</span>' : '<span class="badge text-bg-secondary">Nonaktif</span>'}</td><td class="small">${esc((r.created_at || "").slice(0, 10))}</td>
      <td>${r.id !== me.id ? `<button class="btn btn-sm btn-outline-secondary" data-tg="${r.id}">${r.is_active ? "Nonaktifkan" : "Aktifkan"}</button>` : ""}</td></tr>`).join("")}</tbody></table></div></div>
      <form class="cardx" id="fa"><h2 class="h6 fw-bold">Tambah akun admin</h2><div class="row g-2">
      <div class="col-md-6"><input class="form-control" name="username" placeholder="Username" required minlength="2" maxlength="50"></div>
      <div class="col-md-6"><input class="form-control" type="email" name="email" placeholder="Email" required></div>
      <div class="col-md-6"><input class="form-control" type="password" name="password" placeholder="Password (min. 10 karakter)" minlength="10" required autocomplete="new-password"></div>
      <div class="col-md-6"><select class="form-select" name="role"><option value="admin">Admin (kelola konten)</option><option value="superadmin">Superadmin (kelola akun)</option></select></div>
      <div class="col-12"><button class="btn btn-forest" id="sva">Tambah akun</button></div></div></form></div>` : ""}</div>`);

    $("#fp").onsubmit = async e => {
      e.preventDefault(); const btn = $("#svp"); btn.disabled = true;
      try {
        const fd = new FormData(e.target), u = String(fd.get("username")).trim(), np = String(fd.get("np")), cur = String(fd.get("cur"));
        if (u.length < 2) throw new Error("Username minimal 2 karakter.");
        if (np && (np.length < 10 || np !== String(fd.get("np2")))) throw new Error("Password baru minimal 10 karakter dan harus sama dengan konfirmasi.");
        const { error: pe } = await sb.auth.signInWithPassword({ email: me.email, password: cur });
        if (pe) throw new Error("Password saat ini salah.");
        await must(sb.from("admins").update({ username: u }).eq("id", me.id)); me.username = u;
        if (np) { const { error } = await sb.auth.updateUser({ password: np }); if (error) throw error; }
        A.log("Memperbarui akun sendiri"); A.toast("Akun berhasil diperbarui.");
        $("#who").innerHTML = `<i class="bi bi-person-circle"></i> ${esc(u)} (${esc(me.role)})`; A.routes.admins();
      } catch (x) { A.err(x); btn.disabled = false; }
    };
    if (!sup) return;
    $$("[data-tg]").forEach(b => b.onclick = async () => {
      const r = all.find(x => x.id === b.dataset.tg);
      if (!await A.confirm(`Ubah status aktif akun "${r.username}"?`, "Ubah status akun?", "Ya, ubah")) return;
      try { await must(sb.from("admins").update({ is_active: !r.is_active }).eq("id", r.id)); A.log("Mengubah status aktif akun " + r.username); A.toast("Status akun diperbarui."); A.routes.admins(); } catch (x) { A.err(x); }
    });
    $("#fa").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sva"); btn.disabled = true;
      try {
        const fd = new FormData(e.target), body = { username: String(fd.get("username")).trim(), email: String(fd.get("email")).trim(), password: String(fd.get("password")), role: fd.get("role") };
        if (body.password.length < 10) throw new Error("Password minimal 10 karakter.");
        const { data: { session } } = await sb.auth.getSession();
        const res = await fetch("/.netlify/functions/create-admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify(body) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || "Gagal menambah akun. Pastikan Netlify Function sudah aktif (lihat README).");
        A.log("Menambah akun admin: " + body.username); A.toast("Akun admin ditambahkan."); A.routes.admins();
      } catch (x) { A.err(x); btn.disabled = false; }
    };
  };
})();
