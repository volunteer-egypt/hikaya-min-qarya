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
    ".hk-typing{align-self:flex-start;font-size:12px;color:#999;padding:2px 8px}",
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
    '<div class="hk-chat-head"><b>مساعد حكاية<span>يسأل ويجاوب عن المبادرة وحكاياتها — تجريبي</span></b><button class="hk-chat-close" type="button" aria-label="إغلاق">×</button></div>' +
    '<div class="hk-chat-body"></div>' +
    '<form class="hk-chat-form"><input type="text" maxlength="500" placeholder="اكتب سؤالك هنا…" aria-label="سؤالك"><button type="submit">أرسل</button></form>' +
    '<div class="hk-chat-credit">تطوير ACTT — الشريك التقني</div>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector(".hk-chat-body");
  var form = panel.querySelector(".hk-chat-form");
  var input = form.querySelector("input");
  var sendBtn = form.querySelector("button");
  var greeted = false;

  function add(cls, text, actions) {
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

    // ١) تواصل مع شخص من الفريق أو شريك/مؤسسة
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
    for (var i = 0; i < people.length; i++) {
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
    if (/اكلم|تواصل|اتصل|اوصل|رقم|تليفون|موبايل|واتس|فيس|تواصلي/.test(qn)) {
      return { text: "وسيلة التواصل دي مش متاحة على الموقع حاليًا.", actions: [] };
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

    // إجابة فورية بأزرار من البيانات المنشورة (تواصل/حكاية) من غير انتظار الخادم
    var local = null;
    try { local = localAnswer(q); } catch (e0) {}
    if (local) { add("bot", local.text, local.actions); return; }

    sendBtn.disabled = true;
    busy = document.createElement("div");
    busy.className = "hk-typing";
    busy.textContent = "بيفكر…";
    body.appendChild(busy);
    body.scrollTop = body.scrollHeight;
    fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "assistant", q: q }) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        busy.remove(); busy = null; sendBtn.disabled = false;
        if (r && r.ok && r.answer) add("bot", r.answer);
        else add("err", (r && r.error) || "حصلت مشكلة، جرّب تاني");
      })
      .catch(function () {
        if (busy) { busy.remove(); busy = null; }
        sendBtn.disabled = false;
        add("err", "مشكلة في الاتصال، جرّب تاني");
      });
  });
})();
