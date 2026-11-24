/* لوحة إدارة حكاية من قرية – صوت الماضي */
(function () {
  "use strict";

  const OVERRIDE_KEY = "hikaya_admin_override_v1";
  const PASS_KEY = "hikaya_admin_pass_hash_v1";
  const SESSION_KEY = "hikaya_admin_ok";
  const API_KEY = "hikaya_sheet_api_url";
  const API_SECRET = "hikaya_sheet_api_secret";

  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let DATA = null;
  let currentTab = "stories";
  let editing = null; // {kind, id}

  /* ========== بوابة الدخول ========== */
  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function initGate() {
    const hasPass = !!localStorage.getItem(PASS_KEY);
    if (sessionStorage.getItem(SESSION_KEY) === "1") return enter();
    if (!hasPass) {
      $("#gateText").textContent = "أول استخدام للوحة: أنشئ رمز إدارة خاص بك (يُحفظ على هذا الجهاز).";
      $("#gateInput").placeholder = "الرمز الجديد";
      $("#gateInput2").style.display = "block";
      $("#gateBtn").textContent = "إنشاء الرمز والدخول";
    }
    $("#gateBtn").addEventListener("click", tryEnter);
    $("#gateInput").addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });
    $("#gateInput2").addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });
  }

  async function tryEnter() {
    const v = $("#gateInput").value.trim();
    const hasPass = !!localStorage.getItem(PASS_KEY);
    if (!v) return;
    if (!hasPass) {
      const v2 = $("#gateInput2").value.trim();
      if (v.length < 4) { $("#gateErr").textContent = "الرمز قصير جدًا (٤ أحرف على الأقل)."; $("#gateErr").style.display = "block"; return; }
      if (v !== v2) { $("#gateErr").textContent = "الرمزان غير متطابقين."; $("#gateErr").style.display = "block"; return; }
      localStorage.setItem(PASS_KEY, await sha256(v));
      sessionStorage.setItem(SESSION_KEY, "1");
      return enter();
    }
    if (await sha256(v) === localStorage.getItem(PASS_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      enter();
    } else {
      $("#gateErr").textContent = "الرمز غير صحيح.";
      $("#gateErr").style.display = "block";
    }
  }

  function enter() {
    $("#gate").style.display = "none";
    $("#adminShell").style.display = "block";
    loadData();
    bindTabs();
    render();
  }

  $("#logoutBtn") && $("#logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  /* ========== البيانات ========== */
  function loadData() {
    try {
      const raw = localStorage.getItem(OVERRIDE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.stories) { DATA = mergeShape(d); return; }
      }
    } catch (e) {}
    DATA = JSON.parse(JSON.stringify(window.SITE_DATA));
  }

  // إكمال أي حقول جديدة من النسخة الأساسية (تظهر مع تحديثات الموقع)
  function mergeShape(d) {
    const base = window.SITE_DATA;
    for (const k of Object.keys(base)) {
      if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(base[k]));
    }
    // دمج مفاتيح إظهار الأقسام الجديدة دون إلغاء اختيارات محفوظة
    if (base.sectionVisibility) {
      d.sectionVisibility = Object.assign(JSON.parse(JSON.stringify(base.sectionVisibility)), d.sectionVisibility || {});
    }
    return d;
  }

  function save() {
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(DATA));
      msg("تم الحفظ. التعديلات ظاهرة الآن على الموقع في هذا المتصفح.", "ok");
      return true;
    } catch (e) {
      msg("مساحة التخزين المحلية ممتلئة. قلّل حجم الصور/الصوتيات أو استخدم المزامنة مع Google.", "err");
      return false;
    }
  }

  function msg(text, kind) {
    const el = $("#adminMsg");
    el.className = "admin-msg " + kind;
    el.textContent = text;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "admin-msg"; }, 6000);
  }

  /* ========== الوسائط ========== */
  function readImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) return reject(new Error("not-image"));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, (maxDim || 1600) / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality || 0.82));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function readFileDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ========== التبويبات ========== */
  function bindTabs() {
    $("#adminTabs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      $("#adminTabs").querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      currentTab = b.dataset.tab;
      editing = null;
      render();
    }));
    // دعم فتح تبويب مباشرة عبر # في الرابط (admin.html#sections)
    const h = (location.hash || "").replace("#", "");
    if (h) {
      const btn = $("#adminTabs").querySelector(`button[data-tab="${h}"]`);
      if (btn) btn.click();
    }
  }

  function render() {
    const p = $("#panel");
    if (currentTab === "stories") renderStories(p);
    else if (currentTab === "sections") renderSectionsTab(p);
    else if (currentTab === "elders") renderEldersTab(p);
    else if (currentTab === "activities") renderActivities(p);
    else if (currentTab === "gallery") renderGalleryTab(p);
    else if (currentTab === "press") renderPressTab(p);
    else if (currentTab === "partners") renderPartnersTab(p);
    else if (currentTab === "team") renderTeamTab(p);
    else if (currentTab === "data") renderDataTab(p);
  }

  /* ========== الحكايات ========== */
  function renderStories(p) {
    p.innerHTML = `
      <h2>الحكايات (${DATA.stories.length})</h2>
      <p class="hint">تعديل النصوص والأغلفة والتسجيلات الصوتية. يمكن استبدال تسجيل أي حكاية بملف صوتي جديد (MP3)، أو حذف التسجيل مؤقتًا دون حذف الحكاية.</p>
      <div class="admin-list">
        ${DATA.stories.map(s => `
          <div class="admin-item">
            <img src="${esc(s.cover)}" alt="">
            <div>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.desc)}</p>
              <p>${s.audio ? '<span class="badge-ok">يوجد تسجيل صوتي</span>' : "بدون تسجيل"} · ${String(s.text || "").length} حرف نص</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${s.id}">تعديل</button>
              <button class="abtn danger" data-del="${s.id}">حذف</button>
            </div>
          </div>`).join("")}
      </div>
      <div class="form-actions"><button class="abtn primary" id="addStory">＋ إضافة حكاية جديدة</button></div>
      <div id="formHost"></div>`;

    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => storyForm(+b.dataset.edit)));
    p.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      const s = DATA.stories.find(x => x.id === +b.dataset.del);
      if (s && confirm(`حذف حكاية «${s.title}» من الموقع؟`)) {
        DATA.stories = DATA.stories.filter(x => x.id !== s.id);
        if (save()) render();
      }
    }));
    $("#addStory").addEventListener("click", () => storyForm(null));
  }

  function storyForm(id) {
    const s = id ? DATA.stories.find(x => x.id === id) : { id: Date.now(), title: "", desc: "", text: "", cover: "", audio: "" };
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>${id ? "تعديل حكاية: " + esc(s.title) : "حكاية جديدة"}</h3>
        <div class="fgrid">
          <div><label>عنوان الحكاية</label><input type="text" id="f_title" value="${esc(s.title)}"></div>
          <div><label>وصف مختصر</label><input type="text" id="f_desc" value="${esc(s.desc)}"></div>
          <div class="wide"><label>نص الحكاية الكامل</label><textarea class="big" id="f_text">${esc(s.text)}</textarea></div>
          <div>
            <label>الغلاف</label>
            <input type="file" id="f_cover" accept="image/*">
            <span class="file-note">اتركه فارغًا للإبقاء على الغلاف الحالي.</span>
            <div class="current-media">${s.cover ? `<img src="${esc(s.cover)}" alt="الغلاف الحالي">` : ""}</div>
          </div>
          <div>
            <label>التسجيل الصوتي (MP3)</label>
            <input type="file" id="f_audio" accept="audio/*">
            <span class="file-note">اتركه فارغًا للإبقاء على التسجيل الحالي. ملفات أكبر من 4 ميجا قد لا تُحفظ محليًا.</span>
            <div class="current-media">
              ${s.audio ? `<audio controls src="${esc(s.audio)}"></audio><button class="abtn danger" type="button" id="f_delaudio">حذف التسجيل</button>` : "لا يوجد تسجيل حالي"}
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ الحكاية</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });

    let newCover = null, newAudio = null, delAudio = false;
    $("#f_cover").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      try { newCover = await readImage(f, 1200, 0.85); msg("تم تجهيز الغلاف الجديد.", "info"); } catch (err) { msg("تعذر قراءة الصورة.", "err"); }
    });
    $("#f_audio").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) msg("تنبيه: الملف كبير وقد لا يُحفظ في التخزين المحلي.", "info");
      try { newAudio = await readFileDataURL(f); delAudio = false; msg("تم تجهيز التسجيل الجديد.", "info"); } catch (err) { msg("تعذر قراءة الملف الصوتي.", "err"); }
    });
    const delBtn = $("#f_delaudio");
    if (delBtn) delBtn.addEventListener("click", () => {
      if (confirm("حذف التسجيل الصوتي الحالي لهذه الحكاية؟ (يبقى النص والغلاف)")) {
        delAudio = true; newAudio = null;
        msg("سيتم حذف التسجيل عند الحفظ.", "info");
      }
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      s.title = $("#f_title").value.trim();
      s.desc = $("#f_desc").value.trim();
      s.text = $("#f_text").value;
      if (!s.title) { msg("اكتب عنوان الحكاية أولًا.", "err"); return; }
      if (newCover) s.cover = newCover;
      if (newAudio) s.audio = newAudio;
      else if (delAudio) s.audio = "";
      if (!id) DATA.stories.push(s);
      if (save()) render();
    });
  }

  /* ========== الأنشطة ========== */
  function renderActivities(p) {
    p.innerHTML = `
      <h2>الأنشطة (${DATA.activities.length})</h2>
      <p class="hint">توثيق الأنشطة الميدانية بصورها الحقيقية، وربط كل نشاط بالحكاية التي ألهمته. لا تُضاف تفاصيل غير موثقة.</p>
      <div class="admin-list">
        ${DATA.activities.map(a => `
          <div class="admin-item">
            ${a.images && a.images[0] ? `<img src="${esc(a.images[0])}" alt="">` : "<div></div>"}
            <div>
              <h3>${esc(a.title)}</h3>
              <p>${esc(a.desc).slice(0, 120)}</p>
              <p>${(a.images || []).length} صورة ${a.place ? "· 📍 " + esc(a.place) : ""} ${a.date ? "· 📅 " + esc(a.date) : ""}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${a.id}">تعديل</button>
              <button class="abtn danger" data-del="${a.id}">حذف</button>
            </div>
          </div>`).join("")}
      </div>
      <div class="form-actions"><button class="abtn primary" id="addAct">＋ إضافة نشاط</button></div>
      <div id="formHost"></div>`;

    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => actForm(b.dataset.edit)));
    p.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      if (confirm("حذف هذا النشاط؟")) {
        DATA.activities = DATA.activities.filter(x => x.id !== b.dataset.del);
        if (save()) render();
      }
    }));
    $("#addAct").addEventListener("click", () => actForm(null));
  }

  function actForm(id) {
    const a = id ? DATA.activities.find(x => x.id === id) : { id: "act-" + Date.now(), storyId: "", title: "", desc: "", place: "", date: "", images: [] };
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>${id ? "تعديل نشاط" : "نشاط جديد"}</h3>
        <div class="fgrid">
          <div><label>عنوان النشاط</label><input type="text" id="f_title" value="${esc(a.title)}"></div>
          <div><label>الحكاية المرتبطة</label><select id="f_story">
            <option value="">بدون ربط</option>
            ${DATA.stories.map(s => `<option value="${s.id}"${s.id === a.storyId ? " selected" : ""}>${esc(s.title)}</option>`).join("")}
          </select></div>
          <div><label>مكان التنفيذ</label><input type="text" id="f_place" value="${esc(a.place)}"></div>
          <div><label>التاريخ</label><input type="date" id="f_date" value="${esc(a.date)}"></div>
          <div class="wide"><label>الوصف (من توثيق واقعي فقط)</label><textarea id="f_desc">${esc(a.desc)}</textarea></div>
          <div class="wide">
            <label>صور النشاط الحقيقية</label>
            <input type="file" id="f_imgs" accept="image/*" multiple>
            <span class="file-note">يمكن اختيار عدة صور. تُضاف إلى الصور الحالية.</span>
            <div class="current-media" id="actImgs">${(a.images || []).map((im, i) => `<img src="${esc(im)}" data-i="${i}" title="اضغط للحذف">`).join("")}</div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ النشاط</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });

    a.images = a.images || [];
    $("#actImgs").addEventListener("click", e => {
      const img = e.target.closest("img[data-i]");
      if (img && confirm("حذف هذه الصورة؟")) { a.images.splice(+img.dataset.i, 1); actFormRefreshImgs(a); }
    });
    function actFormRefreshImgs(act) {
      $("#actImgs").innerHTML = act.images.map((im, i) => `<img src="${esc(im)}" data-i="${i}" title="اضغط للحذف">`).join("");
    }
    $("#f_imgs").addEventListener("change", async e => {
      for (const f of [...e.target.files].slice(0, 12)) {
        try { a.images.push(await readImage(f, 1600, 0.8)); } catch (err) {}
      }
      actFormRefreshImgs(a);
      msg("تمت إضافة الصور.", "info");
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      a.title = $("#f_title").value.trim();
      a.desc = $("#f_desc").value.trim();
      a.place = $("#f_place").value.trim();
      a.date = $("#f_date").value;
      a.storyId = $("#f_story").value ? +$("#f_story").value : "";
      if (!a.title) { msg("اكتب عنوان النشاط أولًا.", "err"); return; }
      if (!id) DATA.activities.push(a);
      if (save()) render();
    });
  }

  /* ========== أقسام الموقع: إظهار/إخفاء ========== */
  const SECTION_DEFS = [
    ["hero", "الواجهة الرئيسية", "البانر الأول بصورة المبادرة وأزرار البداية"],
    ["elders", "الشيوخ", "مساحة رسائل الشيوخ أعلى مكتبة الحكايات"],
    ["stories", "مكتبة الحكايات", "بطاقات الحكايات الست مع الصوت والنص"],
    ["visuals", "معرض الصور", "الصور الأصلية ومجموعات التنفيذ والحفل الختامي"],
    ["activities", "الأنشطة", "توثيق الأنشطة الميدانية المرتبطة بالحكايات"],
    ["initiative", "عن المبادرة", "تعريف مبادرة حكاية من قرية"],
    ["press", "الصحافة والإعلام", "أرشيف الأخبار والمقالات عن المبادرة"],
    ["partners", "شركاء النجاح", "شعارات وروابط الشركاء"],
    ["team", "فريق عمل المبادرة", "أعضاء الفريق والخانات المحجوزة"]
  ];

  function renderSectionsTab(p) {
    const vis = DATA.sectionVisibility = DATA.sectionVisibility || {};
    p.innerHTML = `
      <h2>أقسام الموقع</h2>
      <p class="hint">تحكم في ظهور أي قسم على الموقع العام. القسم المخفي يختفي من الصفحة ومن شريط التنقل، ويعود بضغطة واحدة دون فقدان محتواه.</p>
      <div class="admin-list">
        ${SECTION_DEFS.map(([id, label, desc]) => {
          const on = vis[id] !== false;
          return `
          <div class="admin-item section-toggle-item">
            <div class="section-toggle-dot${on ? " on" : ""}"></div>
            <div>
              <h3>${esc(label)}</h3>
              <p>${esc(desc)}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn ${on ? "danger" : "primary"}" data-toggle-section="${id}">${on ? "إخفاء" : "إظهار"}</button>
            </div>
          </div>`;
        }).join("")}
      </div>`;
    p.querySelectorAll("[data-toggle-section]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.toggleSection;
      vis[id] = vis[id] === false ? true : false;
      if (save()) render();
    }));
  }

  /* ========== الشيوخ ========== */
  function renderEldersTab(p) {
    const em = DATA.eldersMessages;
    p.innerHTML = `
      <h2>الشيوخ: رسائل كبار شمال سيناء للأطفال</h2>
      <p class="hint">هذه المساحة تظهر أعلى مكتبة الحكايات. المحتوى الحالي «نموذج مؤقت»: لا تنشر اسمًا أو نصًا أو صورة أو تسجيلًا حقيقيًا إلا بعد اعتماد صاحب المشروع للمتحدثين والمواد.</p>
      <div class="admin-form">
        <h3>عنوان ومقدمة المساحة</h3>
        <div class="fgrid">
          <div class="wide"><label>العنوان</label><input type="text" id="em_title" value="${esc(em.title)}"></div>
          <div class="wide"><label>المقدمة</label><textarea id="em_intro">${esc(em.intro)}</textarea></div>
        </div>
        <div class="form-actions"><button class="abtn primary" id="em_saveHead">حفظ العنوان والمقدمة</button></div>
      </div>
      <div class="admin-list">
        ${em.items.map(m => `
          <div class="admin-item">
            ${m.portrait ? `<img src="${esc(m.portrait)}" alt="" style="border-radius:50%">` : "<div></div>"}
            <div>
              <h3>${esc(m.name)} ${m.placeholder ? '<span class="ph-flag">مؤقت</span>' : '<span class="badge-ok">معتمد</span>'}</h3>
              <p>${esc(m.text).slice(0, 100)}</p>
              <p>${m.audio ? '<span class="badge-ok">يوجد تسجيل</span>' : "بدون تسجيل"}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${m.id}">تعديل</button>
            </div>
          </div>`).join("")}
      </div>
      <div id="formHost"></div>`;

    $("#em_saveHead").addEventListener("click", () => {
      em.title = $("#em_title").value.trim() || em.title;
      em.intro = $("#em_intro").value.trim();
      if (save()) render();
    });
    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => elderForm(b.dataset.edit)));
  }

  function elderForm(id) {
    const em = DATA.eldersMessages;
    const m = em.items.find(x => x.id === id);
    if (!m) return;
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>تعديل رسالة</h3>
        <div class="fgrid">
          <div><label>اسم المتحدث</label><input type="text" id="f_name" value="${esc(m.name)}"></div>
          <div>
            <label>حالة الاعتماد</label>
            <select id="f_ph">
              <option value="1"${m.placeholder ? " selected" : ""}>مؤقت — بانتظار الاعتماد</option>
              <option value="0"${m.placeholder ? "" : " selected"}>معتمد من صاحب المشروع</option>
            </select>
          </div>
          <div class="wide"><label>نص الرسالة</label><textarea class="big" id="f_text">${esc(m.text)}</textarea></div>
          <div>
            <label>صورة المتحدث</label>
            <input type="file" id="f_portrait" accept="image/*">
            <span class="file-note">اتركه فارغًا للإبقاء على الحالي.</span>
            <div class="current-media">${m.portrait ? `<img src="${esc(m.portrait)}" style="border-radius:50%">` : ""}</div>
          </div>
          <div>
            <label>التسجيل الصوتي (MP3)</label>
            <input type="file" id="f_audio" accept="audio/*">
            <span class="file-note">اتركه فارغًا للإبقاء على الحالي.</span>
            <div class="current-media">${m.audio ? `<audio controls src="${esc(m.audio)}"></audio>` : "لا يوجد تسجيل"}</div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ الرسالة</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });
    let newPortrait = null, newAudio = null;
    $("#f_portrait").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (f) { try { newPortrait = await readImage(f, 800, 0.88); msg("تم تجهيز الصورة.", "info"); } catch (err) {} }
    });
    $("#f_audio").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) msg("تنبيه: الملف كبير وقد لا يُحفظ محليًا.", "info");
      try { newAudio = await readFileDataURL(f); msg("تم تجهيز التسجيل.", "info"); } catch (err) { msg("تعذر قراءة الملف.", "err"); }
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      m.name = $("#f_name").value.trim() || m.name;
      m.text = $("#f_text").value;
      m.placeholder = $("#f_ph").value === "1";
      if (newPortrait) m.portrait = newPortrait;
      if (newAudio) m.audio = newAudio;
      if (save()) render();
    });
  }

  /* ========== مجموعات الصور الميدانية ========== */
  function renderGalleryTab(p) {
    const groups = DATA.galleryGroups || [];
    p.innerHTML = `
      <h2>معرض الصور الميدانية (${groups.length} مجموعات)</h2>
      <p class="hint">مجموعتا التنفيذ الميداني ومجموعة الحفل الختامي. أضف الصور الحقيقية هنا عند توافرها؛ المجموعة الفارغة تظهر للزوار بخانات «صورة قادمة».</p>
      <div class="admin-list">
        ${groups.map(g => `
          <div class="admin-item">
            ${g.images && g.images[0] ? `<img src="${esc(g.images[0].src || g.images[0])}" alt="">` : "<div></div>"}
            <div>
              <h3>${esc(g.title)}</h3>
              <p>${(g.images || []).length} صورة ${(g.images || []).length ? "" : "· تظهر كخانات مؤقتة"}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${g.id}">تعديل المجموعة</button>
            </div>
          </div>`).join("")}
      </div>
      <div id="formHost"></div>`;
    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => ggroupForm(b.dataset.edit)));
  }

  function ggroupForm(id) {
    const g = (DATA.galleryGroups || []).find(x => x.id === id);
    if (!g) return;
    g.images = g.images || [];
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>تعديل: ${esc(g.title)}</h3>
        <div class="fgrid">
          <div class="wide"><label>عنوان المجموعة</label><input type="text" id="f_title" value="${esc(g.title)}"></div>
          <div class="wide"><label>ملاحظة تظهر تحت العنوان</label><input type="text" id="f_note" value="${esc(g.note || "")}"></div>
          <div class="wide">
            <label>صور المجموعة</label>
            <input type="file" id="f_imgs" accept="image/*" multiple>
            <span class="file-note">يمكن اختيار عدة صور. اضغط على صورة حالية لحذفها.</span>
            <div class="current-media" id="ggImgs">${g.images.map((im, i) => `<img src="${esc(im.src || im)}" data-i="${i}" title="اضغط للحذف">`).join("")}</div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ المجموعة</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });
    const refresh = () => { $("#ggImgs").innerHTML = g.images.map((im, i) => `<img src="${esc(im.src || im)}" data-i="${i}" title="اضغط للحذف">`).join(""); };
    $("#ggImgs").addEventListener("click", e => {
      const img = e.target.closest("img[data-i]");
      if (img && confirm("حذف هذه الصورة؟")) { g.images.splice(+img.dataset.i, 1); refresh(); }
    });
    $("#f_imgs").addEventListener("change", async e => {
      for (const f of [...e.target.files].slice(0, 18)) {
        try { g.images.push({ src: await readImage(f, 1600, 0.8), caption: "" }); } catch (err) {}
      }
      refresh();
      msg("تمت إضافة الصور.", "info");
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      g.title = $("#f_title").value.trim() || g.title;
      g.note = $("#f_note").value.trim();
      if (save()) render();
    });
  }

  /* ========== الصحافة ========== */
  function renderPressTab(p) {
    const cats = DATA.pressCategories;
    p.innerHTML = `
      <h2>أرشيف الصحافة والإعلام (${DATA.press.length})</h2>
      <p class="hint">كل عنصر هنا هو «خبر أو مقال عن المبادرة»: صورة الخبر + نص المقال + رابطه الأصلي عند توفره. لا تُضاف أسماء جهات دون مادة منشورة حقيقية.</p>
      <div class="admin-list">
        ${DATA.press.map(it => `
          <div class="admin-item">
            ${it.cover ? `<img src="${esc(it.cover)}" alt="">` : "<div></div>"}
            <div>
              <h3>${esc(it.title || it.headline)}</h3>
              <p>${it.outlet ? esc(it.outlet) + " " : ""}${it.date ? "· " + esc(it.date) : ""}</p>
              <p>${esc((cats.find(c => c.id === it.category) || {}).label || "بدون تصنيف")} · ${(it.photos || []).length} صورة إضافية</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${it.id}">تعديل</button>
              <button class="abtn danger" data-del="${it.id}">حذف</button>
            </div>
          </div>`).join("")}
      </div>
      ${DATA.press.length ? "" : '<p class="hint">الأرشيف فارغ حاليًا — القسم جاهز ويظهر للزوار برسالة مرتبة.</p>'}
      <div class="form-actions"><button class="abtn primary" id="addPress">＋ إضافة تغطية إعلامية</button></div>
      <div id="formHost"></div>`;

    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => pressForm(b.dataset.edit)));
    p.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
      if (confirm("حذف هذه التغطية من الأرشيف؟")) {
        DATA.press = DATA.press.filter(x => x.id !== b.dataset.del);
        if (save()) render();
      }
    }));
    $("#addPress").addEventListener("click", () => pressForm(null));
  }

  function pressForm(id) {
    const it = id ? DATA.press.find(x => x.id === id) : { id: "pr-" + Date.now(), category: "news", outlet: "", title: "", date: "", url: "", text: "", image: "", photos: [] };
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>${id ? "تعديل الخبر / المقال" : "خبر أو مقال جديد عن المبادرة"}</h3>
        <div class="fgrid">
          <div><label>التصنيف</label><select id="f_cat">${DATA.pressCategories.map(c => `<option value="${c.id}"${c.id === it.category ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</select></div>
          <div><label>جهة النشر (اختياري)</label><input type="text" id="f_outlet" value="${esc(it.outlet)}" placeholder="اسم الصحيفة أو الموقع إن وُجد"></div>
          <div><label>تاريخ النشر</label><input type="date" id="f_date" value="${esc(it.date)}"></div>
          <div class="wide"><label>عنوان الخبر أو المقال</label><input type="text" id="f_title" value="${esc(it.title || it.headline || "")}"></div>
          <div class="wide"><label>رابط الخبر الأصلي (اختياري)</label><input type="url" id="f_url" value="${esc(it.url)}" placeholder="https://..." dir="ltr"></div>
          <div class="wide"><label>نص المقال / الخبر عن المبادرة</label><textarea class="big" id="f_text">${esc(it.text || it.description || "")}</textarea></div>
          <div>
            <label>صورة الخبر أو المقال</label>
            <input type="file" id="f_cover" accept="image/*">
            <div class="current-media">${(it.image || it.cover) ? `<img src="${esc(it.image || it.cover)}">` : ""}</div>
          </div>
          <div>
            <label>صور إضافية من التغطية (اختياري)</label>
            <input type="file" id="f_photos" accept="image/*" multiple>
            <div class="current-media" id="pressPhotos">${(it.photos || []).map((ph, i) => `<img src="${esc(ph)}" data-i="${i}" title="اضغط للحذف">`).join("")}</div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });

    it.photos = it.photos || [];
    $("#pressPhotos").addEventListener("click", e => {
      const img = e.target.closest("img[data-i]");
      if (img && confirm("حذف هذه الصورة؟")) { it.photos.splice(+img.dataset.i, 1); pressPhotosRefresh(it); }
    });
    function pressPhotosRefresh(x) {
      $("#pressPhotos").innerHTML = x.photos.map((ph, i) => `<img src="${esc(ph)}" data-i="${i}" title="اضغط للحذف">`).join("");
    }
    let newCover = null;
    $("#f_cover").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (f) { try { newCover = await readImage(f, 1600, 0.8); msg("تم تجهيز الغلاف.", "info"); } catch (err) {} }
    });
    $("#f_photos").addEventListener("change", async e => {
      for (const f of [...e.target.files].slice(0, 12)) {
        try { it.photos.push(await readImage(f, 1400, 0.78)); } catch (err) {}
      }
      pressPhotosRefresh(it);
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      it.category = $("#f_cat").value;
      it.outlet = $("#f_outlet").value.trim();
      it.title = $("#f_title").value.trim();
      it.headline = it.title; // توافق مع النسخ السابقة
      it.date = $("#f_date").value;
      it.url = $("#f_url").value.trim();
      it.text = $("#f_text").value.trim();
      it.description = it.text;
      if (newCover) { it.image = newCover; it.cover = newCover; }
      delete it.author;
      if (!it.title) { msg("اكتب عنوان الخبر أو المقال أولًا.", "err"); return; }
      if (!id) DATA.press.push(it);
      if (save()) render();
    });
  }

  /* ========== الشركاء ========== */
  function renderPartnersTab(p) {
    p.innerHTML = `
      <h2>شركاء النجاح (${DATA.partners.length})</h2>
      <p class="hint">الشعارات الأصلية دون تعديل. لا يُربط أي حساب بجهة دون التأكد منه من صاحب المشروع.</p>
      <div class="admin-list">
        ${DATA.partners.map(pt => `
          <div class="admin-item">
            <img src="${esc(pt.logo)}" alt="" style="object-fit:contain;background:#fff">
            <div>
              <h3>${esc(pt.name)}</h3>
              <p dir="ltr" style="text-align:right">${esc(pt.facebook)}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${pt.id}">تعديل</button>
            </div>
          </div>`).join("")}
      </div>
      <div id="formHost"></div>`;

    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => partnerForm(b.dataset.edit)));
  }

  function partnerForm(id) {
    const pt = DATA.partners.find(x => x.id === id);
    if (!pt) return;
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>تعديل شريك: ${esc(pt.name)}</h3>
        <div class="fgrid">
          <div class="wide"><label>اسم الجهة</label><input type="text" id="f_name" value="${esc(pt.name)}"></div>
          <div class="wide"><label>رابط فيسبوك (صفحة الشريك)</label><input type="url" id="f_fb" value="${esc(pt.facebook)}" dir="ltr"></div>
          <div class="wide"><label>رابط منشور فيسبوك ذي صلة بالمبادرة (اختياري)</label><input type="url" id="f_post" value="${esc(pt.postUrl || "")}" dir="ltr" placeholder="https://www.facebook.com/.../posts/..."></div>
          <div class="wide"><label>ملاحظة عن الرابط (تظهر داخل اللوحة فقط)</label><input type="text" id="f_note" value="${esc(pt.note || "")}"></div>
          <div>
            <label>استبدال الشعار (يُفضَّل الإبقاء على الأصلي)</label>
            <input type="file" id="f_logo" accept="image/*">
            <div class="current-media"><img src="${esc(pt.logo)}" style="object-fit:contain;background:#fff"></div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });
    let newLogo = null;
    $("#f_logo").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (f) { try { newLogo = await readImage(f, 800, 0.9); msg("تم تجهيز الشعار.", "info"); } catch (err) {} }
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      pt.name = $("#f_name").value.trim() || pt.name;
      pt.facebook = $("#f_fb").value.trim();
      pt.postUrl = $("#f_post").value.trim();
      pt.note = $("#f_note").value.trim();
      if (newLogo) pt.logo = newLogo;
      if (save()) render();
    });
  }

  /* ========== الفريق ========== */
  function renderTeamTab(p) {
    p.innerHTML = `
      <h2>فريق عمل المبادرة (${DATA.team.length})</h2>
      <p class="hint">صورة كل شخص أمام اسمه الصحيح، مع رابط فيسبوك ورقم الهاتف المعتمدين.</p>
      <div class="admin-list">
        ${DATA.team.map(m => `
          <div class="admin-item">
            ${m.photo ? `<img src="${esc(m.photo)}" alt="" style="border-radius:50%">` : `<div class="team-ph-sm">؟</div>`}
            <div>
              <h3>${esc(m.name)} ${m.placeholder ? '<span class="ph-flag">خانة محجوزة</span>' : ""}</h3>
              <p>${esc(m.role)}</p>
              <p dir="ltr" style="text-align:right">${esc(m.phone || "—")} · ${esc(m.facebook || "—")}</p>
            </div>
            <div class="admin-item-actions">
              <button class="abtn primary" data-edit="${m.id}">تعديل</button>
            </div>
          </div>`).join("")}
      </div>
      <div id="formHost"></div>`;

    p.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => teamForm(b.dataset.edit)));
  }

  function teamForm(id) {
    const m = DATA.team.find(x => x.id === id);
    if (!m) return;
    const host = $("#formHost");
    host.innerHTML = `
      <div class="admin-form">
        <h3>تعديل عضو: ${esc(m.name)} ${m.placeholder ? '<span class="ph-flag">خانة محجوزة</span>' : ""}</h3>
        <div class="fgrid">
          <div><label>الاسم</label><input type="text" id="f_name" value="${esc(m.name)}"></div>
          <div><label>الصفة</label><input type="text" id="f_role" value="${esc(m.role)}"></div>
          <div><label>رقم الهاتف (اختياري)</label><input type="tel" id="f_phone" value="${esc(m.phone)}" dir="ltr"></div>
          <div><label>رابط فيسبوك (اختياري)</label><input type="url" id="f_fb" value="${esc(m.facebook)}" dir="ltr"></div>
          <div>
            <label>حالة العضو</label>
            <select id="f_ph">
              <option value="1"${m.placeholder ? " selected" : ""}>خانة محجوزة — البيانات لاحقًا</option>
              <option value="0"${m.placeholder ? "" : " selected"}>عضو معتمد بالبيانات</option>
            </select>
          </div>
          <div>
            <label>استبدال الصورة</label>
            <input type="file" id="f_photo" accept="image/*">
            <div class="current-media">${m.photo ? `<img src="${esc(m.photo)}" style="border-radius:50%">` : ""}</div>
          </div>
        </div>
        <div class="form-actions">
          <button class="abtn primary" id="f_save">حفظ</button>
          <button class="abtn" id="f_cancel">إلغاء</button>
        </div>
      </div>`;
    host.scrollIntoView({ behavior: "smooth" });
    let newPhoto = null;
    $("#f_photo").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (f) { try { newPhoto = await readImage(f, 800, 0.88); msg("تم تجهيز الصورة.", "info"); } catch (err) {} }
    });
    $("#f_cancel").addEventListener("click", () => { host.innerHTML = ""; });
    $("#f_save").addEventListener("click", () => {
      m.name = $("#f_name").value.trim() || m.name;
      m.role = $("#f_role").value.trim();
      m.phone = $("#f_phone").value.trim();
      m.facebook = $("#f_fb").value.trim();
      m.placeholder = $("#f_ph").value === "1";
      if (newPhoto) m.photo = newPhoto;
      if (save()) render();
    });
  }

  /* ========== النسخ والمزامنة ========== */
  function renderDataTab(p) {
    const apiUrl = localStorage.getItem(API_KEY) || "";
    p.innerHTML = `
      <h2>النسخ الاحتياطي والمزامنة</h2>
      <p class="hint">صدّر نسخة كاملة من المحتوى (JSON) للاحتفاظ بها أو نقلها، واربط اللوحة بجدول Google Sheet عبر Apps Script لمشاركة المحتوى بين الأجهزة.</p>
      <div class="admin-form">
        <h3>إعدادات عامة</h3>
        <div class="fgrid">
          <div class="wide"><label>سطر الحقوق أسفل الموقع (footer)</label><input type="text" id="f_credit" value="${esc(DATA.meta.footerCredit || "")}"></div>
          <div><label>حالة السطر</label><select id="f_creditPending">
            <option value="1"${DATA.meta.footerCreditPending ? " selected" : ""}>مؤقت — بانتظار الاعتماد</option>
            <option value="0"${DATA.meta.footerCreditPending ? "" : " selected"}>معتمد</option>
          </select></div>
        </div>
        <div class="form-actions"><button class="abtn primary" id="saveCredit">حفظ سطر الحقوق</button></div>
      </div>
      <div class="admin-form">
        <h3>النسخ الاحتياطي</h3>
        <div class="form-actions" style="margin-top:0">
          <button class="abtn primary" id="exportBtn">تصدير المحتوى (JSON)</button>
          <label class="abtn" style="margin:0">استيراد ملف محتوى<input type="file" id="importFile" accept="application/json" style="display:none"></label>
          <button class="abtn danger" id="resetBtn">استعادة المحتوى الأصلي</button>
        </div>
      </div>
      <div class="admin-form">
        <h3>المزامنة مع Google Sheet (Apps Script)</h3>
        <div class="fgrid">
          <div class="wide"><label>رابط تطبيق Apps Script المنشور</label><input type="url" id="f_api" value="${esc(apiUrl)}" dir="ltr" placeholder="https://script.google.com/macros/s/.../exec"></div>
          <div class="wide"><label>رمز الحماية (نفس المفتاح في كود Apps Script)</label><input type="text" id="f_secret" value="${esc(localStorage.getItem(API_SECRET) || "")}" dir="ltr"></div>
        </div>
        <div class="form-actions">
          <button class="abtn" id="saveApi">حفظ إعدادات المزامنة</button>
          <button class="abtn" id="pullBtn">سحب المحتوى من الجدول</button>
          <button class="abtn" id="pushBtn">رفع المحتوى إلى الجدول</button>
        </div>
        <span class="file-note">خطوات إعداد Apps Script موجودة في ملف README داخل مجلد المشروع (apps-script/Code.gs).</span>
      </div>`;

    $("#saveCredit").addEventListener("click", () => {
      DATA.meta.footerCredit = $("#f_credit").value.trim();
      DATA.meta.footerCreditPending = $("#f_creditPending").value === "1";
      if (save()) render();
    });
    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "hikaya-content-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      msg("تم تصدير ملف المحتوى.", "ok");
    });
    $("#importFile").addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d.stories) throw new Error("bad");
        DATA = d;
        if (save()) render();
      } catch (err) { msg("الملف غير صالح.", "err"); }
    });
    $("#resetBtn").addEventListener("click", () => {
      if (confirm("استعادة المحتوى الأصلي للموقع؟ ستفقد كل تعديلات اللوحة على هذا الجهاز.")) {
        localStorage.removeItem(OVERRIDE_KEY);
        loadData();
        msg("تمت الاستعادة.", "ok");
        render();
      }
    });
    $("#saveApi").addEventListener("click", () => {
      localStorage.setItem(API_KEY, $("#f_api").value.trim());
      localStorage.setItem(API_SECRET, $("#f_secret").value.trim());
      localStorage.removeItem("hikaya_remote_cache");
      msg("تم حفظ إعدادات المزامنة.", "ok");
    });
    $("#pullBtn").addEventListener("click", async () => {
      const url = $("#f_api").value.trim();
      if (!url) { msg("أدخل رابط Apps Script أولًا.", "err"); return; }
      try {
        const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=data");
        const d = await res.json();
        if (!d.stories) throw new Error("bad");
        DATA = d;
        localStorage.setItem("hikaya_remote_cache", JSON.stringify({ t: Date.now() }));
        if (save()) render();
      } catch (err) { msg("تعذر السحب من الجدول. تأكد من الرابط والنشر.", "err"); }
    });
    $("#pushBtn").addEventListener("click", async () => {
      const url = $("#f_api").value.trim();
      if (!url) { msg("أدخل رابط Apps Script أولًا.", "err"); return; }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ secret: $("#f_secret").value.trim(), data: DATA })
        });
        const out = await res.json();
        if (out && out.ok) { localStorage.setItem("hikaya_remote_cache", JSON.stringify({ t: Date.now() })); msg("تم رفع المحتوى إلى الجدول.", "ok"); }
        else msg("رفض الجدول الحفظ: " + (out && out.error ? out.error : "خطأ غير معروف"), "err");
      } catch (err) { msg("تعذر الرفع إلى الجدول.", "err"); }
    });
  }

  document.addEventListener("DOMContentLoaded", initGate);
})();
