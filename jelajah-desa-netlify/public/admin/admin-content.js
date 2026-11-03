"use strict";
/* Modul: Destinasi, Aktivitas, Galeri, Berita, Testimoni. */
(function () {
  const A = window.ADM, { sb, esc, fileUrl, $, $$, must } = A;
  const IMG_ACCEPT = "image/jpeg,image/png,image/webp";
  const thumb = (n, w = 64, h = 48) => n ? `<img src="${esc(fileUrl(n))}" alt="" width="${w}" height="${h}" style="object-fit:cover;border-radius:8px">` : "";
  const badge = (on, a, b) => `<span class="badge text-bg-${on ? "success" : "secondary"}">${on ? a : b}</span>`;
  const moveBtns = id => ["up", "down"].map(a => `<button class="btn btn-sm btn-outline-secondary" data-act="${a}" data-id="${id}" aria-label="Geser ${a === "up" ? "ke atas" : "ke bawah"}"><i class="bi bi-arrow-${a}"></i></button>`).join(" ");
  const preview = (input, box, h = 90) => input.addEventListener("change", () => {
    box.innerHTML = "";
    [...input.files].forEach(f => { const i = document.createElement("img"); i.src = URL.createObjectURL(f); i.style.cssText = `max-height:${h}px;border-radius:8px`; box.append(i); });
  });

  /* ================= DESTINASI ================= */
  const DEST = { name: 150, category: 80, short_desc: 300, full_desc: 5000, location: 255, access_info: 2000, ticket_price: 100, open_hours: 100, facilities: 1000 };

  async function destList() {
    const { data } = await must(sb.from("destinations").select("*").order("sort_order").order("id"));
    const cats = [...new Set(data.map(r => r.category))].sort();
    const root = A.mount("Kelola Destinasi Wisata", "destinations", `<div class="cardx">
      <div class="row g-2 mb-3">
        <div class="col-md-4"><input class="form-control" id="q" placeholder="Cari nama atau lokasi"></div>
        <div class="col-6 col-md-2"><select class="form-select" id="fs"><option value="">Semua status</option><option value="published">Dipublikasikan</option><option value="draft">Draft</option></select></div>
        <div class="col-6 col-md-3"><select class="form-select" id="fc"><option value="">Semua kategori</option>${cats.map(c => `<option>${esc(c)}</option>`).join("")}</select></div>
        <div class="col-md-3"><a class="btn btn-forest w-100" href="#/destinations/new"><i class="bi bi-plus-lg"></i> Tambah</a></div>
      </div><div id="tbl"></div></div>`);
    const draw = () => {
      const q = $("#q").value.toLowerCase(), s = $("#fs").value, c = $("#fc").value;
      const rows = data.filter(r => (r.name + " " + (r.location || "")).toLowerCase().includes(q) && (!s || r.status === s) && (!c || r.category === c));
      $("#tbl").innerHTML = !rows.length ? `<p class="text-muted mb-0">Belum ada destinasi${q || s || c ? " yang cocok dengan filter" : ". Klik Tambah untuk membuat yang pertama"}.</p>` :
        `<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Foto</th><th>Nama</th><th>Kategori</th><th>Status</th><th>Diperbarui</th><th class="text-end">Aksi</th></tr></thead><tbody>` +
        rows.map(r => `<tr><td>${thumb(r.main_image)}</td><td class="fw-semibold">${esc(r.name)}<div class="small text-muted fw-normal">${esc(r.slug)}</div></td><td>${esc(r.category)}</td>
          <td>${badge(r.status === "published", "Dipublikasikan", "Draft")}</td><td class="small text-nowrap">${esc(A.fmt(r.updated_at))}</td>
          <td class="text-end text-nowrap">${moveBtns(r.id)} <a class="btn btn-sm btn-outline-primary" href="#/destinations/${r.id}"><i class="bi bi-pencil"></i> Edit</a>
          <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${r.id}" aria-label="Hapus"><i class="bi bi-trash"></i></button></td></tr>`).join("") + "</tbody></table></div>";
    };
    ["input", "change"].forEach(ev => root.addEventListener(ev, e => { if (["q", "fs", "fc"].includes(e.target.id)) draw(); }));
    root.onclick = async e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const id = +b.dataset.id;
      try {
        if (b.dataset.act === "del") {
          const d = data.find(r => r.id === id);
          if (!await A.confirm(`"${d.name}" beserta semua fotonya akan dihapus permanen.`, "Hapus destinasi?")) return;
          const { data: imgs } = await must(sb.from("destination_images").select("image").eq("destination_id", id));
          await must(sb.from("destinations").delete().eq("id", id));
          await A.removeFiles([d.main_image, ...imgs.map(x => x.image)]);
          A.log("Menghapus destinasi: " + d.name); A.toast("Destinasi berhasil dihapus.");
        } else { await A.reorder("destinations", id, b.dataset.act); A.toast("Urutan diperbarui."); }
        destList();
      } catch (x) { A.err(x); }
    };
    draw();
  }

  async function destForm(id) {
    let d = {}, extra = [];
    if (id) {
      const r = await sb.from("destinations").select("*").eq("id", id).maybeSingle();
      if (r.error) throw r.error; if (!r.data) { A.toast("Destinasi tidak ditemukan.", "danger"); location.hash = "#/destinations"; return; }
      d = r.data;
      extra = (await must(sb.from("destination_images").select("*").eq("destination_id", id).order("id"))).data;
    }
    const cats = [...new Set(["Wisata Alam", "Air Terjun & Sungai", "Pegunungan & Bukit", "Pantai & Danau", "Wisata Budaya", "Wisata Kuliner", "Edukasi & Perkebunan",
      ...(await must(sb.from("destinations").select("category"))).data.map(r => r.category)])];
    const v = k => esc(d[k] ?? "");
    const root = A.mount(id ? "Edit Destinasi" : "Tambah Destinasi", "destinations", `<form class="cardx" id="f"><div class="row g-3">
      <div class="col-md-8"><label class="form-label">Nama destinasi *</label><input class="form-control" name="name" required maxlength="150" value="${v("name")}"></div>
      <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" name="status"><option value="draft">Draft (tidak tampil)</option><option value="published" ${d.status === "published" ? "selected" : ""}>Dipublikasikan</option></select></div>
      <div class="col-md-6"><label class="form-label">Kategori *</label><input class="form-control" name="category" list="cats" required maxlength="80" value="${v("category")}"><datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join("")}</datalist></div>
      <div class="col-md-6"><label class="form-label">Slug URL (opsional, otomatis dari nama)</label><input class="form-control" name="slug" maxlength="160" value="${v("slug")}"></div>
      <div class="col-12"><label class="form-label">Deskripsi singkat * (tampil di kartu)</label><textarea class="form-control" name="short_desc" rows="2" maxlength="300" required>${v("short_desc")}</textarea></div>
      <div class="col-12"><label class="form-label">Deskripsi lengkap</label><textarea class="form-control" name="full_desc" rows="5" maxlength="5000">${v("full_desc")}</textarea></div>
      <div class="col-md-6"><label class="form-label">Lokasi</label><input class="form-control" name="location" maxlength="255" value="${v("location")}"></div>
      <div class="col-md-3"><label class="form-label">Harga tiket</label><input class="form-control" name="ticket_price" maxlength="100" placeholder="Rp10.000 atau Gratis" value="${v("ticket_price")}"></div>
      <div class="col-md-3"><label class="form-label">Jam operasional</label><input class="form-control" name="open_hours" maxlength="100" placeholder="08.00 - 17.00" value="${v("open_hours")}"></div>
      <div class="col-md-6"><label class="form-label">Petunjuk akses</label><textarea class="form-control" name="access_info" rows="3" maxlength="2000">${v("access_info")}</textarea></div>
      <div class="col-md-6"><label class="form-label">Fasilitas (satu per baris)</label><textarea class="form-control" name="facilities" rows="3" maxlength="1000">${v("facilities")}</textarea></div>
      <div class="col-md-6"><label class="form-label">Foto utama (JPG/PNG/WebP, maks. 3 MB)</label><input class="form-control" type="file" id="mainIn" accept="${IMG_ACCEPT}">
        <div id="mainPrev" class="mt-2">${d.main_image ? `<img class="rounded border" style="max-height:110px" src="${esc(fileUrl(d.main_image))}" alt="Foto utama saat ini">` : ""}</div></div>
      <div class="col-md-6"><label class="form-label">Tambah foto galeri (boleh banyak, maks. 8 sekali unggah)</label><input class="form-control" type="file" id="extraIn" multiple accept="${IMG_ACCEPT}"></div>
      ${extra.length ? `<div class="col-12"><label class="form-label">Foto galeri saat ini (centang untuk menghapus)</label><div class="d-flex flex-wrap gap-3">${extra.map(x => `<label class="text-center small">${thumb(x.image, 96, 72).replace("<img", '<img style="display:block;object-fit:cover;border-radius:8px"')}<input type="checkbox" name="del_img" value="${x.id}"> hapus</label>`).join("")}</div></div>` : ""}
      <div class="col-12 d-flex gap-2"><button class="btn btn-forest px-4" id="sv">Simpan</button><a class="btn btn-light" href="#/destinations">Batal</a></div>
    </div></form>`);
    preview($("#mainIn"), $("#mainPrev"), 110);

    $("#f").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sv"); btn.disabled = true;
      const uploaded = []; let dbDone = false;
      try {
        const fd = new FormData(e.target), v = {};
        for (const [k, m] of Object.entries(DEST)) v[k] = String(fd.get(k) || "").trim().slice(0, m);
        v.status = fd.get("status") === "published" ? "published" : "draft";
        for (const [k, l] of [["name", "Nama"], ["category", "Kategori"], ["short_desc", "Deskripsi singkat"]]) if (!v[k]) throw new Error(`${l} wajib diisi.`);
        v.slug = await A.uniqueSlug("destinations", A.slugify(String(fd.get("slug") || "").trim() || v.name, "destinasi"), id || null);
        const newMain = await A.uploadImage($("#mainIn").files[0]); if (newMain) uploaded.push(newMain);
        const newExtra = []; for (const f of [...$("#extraIn").files].slice(0, 8)) { const n = await A.uploadImage(f); uploaded.push(n); newExtra.push(n); }
        let destId = id;
        if (id) {
          await must(sb.from("destinations").update({ ...v, ...(newMain ? { main_image: newMain } : {}) }).eq("id", id));
          dbDone = true;
          if (newMain) await A.removeFiles([d.main_image]);
          const del = $$('input[name="del_img"]:checked').map(x => +x.value);
          if (del.length) {
            await must(sb.from("destination_images").delete().in("id", del));
            await A.removeFiles(extra.filter(x => del.includes(x.id)).map(x => x.image));
          }
        } else {
          v.sort_order = await A.nextOrder("destinations"); v.main_image = newMain;
          destId = (await must(sb.from("destinations").insert(v).select("id").single())).data.id;
          dbDone = true;
        }
        if (newExtra.length) await must(sb.from("destination_images").insert(newExtra.map(image => ({ destination_id: destId, image }))));
        A.log((id ? "Mengubah" : "Menambah") + " destinasi: " + v.name);
        A.toast(id ? "Destinasi berhasil diperbarui." : "Destinasi berhasil ditambahkan.");
        location.hash = "#/destinations";
      } catch (x) { if (!dbDone) await A.removeFiles(uploaded); A.err(x); btn.disabled = false; }
    };
  }
  A.routes.destinations = a => a[0] === "new" ? destForm(null) : a[0] ? destForm(+a[0]) : destList();

  /* ================= CRUD GENERIK ================= */
  // Field: [kolom, label, tipe(text|textarea|rating|status|bool), maks, wajib]
  const MODULES = {
    activities: { table: "activities", title: "Aktivitas Wisata", order: true, image: "image", label: "name", cols: { duration: "Durasi", price: "Harga" },
      fields: [["name", "Nama aktivitas", "text", 150, 1], ["description", "Deskripsi", "textarea", 2000, 1], ["duration", "Durasi kegiatan", "text", 60, 0], ["price", "Harga (jika ada)", "text", 100, 0], ["requirements", "Persyaratan", "textarea", 1000, 0], ["status", "Status", "status"]] },
    gallery: { table: "gallery", title: "Galeri Foto", order: true, image: "image", imageRequired: true, bulk: true, label: "title", cols: { category: "Kategori" },
      fields: [["title", "Judul foto", "text", 150, 1], ["caption", "Caption", "text", 300, 0], ["category", "Kategori (mis. Destinasi, Budaya, Kuliner, Pemandangan)", "text", 60, 0], ["is_visible", "Tampilkan di website", "bool"]] },
    testimonials: { table: "testimonials", title: "Testimoni", order: false, image: "photo", label: "visitor_name", cols: { rating: "Rating" },
      fields: [["visitor_name", "Nama pengunjung", "text", 100, 1], ["comment", "Komentar", "textarea", 1000, 1], ["rating", "Rating", "rating"], ["is_demo", 'Tandai sebagai data demo (akan diberi label "Data demo" di website)', "bool"], ["is_visible", "Tampilkan di website", "bool"]] },
    articles: { table: "articles", title: "Berita & Artikel", order: false, image: "cover_image", label: "title", cols: { category: "Kategori", published_at: "Tgl terbit" }, slug: true,
      fields: [["title", "Judul artikel", "text", 200, 1], ["content", "Isi artikel (pisahkan paragraf dengan baris kosong; HTML tidak diizinkan)", "textarea", 20000, 1], ["category", "Kategori", "text", 80, 0], ["status", "Status", "status"]] }
  };

  async function crud(a) {
    const key = a[0], M = MODULES[key];
    if (!M) return A.mount("Tidak ditemukan", "", '<div class="cardx">Modul tidak ditemukan.</div>');
    if (a[1] === "new") return crudForm(key, M, null);
    if (a[1]) return crudForm(key, M, +a[1]);
    return crudList(key, M);
  }
  A.routes.crud = crud;

  async function crudList(key, M) {
    const img = M.image, vis = ["gallery", "testimonials"].includes(key) ? "is_visible" : "status";
    let q = sb.from(M.table).select("*");
    q = M.order ? q.order("sort_order").order("id") : q.order("id", { ascending: false });
    const { data: rows } = await must(q);
    const root = A.mount("Kelola " + M.title, key, `<div class="cardx"><div class="d-flex mb-3"><a class="btn btn-forest ms-auto" href="#/crud/${key}/new"><i class="bi bi-plus-lg"></i> Tambah</a></div>` +
      (!rows.length ? '<p class="text-muted mb-0">Belum ada data. Klik Tambah untuk membuat yang pertama.</p>' :
        `<div class="table-responsive"><table class="table align-middle"><thead><tr>${img ? "<th>Foto</th>" : ""}<th>Nama</th>${Object.values(M.cols).map(l => `<th>${esc(l)}</th>`).join("")}<th>Status</th><th class="text-end">Aksi</th></tr></thead><tbody>` +
        rows.map(r => {
          const on = vis === "status" ? r.status === "published" : !!r.is_visible;
          return `<tr>${img ? `<td>${thumb(r[img])}</td>` : ""}<td class="fw-semibold">${esc(r[M.label])}${r.is_demo ? ' <span class="badge text-bg-warning">Demo</span>' : ""}</td>
          ${Object.keys(M.cols).map(c => `<td>${esc(c === "published_at" && r[c] ? new Date(r[c]).toLocaleDateString("id-ID") : r[c])}</td>`).join("")}
          <td>${badge(on, "Tampil", "Disembunyikan")}</td>
          <td class="text-end text-nowrap">${M.order ? moveBtns(r.id) + " " : ""}<a class="btn btn-sm btn-outline-primary" href="#/crud/${key}/${r.id}"><i class="bi bi-pencil"></i> Edit</a>
          <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${r.id}" aria-label="Hapus"><i class="bi bi-trash"></i></button></td></tr>`;
        }).join("") + "</tbody></table></div>") + "</div>");
    root.onclick = async e => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const id = +b.dataset.id;
      try {
        if (b.dataset.act === "del") {
          const d = rows.find(r => r.id === id);
          if (!await A.confirm(`"${d[M.label]}" akan dihapus permanen beserta fotonya.`)) return;
          await must(sb.from(M.table).delete().eq("id", id));
          if (img) await A.removeFiles([d[img]]);
          A.log(`Menghapus ${M.title}: ${d[M.label]}`); A.toast("Data berhasil dihapus.");
        } else { await A.reorder(M.table, id, b.dataset.act); A.toast("Urutan diperbarui."); }
        crudList(key, M);
      } catch (x) { A.err(x); }
    };
  }

  async function crudForm(key, M, id) {
    const img = M.image;
    let d = {};
    if (id) {
      const r = await sb.from(M.table).select("*").eq("id", id).maybeSingle();
      if (r.error) throw r.error; if (!r.data) { A.toast("Data tidak ditemukan.", "danger"); location.hash = "#/crud/" + key; return; }
      d = r.data;
    }
    const multi = !id && M.bulk, H = k => esc(d[k] ?? "");
    const fieldsHtml = M.fields.map(f => {
      const [c, l, ty, max, req] = f, r = req ? "required" : "";
      if (ty === "bool") return `<div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" name="${c}" id="f_${c}" ${(id ? d[c] : c === "is_visible") ? "checked" : ""}><label class="form-check-label" for="f_${c}">${esc(l)}</label></div></div>`;
      let input;
      if (ty === "textarea") input = `<textarea class="form-control" id="f_${c}" name="${c}" rows="${max > 5000 ? 12 : 4}" maxlength="${max}" ${r}>${H(c)}</textarea>`;
      else if (ty === "rating") input = `<select class="form-select" id="f_${c}" name="${c}">${[5, 4, 3, 2, 1].map(i => `<option value="${i}" ${(d[c] ?? 5) == i ? "selected" : ""}>${i} bintang</option>`).join("")}</select>`;
      else if (ty === "status") input = `<select class="form-select" id="f_${c}" name="${c}"><option value="draft">Draft (tidak tampil)</option><option value="published" ${d[c] === "published" ? "selected" : ""}>Dipublikasikan</option></select>`;
      else input = `<input class="form-control" id="f_${c}" name="${c}" maxlength="${max}" value="${H(c)}" ${r}>`;
      return `<div class="col-12"><label class="form-label" for="f_${c}">${esc(l)}${req ? " *" : ""}</label>${input}</div>`;
    }).join("");
    A.mount((id ? "Ubah " : "Tambah ") + M.title, key, `<form class="cardx" id="f"><div class="row g-3">${fieldsHtml}
      ${img ? `<div class="col-12"><label class="form-label">${multi ? "Foto (boleh pilih banyak, maks. 20)" : id ? "Ganti foto (kosongkan jika tidak diganti)" : "Foto"} - JPG/PNG/WebP, maks. 3 MB${M.imageRequired ? " *" : ""}</label>
        <input class="form-control" type="file" id="imgIn" ${multi ? "multiple" : ""} accept="${IMG_ACCEPT}"><div id="prev" class="d-flex flex-wrap gap-2 mt-2">${d[img] ? `<img src="${esc(fileUrl(d[img]))}" alt="Foto saat ini" style="max-height:110px;border-radius:8px">` : ""}</div></div>` : ""}
      <div class="col-12 d-flex gap-2"><button class="btn btn-forest px-4" id="sv">Simpan</button><a class="btn btn-light" href="#/crud/${key}">Batal</a></div></div></form>`);
    if (img) preview($("#imgIn"), $("#prev"));

    $("#f").onsubmit = async e => {
      e.preventDefault(); const btn = $("#sv"); btn.disabled = true;
      const uploaded = []; let dbDone = false;
      try {
        const fd = new FormData(e.target), v = {};
        for (const f of M.fields) {
          const [c, l, ty, max, req] = f, raw = fd.get(c);
          v[c] = ty === "rating" ? Math.max(1, Math.min(5, parseInt(raw, 10) || 5)) : ty === "status" ? (raw === "published" ? "published" : "draft") :
            ty === "bool" ? fd.has(c) : String(raw || "").trim().slice(0, max);
          if (req && v[c] === "") throw new Error(`${l} wajib diisi.`);
        }
        if (M.slug) {
          if (id) v.slug = d.slug; else v.slug = await A.uniqueSlug(M.table, A.slugify(v.title, "artikel"), null);
          v.published_at = v.status === "published" ? (d.published_at || new Date().toISOString()) : (d.published_at || null);
          if (!id) { v.author_id = A.me.id; v.author_name = A.me.username; }
        }
        const files = img ? [...$("#imgIn").files].slice(0, multi ? 20 : 1) : [];
        for (const f of files) { const n = await A.uploadImage(f); uploaded.push(n); }
        if (M.imageRequired && !id && !uploaded.length) throw new Error("Pilih minimal satu foto.");
        if (id) {
          await must(sb.from(M.table).update({ ...v, ...(uploaded[0] ? { [img]: uploaded[0] } : {}) }).eq("id", id));
          dbDone = true;
          if (uploaded[0]) await A.removeFiles([d[img]]);
        } else {
          const base = M.order ? await A.nextOrder(M.table) : 0;
          const list = (uploaded.length ? uploaded : [null]).map((n, k) => {
            const row = { ...v }; if (uploaded.length > 1 && row.title) row.title += " " + (k + 1);
            if (M.order) row.sort_order = base + k; if (img) row[img] = n; return row;
          });
          await must(sb.from(M.table).insert(list));
          dbDone = true;
        }
        A.log((id ? "Mengubah " : "Menambah ") + M.title); A.toast("Data berhasil disimpan.");
        location.hash = "#/crud/" + key;
      } catch (x) { if (!dbDone) await A.removeFiles(uploaded); A.err(x); btn.disabled = false; }
    };
  }
})();
