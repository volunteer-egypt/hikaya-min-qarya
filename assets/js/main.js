/* حكاية من قرية – صوت الماضي | منطق الموقع الرئيسي */
(function () {
  "use strict";

  const OVERRIDE_KEY = "hikaya_admin_override_v1";
  const API_KEY = "hikaya_sheet_api_url";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // دمج أي حقول جديدة من النسخة الأساسية داخل نسخة محفوظة قديمة
  function mergeShape(d) {
    const base = window.SITE_DATA;
    for (const k of Object.keys(base)) {
      if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(base[k]));
    }
    // دمج مفاتيح إظهار الأقسام الجديدة دون إلغاء اختيارات محفوظة
    if (base.sectionVisibility) {
      d.sectionVisibility = Object.assign(JSON.parse(JSON.stringify(base.sectionVisibility)), d.sectionVisibility || {});
    }
    // روابط النشر إعداد برمجي وليست محتوى: تُؤخذ دائمًا من النسخة المضمّنة
    if (base.meta) {
      d.meta = Object.assign({}, base.meta, d.meta || {});
      if (base.meta.apiUrl) d.meta.apiUrl = base.meta.apiUrl;
      if (base.meta.adminUrl) d.meta.adminUrl = base.meta.adminUrl;
    }
    // مفاتيح الشعارات المفقودة (مثل شعار الشريك التقني) تُستكمل من النسخة المضمّنة
    if (base.logos) d.logos = Object.assign({}, base.logos, d.logos || {});
    return d;
  }

  function getLocalData() {
    try {
      const raw = localStorage.getItem(OVERRIDE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.stories) return mergeShape(d);
      }
    } catch (e) {}
    return null;
  }

  function getData() {
    return getLocalData() || window.SITE_DATA;
  }

  // مزامنة اختيارية من جدول Google Sheet عبر Apps Script
  async function syncFromSheet() {
    // نسخة مستقلة/بدون إنترنت (file:// أو فتح محلي): المحتوى المضمّن هو المرجع دائمًا
    if (location.protocol !== "https:" && location.protocol !== "http:") return;
    const url = localStorage.getItem(API_KEY) || (window.SITE_DATA.meta && window.SITE_DATA.meta.apiUrl) || "";
    if (!url) return;
    try {
      const cached = JSON.parse(localStorage.getItem("hikaya_remote_cache") || "null");
      if (cached && Date.now() - cached.t < 5 * 60 * 1000) return; // كاش 5 دقائق
      const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=data");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.stories && data.stories.length) {
        localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data));
        localStorage.setItem("hikaya_remote_cache", JSON.stringify({ t: Date.now() }));
      }
    } catch (e) { /* الشبكة غير متاحة: نكمل بالنسخة المحلية */ }
  }

  const AR_NUM = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"];

  /* ---------- إظهار/إخفاء الأقسام ---------- */
  const SECTION_LABELS = {
    hero: "الواجهة الرئيسية",
    elders: "الشيوخ",
    stories: "مكتبة الحكايات",
    visuals: "معرض الصور",
    activities: "الأنشطة",
    initiative: "عن المبادرة",
    press: "الصحافة والإعلام",
    partners: "الشركاء",
    team: "فريق العمل"
  };

  // اسم القسم قابل للتعديل من لوحة الإدارة عبر meta.sectionLabel_<id>
  function secLabel(d, id) {
    return (d && d.meta && d.meta["sectionLabel_" + id]) || SECTION_LABELS[id] || id;
  }

  function sectionVisible(d, id) {
    const v = d.sectionVisibility || {};
    return v[id] !== false;
  }

  function applySectionVisibility(d) {
    Object.keys(SECTION_LABELS).forEach(id => {
      if (id === "elders") {
        const el = document.getElementById("eldersBlock");
        if (el) el.style.display = sectionVisible(d, "elders") ? "" : "none";
        return;
      }
      const sec = document.getElementById(id);
      if (sec) sec.style.display = sectionVisible(d, id) ? "" : "none";
    });
  }

  /* ---------- الهيدر ---------- */
  function renderHeader(active) {
    const d = getData();
    const links = [
      ["index.html", "الرئيسية", ""],
      ["index.html#/stories", "الحكايات", "stories"],
      ["index.html#/media", "الصور والأنشطة", "visuals"],
      ["index.html#/elders", secLabel(d, "elders"), "elders"],
      ["index.html#/initiative", "عن المبادرة", "initiative"],
      ["index.html#/press", "الصحافة والإعلام", "press"],
      ["index.html#/partners", "الشركاء", "partners"],
      ["index.html#/team", "الفريق", "team"]
    ].filter(l => l[2] === "" || sectionVisible(d, l[2]));
    document.getElementById("siteHeader").innerHTML = `
      <div class="wrap">
        <div class="logos-row">
          <div class="logo-box logo-ministry"><img src="${esc(d.logos.ministry)}" alt="شعار وزارة الشباب والرياضة"></div>
          <div class="logo-box logo-youth"><img src="${esc(d.logos.youthClub)}" alt="شعار نادي القيادات الشبابية"></div>
          <a class="logo-box logo-initiative" href="index.html">
            <span class="name">${esc(d.meta.name)}<small>${esc(d.meta.tagline)}</small></span>
            <img src="${esc(d.logos.initiative)}" alt="شعار حكاية من قرية">
          </a>
        </div>
        <div class="nav-row"><nav>${links.map(l => `<a href="${l[0]}"${l[2] === active ? ' class="active"' : ""}>${l[1]}</a>`).join("")}</nav></div>
      </div>`;
  }

  function renderFooter() {
    const d = getData();
    document.getElementById("siteFooter").innerHTML = `
      <img src="${esc(d.logos.initiative)}" alt="شعار المبادرة">
      <p>${esc(d.meta.name)} · ${esc(d.meta.tagline)}</p>
      <small>${esc(d.meta.motto)}</small>
      ${d.meta.footerCredit ? `<br><span class="footer-credit${d.meta.footerCreditPending ? " is-pending" : ""}">${esc(d.meta.footerCredit)}</span>` : ""}
      ${d.logos.techPartner
        ? `<div class="tech-logo-slot has-logo" role="img" aria-label="${esc(d.meta.footerCredit || "الشريك التقني")}"><img src="${esc(d.logos.techPartner)}" alt=""></div>`
        : ""}`;
  }

  /* ---------- الصفحة الرئيسية ---------- */
  function renderHome() {
    const d = getData();
    applySectionVisibility(d);

    // البطل
    document.getElementById("hero").innerHTML = `
      <div class="hero-copy">
        <span class="eyebrow">${esc(d.meta.heroEyebrow)}</span>
        <h1>كل قرية وراها<br><em>حكاية</em></h1>
        <p>${esc(d.meta.heroText)}</p>
        <div class="hero-buttons">
          <a class="btn" href="#stories">ابدأ رحلة الحكايات</a>
          <a class="btn outline" href="#initiative">اعرف المبادرة</a>
        </div>
        <div class="stats">
          <div><strong>٦</strong><span>حكايات صوتية</span></div>
          <div><strong>١</strong><span>رحلة من التراث للأمل</span></div>
          <div><strong>∞</strong><span>حكايات ممكن نضيفها</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <img src="${esc(d.heroImage.src)}" alt="${esc(d.heroImage.alt)}">
        <div class="floating-note">حكاياتنا هويتنا<br>ومستقبلنا</div>
      </div>`;

    // رسائل كبار شمال سيناء للأطفال (أعلى مكتبة الحكايات)
    renderElders(d);

    // الحكايات
    const cards = d.stories.map((s, i) => `
      <article class="story" data-title="${esc(s.title)}">
        <a class="story-link" href="story.html?id=${s.id}">
          <div class="cover"><img src="${esc(s.cover)}" alt="غلاف ${esc(s.title)}" loading="lazy"><span class="badge">${AR_NUM[i] || i + 1}</span></div>
          <div class="body"><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p><span class="read">صفحة الحكاية ←</span></div>
        </a>
        <div class="listen"><label>اسمع الحكاية</label><audio controls preload="none" src="${esc(s.audio)}" aria-label="صوت ${esc(s.title)}"></audio></div>
        <button type="button" class="share-btn" data-share-id="${s.id}" data-share-title="${esc(s.title)}">مشاركة الحكاية ↗</button>
      </article>`).join("");
    document.getElementById("storiesGrid").innerHTML = cards;

    const search = document.getElementById("search");
    const emptyMsg = document.getElementById("empty");
    search.addEventListener("input", () => {
      const q = search.value.trim();
      let shown = 0;
      document.querySelectorAll("#storiesGrid .story").forEach(c => {
        const ok = !q || c.dataset.title.includes(q);
        c.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      emptyMsg.hidden = shown > 0;
    });

    // المعرض
    document.getElementById("galleryGrid").innerHTML = d.gallery.map((g, i) => `
      <figure${i === 0 ? ' class="gallery-main"' : ""}><img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy"><figcaption>${esc(g.caption)}</figcaption></figure>`).join("");
    document.getElementById("coverStrip").innerHTML = d.stories.map((s, i) => `
      <a href="story.html?id=${s.id}"><img src="${esc(s.cover)}" alt="غلاف ${esc(s.title)}" loading="lazy"></a>`).join("");

    // مجموعات الصور الميدانية (التنفيذ + الحفل الختامي)
    renderGalleryGroups(d);

    // الأنشطة
    const acts = d.activities || [];
    document.getElementById("activitiesGrid").innerHTML = acts.length ? acts.map(a => {
      const story = d.stories.find(s => s.id === a.storyId);
      return `
      <article class="activity-card">
        ${a.images && a.images[0] ? `<div class="activity-card-media"><img src="${esc(a.images[0])}" alt="صورة توثيق: ${esc(a.title)}" loading="lazy"></div>` : ""}
        <div class="activity-card-body">
          ${story ? `<span class="activity-story-tag">${esc(story.title)}</span>` : ""}
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.desc)}</p>
          ${(a.place || a.date) ? `<div class="activity-meta">${a.place ? `<span>📍 ${esc(a.place)}</span>` : ""}${a.date ? `<span>📅 ${esc(a.date)}</span>` : ""}</div>` : ""}
        </div>
      </article>`;
    }).join("") : `<p class="empty">سيتم توثيق الأنشطة القادمة هنا.</p>`;

    // عن المبادرة
    document.getElementById("aboutBlock").innerHTML = `
      <img src="${esc(d.logos.initiative)}" alt="شعار مبادرة حكاية من قرية">
      <div>
        <span class="eyebrow">عن المبادرة</span>
        <h2>حكاياتنا هويتنا</h2>
        <p>${esc(d.meta.aboutText1)}</p>
        <p>${esc(d.meta.aboutText2)}</p>
        <strong class="tagline">${esc(d.meta.aboutTagline)}</strong>
      </div>`;

    renderPress(d);
    renderPartners(d);
    renderTeam(d);
  }

  /* ---------- الشيوخ ---------- */
  function renderElders(d) {
    const host = document.getElementById("eldersBlock");
    if (!host) return;
    const em = d.eldersMessages;
    if (!em || !em.items) { host.innerHTML = ""; return; }
    const realItems = em.items.filter(m => !m.placeholder);
    host.innerHTML = `
      <div class="elders-head">
        <span class="eyebrow">${esc(em.title)}</span>
        <p>${esc(em.intro)}</p>
      </div>
      <div class="elders-grid">
        ${realItems.map(m => `
          <article class="elder-card${m.placeholder ? " is-placeholder" : ""}">
            <div class="elder-portrait">
              ${m.portrait ? `<img src="${esc(m.portrait)}" alt="صورة ${esc(m.name)}" loading="lazy">`
                : `<div class="ph-frame" aria-label="مكان صورة المتحدث"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 19.5c1.6-3.6 4.3-5.4 7.5-5.4s5.9 1.8 7.5 5.4"/></svg><span>الصورة قادمة</span></div>`}
            </div>
            <div class="elder-body">
              <h3>${esc(m.name)}</h3>
              <p>${esc(m.text)}</p>
              ${m.audio ? `<audio controls preload="none" src="${esc(m.audio)}" aria-label="رسالة صوتية: ${esc(m.name)}"></audio>`
                : `<span class="ph-audio">التسجيل الصوتي يُضاف بعد الاعتماد</span>`}
              ${m.placeholder ? `<span class="ph-flag">محتوى مؤقت بانتظار الاعتماد</span>` : ""}
            </div>
          </article>`).join("")}
      </div>`;
  }

  /* ---------- مجموعات الصور الميدانية ---------- */
  function renderGalleryGroups(d) {
    const host = document.getElementById("galleryGroups");
    if (!host) return;
    const groups = (d.galleryGroups || []).filter(g => (g.images || []).length);
    host.innerHTML = groups.map(g => `
      <div class="ggroup">
        <div class="ggroup-head">
          <h3>${esc(g.title)}</h3>
          ${g.note ? `<p>${esc(g.note)}</p>` : ""}
        </div>
        <div class="ggroup-grid">
          ${(g.images || []).map(im => `<figure><img src="${esc(im.src || im)}" alt="${esc(im.caption || g.title)}" loading="lazy" data-zoom>${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ""}</figure>`).join("")}
        </div>
      </div>`).join("");
    // لايت بوكس لصور المجموعات
    host.onclick = e => {
      const img = e.target.closest("img[data-zoom]");
      if (!img) return;
      const lb = document.getElementById("pressLightbox");
      document.getElementById("pressLightboxImage").src = img.src;
      document.getElementById("pressLightboxCaption").textContent = img.alt || "";
      lb.classList.add("open");
    };
  }

  /* ---------- الصحافة ---------- */
  function renderPress(d) {
    const tabsEl = document.getElementById("pressTabs");
    const grid = document.getElementById("pressGrid");
    const empty = document.getElementById("pressEmpty");
    const items = d.press || [];
    const cats = (d.pressCategories || []).filter(c => items.some(p => p.category === c.id));
    window.HK_EMPTY_ROUTES = window.HK_EMPTY_ROUTES || {};
    if (!items.length) {
      window.HK_EMPTY_ROUTES.press = true;
      const sec = document.getElementById("press");
      if (sec) sec.style.display = "none";
      return;
    }
    delete window.HK_EMPTY_ROUTES.press;

    tabsEl.innerHTML = `<button data-cat="" class="active">الكل</button>` + cats.map(c => `<button data-cat="${c.id}">${esc(c.label)}</button>`).join("");

    function draw(cat) {
      const list = cat ? items.filter(p => p.category === cat) : items;
      if (!list.length) {
        grid.innerHTML = "";
        empty.style.display = "block";
        empty.textContent = items.length ? "لا توجد تغطيات في هذا التصنيف بعد." : "الأرشيف جاهز لتوثيق أول تغطية إعلامية للمبادرة. تُضاف التغطيات من لوحة الإدارة.";
        return;
      }
      empty.style.display = "none";
      grid.innerHTML = list.map(p => {
        const title = p.title || p.headline || "";
        const text = p.text || p.description || "";
        const img = p.image || p.cover || "";
        return `
        <article class="press-card">
          ${img ? `<img class="press-cover" src="${esc(img)}" alt="صورة: ${esc(title)}" loading="lazy" data-zoom>` : `<div class="press-cover-empty">▤</div>`}
          <div class="press-body">
            ${p.outlet ? `<span class="press-outlet">${esc(p.outlet)}</span>` : ""}
            <h3>${esc(title)}</h3>
            ${p.date ? `<div class="press-meta"><span>📅 ${esc(p.date)}</span></div>` : ""}
            ${text ? `<p>${esc(text)}</p>` : ""}
            ${p.photos && p.photos.length ? `<div class="press-photo-strip">${p.photos.map((ph, i) => `<img src="${esc(ph)}" alt="صورة من التغطية ${i + 1}" loading="lazy" data-zoom>`).join("")}</div>` : ""}
            ${p.url ? `<div class="press-actions"><a class="press-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">قراءة الخبر الأصلي ↗</a></div>` : ""}
          </div>
        </article>`;
      }).join("");
    }

    tabsEl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      tabsEl.querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      draw(b.dataset.cat);
    }));
    draw("");

    // لايت بوكس
    const lb = document.getElementById("pressLightbox");
    const lbImg = document.getElementById("pressLightboxImage");
    const lbCap = document.getElementById("pressLightboxCaption");
    grid.addEventListener("click", e => {
      const img = e.target.closest("img[data-zoom]");
      if (!img) return;
      lbImg.src = img.src;
      lbCap.textContent = img.alt || "";
      lb.classList.add("open");
    });
    document.getElementById("pressLightboxClose").addEventListener("click", () => lb.classList.remove("open"));
    lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("open"); });
  }

  /* ---------- الشركاء ---------- */
  function renderPartners(d) {
    const grid = document.getElementById("partnersGrid");
    grid.innerHTML = d.partners.map((p, i) => `
      <div class="partner-card" role="button" tabindex="0" data-i="${i}" aria-label="عرض شعار ومعلومات ${esc(p.name)}">
        <div class="partner-logo-frame"><img src="${esc(p.logo)}" alt="شعار ${esc(p.name)}" loading="lazy"></div>
        <strong>${esc(p.name)}</strong>
        <span class="partner-cta">اضغط لعرض الشعار والصفحة</span>
      </div>`).join("");

    const modal = document.getElementById("partnerModal");
    const open = i => {
      const p = d.partners[i];
      if (!p) return;
      document.getElementById("partnerModalImg").src = p.logo;
      document.getElementById("partnerModalImg").alt = "شعار " + p.name;
      document.getElementById("partnerModalName").textContent = p.name;
      const link = document.getElementById("partnerModalLink");
      link.href = p.facebook;
      link.style.display = p.facebook ? "" : "none";
      const post = document.getElementById("partnerModalPost");
      if (p.postUrl) { post.href = p.postUrl; post.style.display = ""; }
      else post.style.display = "none";
      modal.classList.add("open");
    };
    grid.querySelectorAll(".partner-card").forEach(c => {
      c.addEventListener("click", () => open(+c.dataset.i));
      c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(+c.dataset.i); } });
    });
    const close = () => modal.classList.remove("open");
    document.getElementById("partnerModalClose").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- الفريق ---------- */
  function renderTeam(d) {
    const grid = document.getElementById("teamGrid");
    grid.innerHTML = d.team.map((m, i) => [m, i]).filter(pair => !pair[0].placeholder).map(pair => {
      const m = pair[0], i = pair[1];
      return `
      <article class="team-card${m.placeholder ? " is-placeholder" : ""}" ${m.placeholder ? "" : 'role="button" tabindex="0"'} data-i="${i}" aria-label="${m.placeholder ? "مكان محجوز لعضو فريق" : "عرض معلومات التواصل: " + esc(m.name)}">
        <div class="team-photo">
          ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy" style="object-position:${(m.photoFocus && m.photoFocus.x != null ? m.photoFocus.x : 50)}% ${(m.photoFocus && m.photoFocus.y != null ? m.photoFocus.y : 22)}%;transform:scale(${(m.photoFocus && m.photoFocus.z) || 1});transform-origin:${(m.photoFocus && m.photoFocus.x != null ? m.photoFocus.x : 50)}% ${(m.photoFocus && m.photoFocus.y != null ? m.photoFocus.y : 22)}%">`
            : `<div class="ph-frame"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 19.5c1.6-3.6 4.3-5.4 7.5-5.4s5.9 1.8 7.5 5.4"/></svg><span>الصورة لاحقًا</span></div>`}
        </div>
        <h3>${esc(m.name)}</h3>
        <span class="team-role">${esc(m.role)}</span>
        ${m.placeholder ? `<span class="ph-flag">مكان محجوز</span>` : `<span class="contact-hint">اضغط لعرض معلومات التواصل</span>`}
      </article>`;}).join("");

    const modal = document.getElementById("teamContactModal");
    const open = i => {
      const m = d.team[i];
      if (!m || m.placeholder) return;
      document.getElementById("teamContactName").textContent = m.name;
      document.getElementById("teamContactRole").textContent = m.role;
      document.getElementById("teamContactActions").innerHTML = `
        ${m.facebook ? `<a class="fb-link" href="${esc(m.facebook)}" target="_blank" rel="noopener noreferrer">صفحة فيسبوك ↗</a>` : ""}
        ${m.phone ? `<a class="phone-link" href="tel:${esc(String(m.phone).replace(/[^0-9+]/g, ""))}">اتصال مباشر · ${esc(m.phone)}</a>` : ""}`;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    };
    grid.querySelectorAll(".team-card").forEach(c => {
      c.addEventListener("click", () => open(+c.dataset.i));
      c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(+c.dataset.i); } });
    });
    const close = () => { modal.classList.remove("open"); modal.setAttribute("aria-hidden", "true"); };
    modal.querySelector(".contact-modal-close").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }

  /* ---------- مشاركة الحكاية ---------- */
  function storyUrl(id) { return new URL("story.html?id=" + encodeURIComponent(id), location.href).href; }
  function shareStory(id, title) {
    const url = storyUrl(id);
    const text = "حكاية «" + title + "» من " + (getData().meta.name || "حكاية من قرية");
    function copyFallback() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { showToast("تم نسخ رابط الحكاية"); }, function () { showToast(url); });
      } else {
        showToast(url);
      }
    }
    if (navigator.share) {
      navigator.share({ title: text, text: text, url: url }).catch(function (err) {
        if (err && err.name === "AbortError") return; // المستخدم أغلق نافذة المشاركة بنفسه
        copyFallback();
      });
    } else {
      copyFallback();
    }
  }
  let toastTimer = null;
  function showToast(msg) {
    let t = document.getElementById("hkToast");
    if (!t) { t = document.createElement("div"); t.id = "hkToast"; t.className = "hk-toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-share-id]");
    if (!b) return;
    e.preventDefault();
    shareStory(b.getAttribute("data-share-id"), b.getAttribute("data-share-title") || "");
  });

  /* ---------- صفحة الحكاية ---------- */
  function renderStoryPage() {
    const d = getData();
    const id = +(new URLSearchParams(location.search).get("id") || 0);
    const s = d.stories.find(x => x.id === id);
    const root = document.getElementById("storyPage");
    if (!s) {
      root.innerHTML = `<div class="story-page"><p class="empty">الحكاية غير موجودة.</p><a class="back-link" href="index.html#stories">← العودة لمكتبة الحكايات</a></div>`;
      return;
    }
    document.title = s.title + " | " + d.meta.name + " · " + d.meta.tagline;
    const idx = d.stories.indexOf(s);
    const paras = String(s.text || "").split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join("");
    const related = (d.activities || []).filter(a => a.storyId === s.id);
    root.innerHTML = `
      <div class="story-page">
        <div class="story-page-head">
          <span class="badge-lg">الحكاية ${AR_NUM[idx] || idx + 1}</span>
          <h1>${esc(s.title)}</h1>
          <p class="lede">${esc(s.desc)}</p>
        </div>
        <div class="story-hero-img"><img src="${esc(s.cover)}" alt="غلاف ${esc(s.title)}"></div>
        <div class="story-audio-box">
          <label>اسمع الحكاية بصوت الراوي</label>
          <audio controls preload="none" src="${esc(s.audio)}" aria-label="صوت ${esc(s.title)}"></audio>
        </div>
        <div class="story-text">${paras}</div>
        ${related.length ? `<div class="section" style="padding:26px 0 0"><h2 style="color:var(--green);font-size:22px">الحكاية على أرض الواقع</h2><div class="activities-grid" style="margin-top:14px">${related.map(a => `
          <article class="activity-card">
            ${a.images && a.images[0] ? `<div class="activity-card-media"><img src="${esc(a.images[0])}" alt="${esc(a.title)}" loading="lazy"></div>` : ""}
            <div class="activity-card-body"><h3>${esc(a.title)}</h3><p>${esc(a.desc)}</p></div>
          </article>`).join("")}</div></div>` : ""}
        <button type="button" class="share-btn share-btn-lg" data-share-id="${s.id}" data-share-title="${esc(s.title)}">مشاركة الحكاية ↗</button>
        <a class="back-link" href="index.html#stories">← العودة لمكتبة الحكايات</a>
      </div>`;
  }

  /* ---------- تشغيل ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    await syncFromSheet();
    const page = document.body.dataset.page;
    renderHeader(page === "home" ? "" : "stories");
    renderFooter();
    if (page === "home") renderHome();
    if (page === "story") renderStoryPage();
    document.dispatchEvent(new CustomEvent("hikaya:rendered"));
  });
})();
