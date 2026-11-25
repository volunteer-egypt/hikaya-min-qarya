/* مساعد حكاية — دردشة ذكية مجانية (Gemini عبر خادم الموقع) + أزرار تفاعلية من بيانات الموقع المنشورة */
(function () {
  "use strict";
  var API = (window.SITE_DATA && SITE_DATA.meta && SITE_DATA.meta.apiUrl) || "";
  if (!API) return;

  var css = document.createElement("style");
  css.textContent = [
    ".hk-chat-fab{position:fixed;bottom:18px;left:18px;z-index:9990;display:flex;align-items:center;gap:8px;background:#0e8579;color:#fff;border:none;border-radius:999px;padding:12px 18px;font-family:inherit;font-size:14.5px;font-weight:800;box-shadow:0 6px 22px rgba(14,133,121,.35);cursor:pointer}",
    ".hk-chat-fab:hover{background:#0b6d64}",
    ".hk-chat-panel{position:fixed;bottom:76px;left:14px;z-index:9991;width:min(360px,calc(100vw - 28px));height:min(480px,calc(100vh - 110px));background:#fff;border:1px solid #e5ded2;border-radius:16px;box-shadow:0 14px 44px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden}",
    ".hk-chat-panel.open{display:flex}",
    ".hk-chat-head{background:#0e8579;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between}",
    ".hk-chat-head b{font-size:15px}",
    ".hk-chat-head span{display:block;font-size:11.5px;opacity:.85;font-weight:400}",
    ".hk-chat-close{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:0 4px}",
    ".hk-chat-body{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf7f1}",
    ".hk-msg{max-width:86%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.75;white-space:pre-wrap;word-break:break-word}",
    ".hk-msg.bot{background:#fff;border:1px solid #e5ded2;align-self:flex-start;border-start-start-radius:4px}",
    ".hk-msg.me{background:#0e8579;color:#fff;align-self:flex-end;border-start-end-radius:4px}",
    ".hk-msg.err{background:#fdf0ee;border:1px solid #f0c9c2;color:#a33}",
    ".hk-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
    ".hk-action{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:10px;font-size:12.5px;font-weight:800;text-decoration:none;color:#fff;line-height:1.6}",
    ".hk-action:hover{filter:brightness(.92)}",
    ".hk-action.wa{background:#1faa59}",
    ".hk-action.fb{background:#1877F2}",
    ".hk-action.site{background:#0e8579}",
    ".hk-action.story{background:#5b4636}",
    ".hk-chat-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee5d8;background:#fff}",
    ".hk-chat-form input{flex:1;border:1px solid #ddd2c2;border-radius:10px;padding:10px;font-family:inherit;font-size:13.5px}",
    ".hk-chat-form button{background:#0e8579;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-family:inherit;font-weight:700;cursor:pointer}",
    ".hk-chat-form button:disabled{opacity:.5;cursor:default}",
    ".hk-msg{animation:hkMsgIn .28s cubic-bezier(.2,.8,.2,1) both}",
    "@keyframes hkMsgIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}",
    ".hk-actions{animation:hkMsgIn .3s .05s cubic-bezier(.2,.8,.2,1) both}",
    ".hk-typing{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;padding:8px 14px 8px 10px;min-height:42px;background:linear-gradient(180deg,#fff,#fdfbf7);border:1px solid #e5ded2;border-radius:14px;border-start-start-radius:4px;box-shadow:0 2px 8px rgba(14,133,121,.07);animation:hkMsgIn .28s cubic-bezier(.2,.8,.2,1) both}",
    ".hk-typing-av{position:relative;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#12a390,#0e8579);color:#fff;display:grid;place-items:center;font-size:.8rem;flex:none}",
    ".hk-typing-av::after{content:\"\";position:absolute;inset:-3px;border-radius:50%;border:2px solid #0e8579;opacity:0;animation:hkAvPulse 1.8s infinite ease-out}",
    "@keyframes hkAvPulse{0%{transform:scale(.85);opacity:.55}100%{transform:scale(1.35);opacity:0}}",
    ".hk-dots{display:inline-flex;gap:5px;align-items:center;direction:ltr}",
    ".hk-dots i{width:7px;height:7px;border-radius:50%;background:#0e8579;display:inline-block;animation:hkDotWave 1.3s infinite cubic-bezier(.45,0,.55,1)}",
    ".hk-dots i:nth-child(2){animation-delay:.16s;background:#12a390}",
    ".hk-dots i:nth-child(3){animation-delay:.32s;background:#5ec4b6}",
    "@keyframes hkDotWave{0%,60%,100%{transform:translateY(0) scale(.85);opacity:.45}30%{transform:translateY(-5px) scale(1.1);opacity:1}}",
    ".hk-typing-label{font-size:.76rem;color:#8f8271;background:linear-gradient(90deg,#8f8271 30%,#0e8579 50%,#8f8271 70%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:hkShimmer 2s infinite linear}",
    "@keyframes hkShimmer{from{background-position:200% 0}to{background-position:-200% 0}}",
    ".hk-chat-form{transition:box-shadow .2s,background .2s}",
    ".hk-chat-form:focus-within{box-shadow:inset 0 -2px 0 #0e8579;background:#fffdf8}",
    ".hk-chat-form input{transition:border-color .2s ease,box-shadow .2s ease}",
    ".hk-chat-form input:focus{outline:none;border-color:#0e8579;box-shadow:0 0 0 3px rgba(14,133,121,.14)}",
    ".hk-chat-form button{transition:transform .15s,filter .2s,opacity .2s;opacity:.55}",
    ".hk-chat-form.ready button{opacity:1}",
    ".hk-chat-form.ready button:hover:not(:disabled){filter:brightness(1.07);transform:translateY(-1px)}",
    ".hk-chat-form button:active:not(:disabled){transform:scale(.92)}",
    ".hk-chat-form.busy button{opacity:.5;pointer-events:none}",
    ".hk-chat-fab{transition:transform .2s,box-shadow .2s}",
    ".hk-chat-fab:hover{transform:scale(1.06)}",
    "@media (prefers-reduced-motion:reduce){.hk-msg,.hk-actions,.hk-typing,.hk-typing-av::after,.hk-dots i,.hk-typing-label{animation:none!important}.hk-typing-label{-webkit-text-fill-color:#8f8271}}",
    ".hk-chat-credit{padding:5px 10px 7px;border-top:1px solid #f0e9dd;background:#fbf8f2;text-align:center;font-size:10.5px;color:#a09480}"
  ].join("\n");
  document.head.appendChild(css);

  var fab = document.createElement("button");
  fab.className = "hk-chat-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "افتح مساعد حكاية");
  fab.innerHTML = "✨ <span>اسأل حكاية</span>";

  var panel = document.createElement("div");
  panel.className = "hk-chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "مساعد حكاية");
  panel.innerHTML =
    '<div class="hk-chat-head"><b>مساعد حكاية</b><button class="hk-chat-close" type="button" aria-label="إغلاق">×</button></div>' +
    '<div class="hk-chat-body"></div>' +
    '<form class="hk-chat-form"><input type="text" maxlength="500" placeholder="اكتب سؤالك هنا…" aria-label="سؤالك"><button type="submit">أرسل</button></form>' +
    '<div class="hk-chat-credit">تطوير ACTT — الشريك التقني</div>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector(".hk-chat-body");
  var form = panel.querySelector(".hk-chat-form");
  var input = form.querySelector("input");
  var sendBtn = form.querySelector("button");
  input.addEventListener("input", function () { form.classList.toggle("ready", !!input.value.trim()); });
  var greeted = false;

  var hkHist = [];
  function add(cls, text, actions) {
    if (cls === "me") hkHist.push({ role: "user", text: String(text || "") });
    else if (cls === "bot") hkHist.push({ role: "model", text: String(text || "") });
    if (hkHist.length > 12) hkHist = hkHist.slice(-12);
    var d = document.createElement("div");
    d.className = "hk-msg " + cls;
    var t = document.createElement("span");
    t.textContent = text;
    d.appendChild(t);
    if (actions && actions.length) {
      var box = document.createElement("div");
      box.className = "hk-actions";
      actions.forEach(function (a) {
        var link = document.createElement("a");
        link.className = "hk-action " + a.kind;
        link.href = a.url;
        link.textContent = a.label;
        if (a.kind === "story") {
          link.addEventListener("click", function () { panel.classList.remove("open"); });
        } else {
          link.target = "_blank";
          link.rel = "noopener";
        }
        box.appendChild(link);
      });
      d.appendChild(box);
    }
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
    return d;
  }
  function greet() {
    if (greeted) return; greeted = true;
    add("bot", "أهلًا بيك في «حكاية من قرية» 👋 أنا مساعد حكاية، اسألني عن المبادرة أو الحكايات أو الأنشطة أو الفريق.");
  }

  fab.addEventListener("click", function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) { greet(); input.focus(); }
  });
  panel.querySelector(".hk-chat-close").addEventListener("click", function () { panel.classList.remove("open"); });

  /* ---------- بيانات الموقع المنشورة (أحدث نسخة وصلت للصفحة) ---------- */
  function siteContent() {
    try {
      var raw = localStorage.getItem("hikaya_admin_override_v1");
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.stories) return d;
      }
    } catch (e) {}
    return window.SITE_DATA || {};
  }
  function norm(s) {
    return String(s || "")
      .replace(/[ً-ْٰ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .toLowerCase()
      .replace(/[^ء-غف-ي٠-٩a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function sigWords(name) {
    return norm(name).split(" ").map(function (w) { return w.replace(/^ال/, ""); })
      .filter(function (w) { return w.length >= 3; });
  }
  function nameHits(qn, name) {
    var qw = {};
    norm(qn).split(" ").forEach(function (w) { qw[w.replace(/^ال/, "")] = 1; });
    var hits = 0;
    sigWords(name).forEach(function (w) { if (qw[w]) hits++; });
    return hits;
  }
  function waUrl(phone) {
    var d = String(phone || "").replace(/\D/g, "");
    if (/^01\d{9}$/.test(d)) d = "2" + d;
    else if (/^20\d{10}$/.test(d)) { /* جاهز */ }
    else return "";
    return "https://wa.me/" + d;
  }

  // يبني ردًّا محليًّا بأزرار لو السؤال عن وسيلة تواصل أو حكاية؛ وإلا يرجع null فيكمل الطلب للخادم
  function localAnswer(q) {
    var d = siteContent();
    var qn = norm(q);
    if (!qn) return null;

    // ١) تواصل مع شخص من الفريق أو شريك/مؤسسة — فقط عند طلب التواصل صراحة
    var contactIntent = /اكلم|تواصل|اتصل|اوصل|رقم|تليفون|موبايل|واتس|فيس|ايميل|بريد|عنوان/.test(qn);
    var people = [];
    (d.team || []).forEach(function (t) {
      if (t.placeholder || !t.name) return;
      people.push({ name: t.name, role: t.role || "", phone: t.phone, facebook: t.facebook, postUrl: "", partner: false });
    });
    (d.partners || []).forEach(function (p) {
      var nm = String(p.name || "").trim();
      var postUrl = String(p.postUrl || "");
      if (postUrl.indexOf("actt-official.pages.dev") !== -1 && !nm) nm = "المركز العربي للتكنولوجيا والتدريب";
      if (!nm) return;
      people.push({ name: nm, role: p.badge || "شريك في المبادرة", phone: "", facebook: p.facebook, postUrl: postUrl, partner: true });
    });
    var found = null;
    if (contactIntent) for (var i = 0; i < people.length; i++) {
      if (nameHits(qn, people[i].name) >= 2) { found = people[i]; break; }
    }
    if (found) {
      var acts = [];
      var wa = waUrl(found.phone);
      if (wa) acts.push({ label: "💬 واتساب", url: wa, kind: "wa" });
      if (found.facebook) acts.push({ label: "📘 فيسبوك", url: found.facebook, kind: "fb" });
      if (found.postUrl) acts.push({ label: "🔗 الموقع الرسمي", url: found.postUrl, kind: "site" });
      var intro = found.partner
        ? "«" + found.name + "» — " + found.role + "."
        : "«" + found.name + "» — " + found.role + ".";
      if (acts.length) {
        return { text: intro + " تقدر تتواصل معاه مباشرة من الأزرار دي 👇", actions: acts };
      }
      return { text: intro + " وسيلة التواصل معاه مش متاحة على الموقع حاليًا.", actions: [] };
    }
    // نية تواصل من غير اسم مطابق: ردّ صريح «مش متاح» من غير أي اختراع
    if (contactIntent) {
      return { text: "وسيلة التواصل دي مش متاحة على الموقع حاليًا.", actions: [] };
    }

    // ١ب) روابط المبادرة على السوشيال (تُدار من لوحة الإدارة وتظهر هنا أزرارًا)
    if (/تابع|سوشيال|صفحه المباد|فيسبوك المباد|قناه المباد|جروب|لينك المباد|حساب المباد|حسابات المباد/.test(qn)) {
      var socials = (d.socials || []).filter(function (s) { return s && s.url; });
      if (socials.length) {
        var kindMap = { whatsapp: "wa", facebook: "fb", site: "site" };
        var socialActs = socials.map(function (s) {
          return { label: "🔗 " + (s.label || "رابط"), url: s.url, kind: kindMap[s.kind] || "site" };
        });
        return { text: "دي روابط المبادرة الرسمية، دوس على اللي يناسبك 👇", actions: socialActs };
      }
      return { text: "روابط المبادرة على السوشيال مش متاحة على الموقع حاليًا.", actions: [] };
    }

    // ٢) حكاية بعينها
    var genericStoryWords = { "حكايه": 1, "قصه": 1 };
    var stories = (d.stories || []).filter(function (st) {
      if (norm(st.title) && qn.indexOf(norm(st.title)) !== -1) return true;
      return sigWords(st.title).some(function (w) {
        return w.length >= 4 && !genericStoryWords[w] && qn.split(" ").map(function (x) { return x.replace(/^ال/, ""); }).indexOf(w) !== -1;
      });
    }).slice(0, 3);
    if (stories.length) {
      var sActs = stories.map(function (st) {
        return { label: "📖 " + st.title, url: "story.html?id=" + st.id, kind: "story" };
      });
      if (stories.length === 1) {
        var st0 = stories[0];
        return { text: "موجودة ✅ «" + st0.title + "» — " + (st0.desc || "") + " دوس الزرار وادخل عليها على طول 👇", actions: sActs };
      }
      return { text: "لقيتلك الحكايات دي، دوس على اللي عايزها 👇", actions: sActs };
    }

    return null;
  }

  var busy = null;
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    add("me", q);
    input.value = "";
    form.classList.remove("ready");

    // إجابة فورية بأزرار من البيانات المنشورة (تواصل/حكاية) من غير انتظار الخادم
    var local = null;
    try { local = localAnswer(q); } catch (e0) {}
    if (local) { add("bot", local.text, local.actions); return; }

    sendBtn.disabled = true;
    busy = document.createElement("div");
    busy.className = "hk-typing";
    busy.innerHTML = '<span class="hk-typing-av">\u2726</span><span class="hk-dots"><i></i><i></i><i></i></span><span class="hk-typing-label">حكاية بتكتب…</span>';
    form.classList.add("busy");
    body.appendChild(busy);
    body.scrollTop = body.scrollHeight;
    fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "assistant", q: q, history: hkHist.slice(0, -1).slice(-8) }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        busy.remove(); busy = null; sendBtn.disabled = false; form.classList.remove("busy");
        if (r && r.ok && r.answer) add("bot", r.answer);
        else add("err", (r && r.error) || "حصلت مشكلة، جرّب تاني");
      })
      .catch(function () {
        if (busy) { busy.remove(); busy = null; }
        sendBtn.disabled = false; form.classList.remove("busy");
        add("err", "مشكلة في الاتصال، جرّب تاني");
      });
  });
})();
