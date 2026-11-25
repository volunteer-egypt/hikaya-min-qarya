/* حكاية من قرية – طبقة التفاعل: مشغل صوتي ممتع، شارات الأبطال، إعجابات، احتفالات، قراءة مع الصوت */
(function () {
  "use strict";

  const POS_PREFIX = "hikaya_pos_";
  const BADGES_KEY = "hikaya_badges_v1";
  const LIKES_KEY = "hikaya_likes_v1";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* أيقونات SVG مضمونة العرض */
  const ICONS = {
    dice: '<svg class="hk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>',
    book: '<svg class="hk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M8 7h8"/></svg>',
    bookOpen: '<svg class="hk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2z"/><path d="M12 6v14"/></svg>',
    pause: '<svg class="hk-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
  };

  const storyTitle = src => {
    const d = window.SITE_DATA || {};
    const m = src.match(/story-(\d+)/);
    const st = m && (d.stories || []).find(s => s.id === +m[1]);
    return st ? st.title : "الحكاية";
  };
  const storyId = src => { const m = src.match(/story-(\d+)/); return m ? +m[1] : 0; };

  /* ========== الاحتفال ========== */
  function celebrate(title) {
    if (document.getElementById("hk-celebrate")) return;
    awardBadge(storyIdFromTitle(title));
    const wrap = document.createElement("div");
    wrap.id = "hk-celebrate";
    wrap.className = "hk-celebrate";
    wrap.innerHTML = `
      <canvas class="hk-confetti"></canvas>
      <div class="hk-celebrate-card">
        <div class="hk-celebrate-emoji">🎉</div>
        <h3>أحسنت يا بطل!</h3>
        <p>خلّصت حكاية «${esc(title)}» وكسبت شارتها.</p>
        <button class="btn" type="button">كمّل الاستكشاف</button>
      </div>`;
    document.body.appendChild(wrap);
    wrap.querySelector("button").addEventListener("click", () => wrap.remove());
    wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
    confetti(wrap.querySelector("canvas"));
    setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 9000);
  }

  function confetti(canvas) {
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth; canvas.height = innerHeight;
    const colors = ["#c9a34d", "#7a8952", "#b5673f", "#2f4a38", "#e4d6b9"];
    const parts = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      vy: 2 + Math.random() * 3, vx: -1.5 + Math.random() * 3,
      r: Math.random() * Math.PI, vr: -0.1 + Math.random() * 0.2,
      c: colors[(Math.random() * colors.length) | 0]
    }));
    let frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (++frames < 260) requestAnimationFrame(tick);
    })();
  }

  /* ========== الشارات ========== */
  function getBadges() { try { return JSON.parse(localStorage.getItem(BADGES_KEY)) || []; } catch (e) { return []; } }
  function awardBadge(id) {
    if (!id) return;
    const b = getBadges();
    if (!b.includes(id)) { b.push(id); localStorage.setItem(BADGES_KEY, JSON.stringify(b)); renderBadges(); }
  }
  function storyIdFromTitle(t) {
    const st = (window.SITE_DATA.stories || []).find(s => s.title === t);
    return st ? st.id : 0;
  }
  function renderBadges() {
    const host = document.getElementById("hkBadges");
    if (!host) return;
    const d = window.SITE_DATA;
    const earned = getBadges();
    const all = earned.length >= d.stories.length;
    host.innerHTML = `
      <div class="hk-badges-title">${all ? "🏆 أنت بطل الحكايات الكبير! جمعت كل الشارات" : `شارات الأبطال · جمعت ${earned.length} من ${d.stories.length} — اسمع الحكاية للآخر واكسب شارتها`}</div>
      <div class="hk-badges-row">
        ${d.stories.map(s => `
          <a class="hk-badge ${earned.includes(s.id) ? "earned" : ""}" href="story.html?id=${s.id}" title="${esc(s.title)}">
            <img src="${esc(s.cover)}" alt="شارة ${esc(s.title)}">
            ${earned.includes(s.id) ? '<span class="hk-badge-check">✓</span>' : ""}
          </a>`).join("")}
      </div>`;
  }

  /* ========== الإعجابات ========== */
  function getLikes() { try { return JSON.parse(localStorage.getItem(LIKES_KEY)) || {}; } catch (e) { return {}; } }
  function renderLikes() {
    const grid = document.getElementById("storiesGrid");
    if (!grid) return;
    const likes = getLikes();
    grid.querySelectorAll(".story").forEach(card => {
      const audio = card.querySelector("audio");
      if (!audio) return;
      const id = storyId(audio.getAttribute("src") || "");
      const row = document.createElement("div");
      row.className = "like-row";
      const mine = likes["s" + id];
      row.innerHTML = `<button type="button" class="like-btn ${mine ? "on" : ""}" aria-pressed="${!!mine}" aria-label="إعجاب بالحكاية">${mine ? "♥" : "♡"}</button><span class="like-label">${mine ? "عجبتك الحكاية" : "اضغط لو عجبتك الحكاية"}</span>`;
      card.appendChild(row);
      row.querySelector("button").addEventListener("click", e => {
        const btn = e.currentTarget;
        const now = !btn.classList.contains("on");
        btn.classList.toggle("on", now);
        btn.setAttribute("aria-pressed", String(now));
        btn.textContent = now ? "♥" : "♡";
        row.querySelector(".like-label").textContent = now ? "عجبتك الحكاية" : "اضغط لو عجبتك الحكاية";
        if (now) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
        const l = getLikes();
        if (now) l["s" + id] = 1; else delete l["s" + id];
        localStorage.setItem(LIKES_KEY, JSON.stringify(l));
      });
    });
  }

  /* ========== المشغل الصوتي المخصص ========== */
  function fmt(t) {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function enhancePlayers() {
    document.querySelectorAll("audio").forEach(audio => {
      if (audio.dataset.hk) return;
      audio.dataset.hk = "1";
      const src = audio.getAttribute("src") || "";
      const key = POS_PREFIX + src;
      const box = document.createElement("div");
      box.className = "hk-player";
      box.innerHTML = `
        <button type="button" class="hk-play" aria-label="تشغيل">▶</button>
        <div class="hk-track">
          <input type="range" class="hk-seek" min="0" max="1000" value="0" aria-label="التقدم">
          <div class="hk-times"><span class="hk-cur">0:00</span><span class="hk-dur">0:00</span></div>
        </div>
        <button type="button" class="hk-skip" data-d="-10" aria-label="رجوع 10 ثواني">−10</button>
        <button type="button" class="hk-skip" data-d="10" aria-label="تقديم 10 ثواني">+10</button>
        <button type="button" class="hk-speed" aria-label="سرعة التشغيل">1×</button>
        <span class="hk-resume" hidden>أكمل من حيث توقفت</span>`;
      audio.style.display = "none";
      audio.insertAdjacentElement("afterend", box);

      const play = box.querySelector(".hk-play");
      const seek = box.querySelector(".hk-seek");
      const cur = box.querySelector(".hk-cur");
      const dur = box.querySelector(".hk-dur");
      const speedBtn = box.querySelector(".hk-speed");
      const resume = box.querySelector(".hk-resume");
      const speeds = [1, 1.25, 1.5];
      let sp = 0;

      audio.addEventListener("loadedmetadata", () => {
        dur.textContent = fmt(audio.duration);
        const saved = +localStorage.getItem(key) || 0;
        if (saved > 5 && saved < audio.duration - 10) {
          audio.currentTime = saved;
          resume.hidden = false;
        }
      });
      audio.addEventListener("timeupdate", () => {
        cur.textContent = fmt(audio.currentTime);
        if (audio.duration) seek.value = Math.round(audio.currentTime / audio.duration * 1000);
        localStorage.setItem(key, String(Math.floor(audio.currentTime)));
        if (audio.currentTime > 2) resume.hidden = true;
        syncReadAlong(audio);
      });
      audio.addEventListener("ended", () => {
        play.textContent = "▶";
        localStorage.removeItem(key);
        celebrate(storyTitle(src));
        stopReadAlong();
      });
      play.addEventListener("click", () => {
        if (audio.paused) {
          document.querySelectorAll("audio").forEach(a => { if (a !== audio) { a.pause(); } });
          document.querySelectorAll(".hk-play").forEach(b => { if (b !== play) b.textContent = "▶"; });
          audio.play();
          play.textContent = "⏸";
        } else {
          audio.pause();
          play.textContent = "▶";
        }
      });
      audio.addEventListener("pause", () => { play.textContent = "▶"; });
      audio.addEventListener("play", () => { play.textContent = "⏸"; });
      seek.addEventListener("input", () => {
        if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration;
      });
      box.querySelectorAll(".hk-skip").forEach(b => b.addEventListener("click", () => {
        audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + (+b.dataset.d)));
      }));
      speedBtn.addEventListener("click", () => {
        sp = (sp + 1) % speeds.length;
        audio.playbackRate = speeds[sp];
        speedBtn.textContent = speeds[sp] + "×";
      });
    });
  }

  /* ========== اقرأ مع الصوت (صفحة الحكاية) ========== */
  let readAlong = null;
  function setupReadAlong() {
    const textBox = document.querySelector(".story-text");
    const audioBox = document.querySelector(".story-audio-box");
    if (!textBox || !audioBox) return;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "hk-readalong";
    toggle.innerHTML = ICONS.bookOpen + " اقرأ مع الصوت";
    audioBox.appendChild(toggle);
    toggle.addEventListener("click", () => {
      if (readAlong) { stopReadAlong(); toggle.classList.remove("on"); toggle.innerHTML = ICONS.bookOpen + " اقرأ مع الصوت"; }
      else {
        readAlong = { textBox, toggle };
        toggle.classList.add("on");
        toggle.innerHTML = ICONS.pause + " إيقاف القراءة مع الصوت";
        const audio = document.querySelector(".story-audio-box audio");
        if (audio && audio.paused) audio.play();
        textBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
  function syncReadAlong(audio) {
    if (!readAlong) return;
    if (!audio.duration) return;
    const box = readAlong.textBox;
    const rect = box.getBoundingClientRect();
    const total = box.scrollHeight - innerHeight * 0.6;
    const target = window.scrollY + rect.top - innerHeight * 0.15 + (audio.currentTime / audio.duration) * total;
    if (Math.abs(window.scrollY - target) > 80) window.scrollTo({ top: target, behavior: "smooth" });
  }
  function stopReadAlong() {
    if (readAlong) {
      readAlong.toggle.classList.remove("on");
      readAlong.toggle.innerHTML = ICONS.bookOpen + " اقرأ مع الصوت";
      readAlong = null;
    }
  }

  /* ========== شريط تقدم القراءة ========== */
  function setupReadProgress() {
    if (!document.querySelector(".story-text")) return;
    const bar = document.createElement("div");
    bar.className = "hk-read-progress";
    document.body.appendChild(bar);
    addEventListener("scroll", () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
      bar.style.width = Math.min(100, Math.max(0, p * 100)) + "%";
    }, { passive: true });
  }

  /* ========== حكاية النهاردة ========== */
  function setupRandomStory() {
    const heading = document.querySelector("#stories .heading");
    const grid = document.getElementById("storiesGrid");
    if (!heading || !grid) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn outline hk-random";
    btn.innerHTML = ICONS.dice + " حكاية النهاردة";
    heading.appendChild(btn);
    btn.addEventListener("click", () => {
      const cards = [...grid.querySelectorAll(".story")].filter(c => c.style.display !== "none");
      if (!cards.length) return;
      const pick = cards[(Math.random() * cards.length) | 0];
      pick.scrollIntoView({ behavior: "smooth", block: "center" });
      pick.classList.remove("hk-flash"); void pick.offsetWidth; pick.classList.add("hk-flash");
    });
  }

  /* ========== لايت بوكس المعرض ========== */
  function setupGalleryLightbox() {
    const gallery = document.getElementById("galleryGrid");
    if (!gallery) return;
    const lb = document.createElement("div");
    lb.className = "press-lightbox";
    lb.innerHTML = `<button class="press-lightbox-close" type="button" aria-label="إغلاق">×</button><img alt=""><div class="press-lightbox-caption"></div>`;
    document.body.appendChild(lb);
    const img = lb.querySelector("img"), cap = lb.querySelector(".press-lightbox-caption");
    gallery.addEventListener("click", e => {
      const fig = e.target.closest("figure");
      if (!fig) return;
      const im = fig.querySelector("img");
      img.src = im.src; img.alt = im.alt;
      cap.textContent = fig.querySelector("figcaption") ? fig.querySelector("figcaption").textContent : "";
      lb.classList.add("open");
    });
    gallery.querySelectorAll("figure").forEach(f => { f.style.cursor = "zoom-in"; });
    lb.querySelector("button").addEventListener("click", () => lb.classList.remove("open"));
    lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("open"); });
  }

  /* ========== حركات الظهور والعدادات ========== */
  function setupReveal() {
    const targets = document.querySelectorAll(".story, .activity-card, .partner-card, .team-card, .about-block, .press-shell, .gallery figure");
    targets.forEach(el => el.classList.add("reveal"));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    targets.forEach(el => io.observe(el));
    // أمان: لو تعطل المراقب، أظهر كل شيء بعد ثانيتين ونصف
    setTimeout(() => targets.forEach(el => el.classList.add("in")), 2500);
  }

  function setupCounters() {
    document.querySelectorAll(".stats strong").forEach(el => {
      const raw = el.textContent.trim();
      const arabic = "٠١٢٣٤٥٦٧٨٩";
      const n = +raw.replace(/[٠-٩]/g, ch => String(arabic.indexOf(ch)));
      if (!isFinite(n) || n <= 0) return;
      let c = 0;
      const step = () => {
        c++;
        el.textContent = String(c).replace(/\d/g, d => arabic[+d]);
        if (c < n) setTimeout(step, 140);
      };
      const io = new IntersectionObserver(es => {
        es.forEach(en => { if (en.isIntersecting) { step(); io.disconnect(); } });
      });
      io.observe(el);
    });
  }

  function setupHeroSparkles() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const sp = document.createElement("div");
    sp.className = "hk-sparkles";
    sp.setAttribute("aria-hidden", "true");
    sp.innerHTML = "<i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i>";
    hero.appendChild(sp);
  }

  function setupBadgesHost() {
    const storiesSec = document.getElementById("stories");
    if (!storiesSec) return;
    const host = document.createElement("div");
    host.id = "hkBadges";
    host.className = "hk-badges";
    storiesSec.appendChild(host);
  }




  /* ========== مسارات العرض (تحديث 1.4): صفحات منفصلة بهاش — بلا أكورديون ========== */
  const HK_ROUTES = {
    "": ["hero", "landingMenu"],
    "stories": ["stories"],
    "media": ["visuals", "activities"],
    "elders": ["elders"],
    "initiative": ["initiative"],
    "press": ["press"],
    "partners": ["partners"],
    "team": ["team"]
  };
  const HK_ALIASES = { activities: "media", visuals: "media", gallery: "media" };
  const HK_ALL = ["hero", "landingMenu", "stories", "elders", "visuals", "activities", "initiative", "press", "partners", "team"];

  function hkRoute() {
    const h = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    if (Object.prototype.hasOwnProperty.call(HK_ROUTES, h)) return h;
    if (HK_ALIASES[h]) return HK_ALIASES[h];
    return "";
  }

  function relocateElders() {
    const eb = document.getElementById("eldersBlock");
    if (!eb || document.getElementById("elders")) return;
    const sec = document.createElement("section");
    sec.id = "elders";
    sec.className = "section wrap";
    const stories = document.getElementById("stories");
    stories.parentNode.insertBefore(sec, stories.nextSibling);
    sec.appendChild(eb);
  }

  function buildBackBar() {
    if (document.getElementById("hkBackBar")) return;
    const hero = document.getElementById("hero");
    const bar = document.createElement("div");
    bar.className = "wrap";
    bar.id = "hkBackBar";
    bar.innerHTML = `<a href="#/">→ الرئيسية</a>`;
    hero.parentNode.insertBefore(bar, hero);
  }

  function buildLanding() {
    if (document.getElementById("landingMenu")) return;
    const hero = document.getElementById("hero");
    const sec = document.createElement("section");
    sec.id = "landingMenu";
    sec.className = "section wrap";
    const covers = [...document.querySelectorAll("#storiesGrid .story")].slice(0, 3).map(c => {
      const a = c.querySelector("a.story-link");
      const img = c.querySelector(".cover img");
      const t = c.querySelector("h3");
      return a && img && t ? `<a class="hl-card" href="${a.getAttribute("href")}"><img src="${img.getAttribute("src")}" alt=""><span>${esc(t.textContent)}</span></a>` : "";
    }).join("");
    const _ovr = JSON.parse(localStorage.getItem("hikaya_admin_override_v1") || "null");
    const _d = _ovr || window.SITE_DATA || {};
    const _eldersLabel = (_d.meta && _d.meta.sectionLabel_elders) || "الشيوخ";
    const tiles = [
      ["#/stories", "مكتبة الحكايات"],
      ["#/elders", _eldersLabel],
      ["#/media", "الصور والأنشطة"],
      ["#/initiative", "عن المبادرة"],
      ["#/press", "الصحافة والإعلام"],
      ["#/partners", "شركاء النجاح"],
      ["#/team", "فريق العمل"]
    ].map(t => `<a class="menu-tile" href="${t[0]}">${t[1]}</a>`).join("");
    sec.innerHTML = `
      <div class="hl-head"><a class="hl-more" href="#/stories">كل الحكايات ←</a><h2>ابدأ من هنا</h2></div>
      <div class="hl-strip">${covers}</div>
      <div class="menu-tiles">${tiles}</div>`;
    hero.parentNode.insertBefore(sec, hero.nextSibling);
  }

  function applyRoute() {
    let r = hkRoute();
    // أقسام بلا محتوى حقيقي تُخفى من القوائم ويُحوَّل مسارها للرئيسية
    const empt = window.HK_EMPTY_ROUTES || {};
    Object.keys(empt).forEach(rt => {
      if (!empt[rt]) return;
      document.querySelectorAll('a[href$="#/' + rt + '"]').forEach(a => a.remove());
    });
    if (empt[r]) r = "";
    const show = new Set(HK_ROUTES[r]);
    HK_ALL.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = show.has(id) ? "" : "none";
    });
    // أي عنصر ظاهر لم يُكشف بعد يُعرض فورًا (يغطي سباق التهيئة مع المزامنة)
    document.querySelectorAll(".reveal:not(.in)").forEach(el => { if (el.offsetParent !== null) el.classList.add("in"); });
    const bar = document.getElementById("hkBackBar");
    if (bar) bar.style.display = r === "" ? "none" : "block";
    document.body.classList.toggle("subroute", r !== "");
    document.querySelectorAll(".nav-row a").forEach(a => {
      const href = a.getAttribute("href") || "";
      let route = null;
      if (href.includes("#/")) route = href.split("#/")[1];
      else if (/index\.html$/.test(href)) route = "";
      if (route !== null) a.classList.toggle("active", route === r);
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", applyRoute);

  let hkInited = false;
  function initAll() {
    if (hkInited) return;
    hkInited = true;
    relocateElders();
    buildBackBar();
    buildLanding();
    applyRoute();
    setupBadgesHost();
    renderBadges();
    renderLikes();
    enhancePlayers();
    setupReadAlong();
    setupReadProgress();
    setupRandomStory();
    setupGalleryLightbox();
    setupReveal();
    setupCounters();
    setupHeroSparkles();
  }
  // التهيئة بعد انتهاء main.js من بناء المحتوى (يشمل انتظار مزامنة الشيت)
  document.addEventListener("hikaya:rendered", initAll);
  // احتياط لو اختلطت نسخة قديمة من main.js مع الجديدة
  document.addEventListener("DOMContentLoaded", () => setTimeout(initAll, 10000));
})();
