/* لوحة إدارة «حكاية من قرية» — دخول باسم مستخدم وكلمة مرور، صلاحيات لكل قسم */
(function () {
  "use strict";
  var API = "https://script.google.com/macros/s/AKfycbwvHShezkRmThXHnJJZcP_3uMDtadOCyYVgFN8ZXjyuwdgcv3VhNsReuyv28Cd6MOOY/exec";
  var SITE = "../";
  var ACT_BASE = location.pathname.replace(/[^/]*$/, ""); // /rawi-head/

  var SECTIONS = {
    stories:    { label: "الحكايات" },
    gallery:    { label: "الصور" },
    activities: { label: "الأنشطة" },
    press:      { label: "الصحافة" },
    partners:   { label: "الشركاء" },
    team:       { label: "الفريق" },
    elders:     { label: "الشيوخ" },
    meta:       { label: "نصوص الموقع" },
    users:      { label: "المستخدمون" }
  };

  var session = null; // {token, username, name, perms}
  var content = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function api(body) {
    return fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function save() { if (session) sessionStorage.setItem("hk_admin", JSON.stringify(session)); }
  // سطر ACTT الثابت في بطاقات الدخول/التفعيل/كلمة المرور — بتوجيه المالك 00:28، غير قابل للتعديل من اللوحة
  function acttCredit() {
    return '<div class="actt-credit"><img src="../assets/img/actt-logo.webp" alt="شعار ACTT" loading="lazy"><span>تطوير بواسطة ACTT</span></div><div class="actt-secure">الاتصال مشفّر</div>';
  }
  function load() {
    try { session = JSON.parse(sessionStorage.getItem("hk_admin") || "null"); } catch (e) { session = null; }
  }
  function clearSession() { session = null; sessionStorage.removeItem("hk_admin"); }
  function can(sec) { return session && (session.perms.indexOf("all") !== -1 || session.perms.indexOf(sec) !== -1); }

  /* ---------- واجهة الدخول ---------- */
  function renderLogin(errMsg) {
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "center");
    var box = el("div", "card auth-box");
    box.innerHTML =
      '<h1>لوحة إدارة «حكاية من قرية»</h1>' +
      '<p class="sub">تسجيل الدخول للمشرفين</p>' +
      (errMsg ? '<div class="msg err">' + esc(errMsg) + "</div>" : "") +
      '<label>اسم المستخدم</label><input type="text" id="u" autocomplete="username">' +
      '<label>كلمة المرور</label><input type="password" id="p" autocomplete="current-password">' +
      '<div style="margin-top:16px"><button id="go" style="width:100%">دخول</button></div>' + acttCredit();
    wrap.appendChild(box);
    app.appendChild(wrap);
    function go() {
      var u = $("#u").value, p = $("#p").value;
      if (!u || !p) return;
      if (/\s/.test(u)) { renderLogin("اسم المستخدم لا يمكن أن يحتوي على مسافات"); return; }
      $("#go").disabled = true;
      api({ action: "login", username: u, password: p }).then(function (res) {
        if (!res.ok) { renderLogin(res.error || "تعذر الدخول"); return; }
        session = { token: res.token, username: res.username, name: res.name, perms: res.perms || [] };
        save();
        renderDash();
      }).catch(function () { renderLogin("مشكلة في الاتصال، حاول مرة أخرى"); });
    }
    $("#go").onclick = go;
    $("#p").addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  }

  /* ---------- واجهة التفعيل (رابط الدعوة) ---------- */
  function renderActivate(token) {
    var app = $("#app");
    app.innerHTML = "";
    var wrap = el("div", "center");
    var box = el("div", "card auth-box");
    box.innerHTML =
      '<h1>تفعيل حسابك</h1>' +
      '<p class="sub">أهلاً بك في فريق «حكاية من قرية» — اختر كلمة مرورك (٨ أحرف على الأقل). لا تُرسل كلمة المرور لأي شخص.</p>' +
      '<div id="am"></div>' +
      '<label>كلمة المرور الجديدة</label><input type="password" id="p1" autocomplete="new-password">' +
      '<label>تأكيد كلمة المرور</label><input type="password" id="p2" autocomplete="new-password">' +
      '<div style="margin-top:16px"><button id="go" style="width:100%">تفعيل ودخول</button></div>' + acttCredit();
    wrap.appendChild(box);
    app.appendChild(wrap);
    $("#go").onclick = function () {
      var p1 = $("#p1").value, p2 = $("#p2").value, m = $("#am");
      if (p1.length < 8) { m.className = "msg err"; m.textContent = "كلمة المرور يجب أن تكون ٨ أحرف على الأقل"; return; }
      if (/\s/.test(p1)) { m.className = "msg err"; m.textContent = "كلمة المرور لا يمكن أن تحتوي على مسافات"; return; }
      if (p1 !== p2) { m.className = "msg err"; m.textContent = "كلمتا المرور غير متطابقتين"; return; }
      $("#go").disabled = true;
      api({ action: "activate", invite: token, password: p1 }).then(function (res) {
        if (!res.ok) { m.className = "msg err"; m.textContent = res.error || "تعذر التفعيل"; $("#go").disabled = false; return; }
        session = { token: res.token, username: res.username, name: res.name, perms: res.perms || [] };
        save();
        history.replaceState(null, "", ACT_BASE);
        renderDash();
      }).catch(function () { m.className = "msg err"; m.textContent = "مشكلة في الاتصال"; $("#go").disabled = false; });
    };
  }

  /* ---------- لوحة التحكم ---------- */
  function renderDash() {
    var app = $("#app");
    app.innerHTML = "";
    var top = el("div", "topbar");
    top.innerHTML =
      '<div><strong style="color:var(--green)">لوحة الإدارة</strong> ' +
      '<span class="who">— ' + esc(session.name || session.username) + '</span></div>' +
      '<div><a class="ghost" style="font-size:12.5px;text-decoration:none;border:1px solid var(--green);color:var(--green);border-radius:10px;padding:8px 14px" href="' + SITE + '" target="_blank">معاينة الموقع ↗</a> ' +
      '<button class="ghost small" id="pw">تغيير كلمة المرور</button> ' +
      '<button class="ghost small" id="out">تسجيل الخروج</button></div>';
    app.appendChild(top);
    $("#out").onclick = function () {
      api({ action: "logout", token: session.token }).finally(function () { clearSession(); renderLogin(); });
    };
    $("#pw").onclick = function () {
      var card = el("div", "card");
      card.innerHTML = '<h3 class="sec-title">تغيير كلمة المرور</h3><div class="msg" id="pwm" style="display:none"></div>' +
        '<label>كلمة المرور الحالية</label><input type="password" id="pw0" autocomplete="current-password">' +
        '<label>الجديدة (٨ أحرف على الأقل، بلا مسافات)</label><input type="password" id="pw1" autocomplete="new-password">' +
        '<label>تأكيد الجديدة</label><input type="password" id="pw2" autocomplete="new-password">' +
        '<div style="margin-top:14px"><button id="pwg">حفظ كلمة المرور</button> <button class="ghost small" id="pwx">إلغاء</button></div>' + acttCredit();
      body.prepend(card);
      $("#pwx").onclick = function () { card.remove(); };
      $("#pwg").onclick = function () {
        var mm = $("#pwm", card);
        var p0 = $("#pw0", card).value, p1 = $("#pw1", card).value, p2 = $("#pw2", card).value;
        function bad(t) { mm.style.display = "block"; mm.className = "msg err"; mm.textContent = t; }
        if (p1.length < 8) return bad("كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل");
        if (/\s/.test(p1)) return bad("كلمة المرور الجديدة لا يمكن أن تحتوي على مسافات");
        if (p1 !== p2) return bad("كلمتا المرور الجديدتان غير متطابقتين");
        $("#pwg", card).disabled = true;
        api({ action: "changePassword", token: session.token, oldPassword: p0, newPassword: p1 }).then(function (res) {
          $("#pwg", card).disabled = false;
          if (!res.ok) return bad(res.error || "تعذر التغيير");
          session.token = res.token; save(); // الجلسات الأخرى أُلغيت في الخادم
          mm.style.display = "block"; mm.className = "msg ok";
          mm.textContent = "تم تغيير كلمة المرور ✓ أُغلقت كل الجلسات الأخرى";
        }).catch(function () { $("#pwg", card).disabled = false; bad("مشكلة في الاتصال"); });
      };
    };

    var tabs = el("div", "tabs");
    var body = el("div");
    app.appendChild(tabs);
    app.appendChild(body);

    var allowed = Object.keys(SECTIONS).filter(function (s) { return can(s); });
    if (!allowed.length) { body.innerHTML = '<div class="msg err">لا تملك صلاحية أي قسم بعد. تواصل مع مدير المبادرة.</div>'; return; }

    var current = allowed[0];
    function drawTabs() {
      tabs.innerHTML = "";
      allowed.forEach(function (s) {
        var b = el("button", s === current ? "on" : "", esc(SECTIONS[s].label));
        b.onclick = function () { current = s; drawTabs(); drawBody(); };
        tabs.appendChild(b);
      });
    }
    function drawBody() {
      body.innerHTML = '<div class="loading">جارٍ التحميل…</div>';
      if (current === "users") return renderUsers(body);
      loadContent().then(function () {
        if (!content) { body.innerHTML = '<div class="msg err">تعذر تحميل المحتوى</div>'; return; }
        renderSection(body, current);
      });
    }
    drawTabs();
    drawBody();
  }

  function loadContent() {
    if (content) return Promise.resolve();
    return api({ action: "getContent", token: session.token }).then(function (res) {
      if (res.ok) content = res.data;
      else if (/غير مصر/.test(res.error || "")) { clearSession(); renderLogin("انتهت الجلسة، سجّل الدخول من جديد"); }
    });
  }

  function saveSection(sec, keys, done) {
    var value = {};
    keys.forEach(function (k) { value[k] = content[k]; });
    api({ action: "saveSection", token: session.token, section: sec, value: value }).then(function (res) {
      done(res);
    }).catch(function () { done({ ok: false, error: "مشكلة في الاتصال" }); });
  }

  /* ---------- محرر عام للقوائم ---------- */
  // spec: {key, title(item), fields:[{k,label,type(text|textarea|url|date|number|media-img|media-audio|select),opts}]} 
  function listEditor(root, sec, spec, afterSave) {
    var list = content[spec.key] || [];
    var box = el("div", "card");
    box.innerHTML = '<h3 class="sec-title">' + esc(SECTIONS[sec].label) + '</h3><div class="msg" id="sm" style="display:none"></div>';
    var itemsBox = el("div");
    box.appendChild(itemsBox);

    function msg(ok, t) {
      var m = $("#sm", box); m.style.display = "block"; m.className = "msg " + (ok ? "ok" : "err"); m.textContent = t;
    }
    function persist(note) {
      saveSection(sec, spec.saveKeys || [spec.key], function (res) {
        if (res.ok) { msg(true, "تم الحفظ ✓"); if (afterSave) afterSave(); }
        else msg(false, res.error || "فشل الحفظ");
      });
    }
    function draw() {
      itemsBox.innerHTML = "";
      if (!list.length) itemsBox.appendChild(el("p", "hint", "لا توجد عناصر بعد — أضف أول عنصر من الزر بالأسفل."));
      list.forEach(function (item, idx) {
        var it = el("div", "item");
        it.appendChild(el("h4", null, esc(spec.title(item, idx))));
        spec.fields.forEach(function (f) {
          var lab = el("label", null, esc(f.label));
          it.appendChild(lab);
          var inp;
          if (f.type === "checkbox") {
            inp = el("input"); inp.type = "checkbox";
            inp.checked = item[f.k] === true || item[f.k] === "true" || item[f.k] === 1;
            inp.onchange = function () { item[f.k] = inp.checked; };
            lab.appendChild(inp);
            return;
          }
          if (f.type === "textarea") inp = el("textarea");
          else if (f.type === "select") {
            inp = el("select");
            (f.opts || []).forEach(function (o) { var op = el("option", null, esc(o.label)); op.value = o.value; inp.appendChild(op); });
          } else inp = el("input");
          if (f.type !== "textarea" && f.type !== "select") inp.type = f.type === "media-img" || f.type === "media-audio" ? "text" : (f.type || "text");
          inp.value = item[f.k] == null ? "" : item[f.k];
          inp.dataset.k = f.k;
          inp.oninput = function () { item[f.k] = inp.value; };
          it.appendChild(inp);
          if (f.type === "media-img" || f.type === "media-audio") {
            var row = el("div", "file-row");
            var file = el("input"); file.type = "file";
            file.accept = f.type === "media-img" ? "image/*" : "audio/*";
            var up = el("button", "small ghost", "رفع ملف");
            up.onclick = function () {
              if (!file.files[0]) return;
              up.disabled = true; up.textContent = "جارٍ الرفع…";
              var rd = new FileReader();
              rd.onload = function () {
                var b64 = rd.result.split(",")[1];
                api({ action: "uploadMedia", token: session.token, section: sec, filename: file.files[0].name, mimeType: file.files[0].type, base64: b64 })
                  .then(function (res) {
                    up.disabled = false; up.textContent = "رفع ملف";
                    if (res.ok) { inp.value = res.url; item[f.k] = res.url; msg(true, "تم رفع الملف ✓"); }
                    else msg(false, res.error || "فشل الرفع");
                  });
              };
              rd.readAsDataURL(file.files[0]);
            };
            row.appendChild(file); row.appendChild(up);
            it.appendChild(row);
            if (f.type === "media-img" && item[f.k] && !f.focus) {
              var im = el("img", "media-preview"); im.src = item[f.k]; it.appendChild(im);
            }
            if (f.type === "media-img" && f.focus && item[f.k]) {
              var foc = item[f.k + "Focus"] || { x: 50, y: 22, z: 1 };
              item[f.k + "Focus"] = foc;
              var wrap = el("div", "focus-editor");
              wrap.innerHTML = '<div class="focus-frame"><img alt="معاينة الإطار"></div>' +
                '<label class="focus-zoom">تكبير <input type="range" min="1" max="3" step="0.05"></label>' +
                '<p class="hint">اسحب الصورة لضبط موضعها داخل الإطار الدائري كما ستظهر في الموقع، ثم احفظ القسم. ملف الصورة الأصلي لا يتغير.</p>';
              var fimg = wrap.querySelector("img");
              fimg.src = item[f.k]; fimg.draggable = false;
              var slider = wrap.querySelector("input");
              var frame = wrap.querySelector(".focus-frame");
              function applyF() {
                fimg.style.objectPosition = foc.x + "% " + foc.y + "%";
                fimg.style.transform = "scale(" + foc.z + ")";
                fimg.style.transformOrigin = foc.x + "% " + foc.y + "%";
                slider.value = foc.z;
              }
              slider.oninput = function () { foc.z = +slider.value; applyF(); };
              var dragging = false, sx = 0, sy = 0, ox = 50, oy = 22;
              frame.addEventListener("pointerdown", function (e) {
                dragging = true; sx = e.clientX; sy = e.clientY; ox = foc.x; oy = foc.y;
                if (frame.setPointerCapture) frame.setPointerCapture(e.pointerId);
                e.preventDefault();
              });
              frame.addEventListener("pointermove", function (e) {
                if (!dragging) return;
                var r = frame.getBoundingClientRect();
                foc.x = Math.min(100, Math.max(0, ox - (e.clientX - sx) / r.width * 100));
                foc.y = Math.min(100, Math.max(0, oy - (e.clientY - sy) / r.height * 100));
                applyF();
              });
              frame.addEventListener("pointerup", function () { dragging = false; });
              applyF();
              it.appendChild(wrap);
            }
          }
        });
        var act = el("div", "actions");
        var del = el("button", "small danger", "حذف");
        del.onclick = function () {
          if (!confirm("حذف هذا العنصر نهائيًا؟")) return;
          list.splice(idx, 1);
          content[spec.key] = list;
          persist(); draw();
        };
        var upb = el("button", "small ghost", "↑");
        upb.onclick = function () { if (idx > 0) { list.splice(idx - 1, 0, list.splice(idx, 1)[0]); content[spec.key] = list; persist(); draw(); } };
        act.appendChild(del); act.appendChild(upb);
        it.appendChild(act);
        itemsBox.appendChild(it);
      });
      var add = el("button", null, "+ إضافة عنصر");
      add.style.marginTop = "6px";
      add.onclick = function () {
        var n = {};
        spec.fields.forEach(function (f) { n[f.k] = f.type === "number" ? (list.length + 1) : ""; });
        if (spec.blank) Object.assign(n, spec.blank());
        list.push(n);
        content[spec.key] = list;
        draw();
      };
      itemsBox.appendChild(add);
      var saveB = el("button", null, "حفظ القسم");
      saveB.style.marginTop = "14px";
      saveB.onclick = function () { persist(); };
      box.appendChild(saveB);
    }
    draw();
    root.innerHTML = "";
    root.appendChild(box);
  }

  /* ---------- الأقسام ---------- */
  function renderSection(root, sec) {
    if (sec === "stories") return listEditor(root, sec, {
      key: "stories",
      title: function (s) { return s.title || "حكاية بدون عنوان"; },
      fields: [
        { k: "id", label: "الرقم", type: "number" },
        { k: "title", label: "العنوان" },
        { k: "desc", label: "الوصف المختصر" },
        { k: "cover", label: "الغلاف", type: "media-img" },
        { k: "audio", label: "الصوت", type: "media-audio" },
        { k: "text", label: "النص الكامل", type: "textarea" }
      ]
    });
    if (sec === "gallery") return listEditor(root, sec, {
      key: "gallery", saveKeys: ["gallery", "galleryGroups"],
      title: function (g) { return g.caption || "صورة"; },
      fields: [
        { k: "src", label: "الصورة", type: "media-img" },
        { k: "caption", label: "التعليق" }
      ]
    });
    if (sec === "activities") return listEditor(root, sec, {
      key: "activities",
      title: function (a) { return a.title || "نشاط"; },
      fields: [
        { k: "id", label: "المعرف" },
        { k: "title", label: "العنوان" },
        { k: "desc", label: "الوصف", type: "textarea" },
        { k: "place", label: "المكان" },
        { k: "date", label: "التاريخ" }
      ]
    });
    if (sec === "press") return listEditor(root, sec, {
      key: "press", saveKeys: ["press", "pressCategories"],
      title: function (p) { return p.title || "تغطية"; },
      fields: [
        { k: "id", label: "المعرف" },
        { k: "category", label: "التصنيف", type: "select", opts: (content.pressCategories || []).map(function (c) { return { value: c.id, label: c.label }; }) },
        { k: "outlet", label: "الجهة" },
        { k: "title", label: "العنوان" },
        { k: "date", label: "التاريخ" },
        { k: "url", label: "الرابط", type: "url" },
        { k: "text", label: "النص", type: "textarea" },
        { k: "image", label: "صورة", type: "media-img" }
      ],
      blank: function () { return { id: "pr-" + Date.now(), photos: [] }; }
    });
    if (sec === "partners") {
      (content.partners || []).forEach(function (p) {
        if (p.showHeader === undefined && p.showFooter === undefined && p.showPage === undefined) {
          p.showHeader = (p.id === "p1" || p.id === "p2");
          p.showFooter = false;
          p.showPage = true;
        }
      });
      return listEditor(root, sec, {
      key: "partners",
      title: function (p) { return p.name || "شريك"; },
      fields: [
        { k: "id", label: "المعرف" },
        { k: "name", label: "الاسم" },
        { k: "logo", label: "الشعار", type: "media-img" },
        { k: "facebook", label: "فيسبوك", type: "url" },
        { k: "postUrl", label: "رابط منشور", type: "url" },
        { k: "note", label: "ملاحظة" },
        { k: "showHeader", label: " يظهر في الترويسة العلوية ", type: "checkbox" },
        { k: "showFooter", label: " يظهر في التذييل ", type: "checkbox" },
        { k: "showPage", label: " يظهر في صفحة الشركاء ", type: "checkbox" }
      ],
      blank: function () { return { id: "p" + Date.now(), showHeader: false, showFooter: false, showPage: true }; }
      });
    }
    if (sec === "team") return listEditor(root, sec, {
      key: "team",
      title: function (m) { return m.name || "عضو"; },
      fields: [
        { k: "id", label: "المعرف" },
        { k: "name", label: "الاسم" },
        { k: "role", label: "الدور" },
        { k: "photo", label: "الصورة", type: "media-img", focus: true },
        { k: "facebook", label: "فيسبوك", type: "url" },
        { k: "phone", label: "الهاتف", type: "tel" }
      ],
      blank: function () { return { id: "t" + Date.now() }; }
    });
    if (sec === "elders") {
      var em = content.eldersMessages || { title: "", intro: "", items: [] };
      return listEditor(root, sec, {
        key: "eldersMessages", saveKeys: ["eldersMessages"],
        title: function (m) { return m.name || "رسالة"; },
        fields: [
          { k: "id", label: "المعرف" },
          { k: "name", label: "اسم المتحدث" },
          { k: "text", label: "نص الرسالة", type: "textarea" },
          { k: "portrait", label: "الصورة", type: "media-img", focus: true },
          { k: "audio", label: "الصوت", type: "media-audio" },
          { k: "placeholder", label: "الحالة (معتمد = يظهر في الموقع، مؤقت = مخفي)", type: "select", opts: [
            { value: "true", label: "مؤقت — مخفي بانتظار الاعتماد" },
            { value: "", label: "معتمد — يظهر في الموقع" }
          ] }
        ],
        blank: function () { return { id: "em-" + Date.now(), placeholder: "true" }; }
      });
    }
    if (sec === "meta") return renderMeta(root);
  }

  // elders editor edits content.eldersMessages.items — patch listEditor to handle nested key
  var origListEditor = listEditor;
  listEditor = function (root, sec, spec, afterSave) {
    if (spec.key === "eldersMessages") {
      var em = content.eldersMessages || (content.eldersMessages = { title: "", intro: "", items: [] });
      // وحّد قيمة الحالة: true المنطقية و"1" و"true" كلها تعني «مؤقت»، وغير ذلك «معتمد»
      em.items.forEach(function (m) { m.placeholder = (m.placeholder === true || m.placeholder === "true" || m.placeholder === "1") ? "true" : ""; });
      var sub = Object.assign({}, spec, { key: "items", saveKeys: ["eldersMessages"] });
      var proxyRoot = el("div");
      var head = el("div", "card");
      head.innerHTML = '<h3 class="sec-title">إعدادات القسم</h3><label>عنوان القسم</label>';
      var t = el("input"); t.type = "text"; t.value = em.title || "";
      t.oninput = function () { em.title = t.value; };
      var l2 = el("label", null, "النص التمهيدي");
      var ta = el("textarea"); ta.value = em.intro || "";
      ta.oninput = function () { em.intro = ta.value; };
      var sv = el("button", null, "حفظ الإعدادات"); sv.style.marginTop = "10px";
      sv.onclick = function () { saveSection("elders", ["eldersMessages"], function (r) { alert(r.ok ? "تم الحفظ ✓" : (r.error || "فشل")); }); };
      head.appendChild(t); head.appendChild(l2); head.appendChild(ta); head.appendChild(sv);
      root.innerHTML = ""; root.appendChild(head); root.appendChild(proxyRoot);
      // edit items via a temporary holder
      var holder = { items: em.items };
      Object.defineProperty(content, "items", { get: function () { return em.items; }, set: function (v) { em.items = v; }, configurable: true });
      return origListEditor(proxyRoot, sec, sub, afterSave);
    }
    return origListEditor(root, sec, spec, afterSave);
  };

  function renderMeta(root) {
    var m = content.meta || {};
    var box = el("div", "card");
    box.innerHTML = '<h3 class="sec-title">نصوص الموقع</h3><div class="msg" id="sm" style="display:none"></div>';
    var fields = [
      ["name", "اسم المبادرة"], ["tagline", "الشعار المختصر"], ["motto", "الجملة الختامية"],
      ["description", "الوصف (SEO)"], ["heroEyebrow", "سطر فوق العنوان"], ["heroTitle", "عنوان البطل"],
      ["heroText", "نص البطل"], ["aboutText1", "عن المبادرة ١"], ["aboutText2", "عن المبادرة ٢"],
      ["aboutTagline", "جملة عن المبادرة"], ["sectionLabel_elders", "اسم قسم الشيوخ في القوائم والبلاطات"],
      ["footerCredit", "سطر حقوق إضافي (اختياري)"]
    ];
    fields.forEach(function (f) {
      box.appendChild(el("label", null, esc(f[1])));
      var inp = /Text|heroText|description/.test(f[0]) ? el("textarea") : el("input");
      if (inp.tagName === "INPUT") inp.type = "text";
      inp.value = m[f[0]] || "";
      inp.dataset.k = f[0];
      inp.oninput = function () { content.meta[f[0]] = inp.value; };
      box.appendChild(inp);
    });
    box.appendChild(el("h3", "sec-title", "أقسام الموقع الظاهرة"));
    var sv = content.sectionVisibility || {};
    var grid = el("div", "perm-grid");
    ["hero", "elders", "stories", "visuals", "activities", "initiative", "press", "partners", "team"].forEach(function (k) {
      var lab = el("label");
      var cb = el("input"); cb.type = "checkbox"; cb.checked = sv[k] !== false;
      cb.onchange = function () { content.sectionVisibility[k] = cb.checked; };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(k));
      grid.appendChild(lab);
    });
    box.appendChild(grid);
    var b = el("button", null, "حفظ");
    b.onclick = function () {
      saveSection("meta", ["meta", "sectionVisibility", "logos", "heroImage"], function (res) {
        var mm = $("#sm", box); mm.style.display = "block"; mm.className = "msg " + (res.ok ? "ok" : "err");
        mm.textContent = res.ok ? "تم الحفظ ✓" : (res.error || "فشل الحفظ");
      });
    };
    box.appendChild(b);
    root.innerHTML = "";
    root.appendChild(box);
  }

  /* ---------- المستخدمون ---------- */
  function renderUsers(root) {
    var box = el("div", "card");
    box.innerHTML = '<h3 class="sec-title">المستخدمون والدعوات</h3><div class="msg" id="um" style="display:none"></div>';
    root.innerHTML = "";
    root.appendChild(box);
    function msg(ok, t) { var m = $("#um", box); m.style.display = "block"; m.className = "msg " + (ok ? "ok" : "err"); m.innerHTML = t; }

    // إنشاء دعوة
    var cr = el("div", "item");
    cr.innerHTML = "<h4>دعوة مستخدم جديد</h4>";
    cr.appendChild(el("label", null, "اسم المستخدم (لاتيني، للدخول)"));
    var un = el("input"); un.type = "text"; un.dir = "ltr"; cr.appendChild(un);
    cr.appendChild(el("label", null, "الاسم الظاهر"));
    var nm = el("input"); nm.type = "text"; cr.appendChild(nm);
    cr.appendChild(el("label", null, "رقم الهاتف (واتساب، بالكود الدولي مثل 2010...)"));
    var ph = el("input"); ph.type = "tel"; ph.dir = "ltr"; cr.appendChild(ph);
    cr.appendChild(el("label", null, "الأقسام المسموحة"));
    var pg = el("div", "perm-grid");
    Object.keys(SECTIONS).forEach(function (s) {
      if (s === "users") return;
      var lab = el("label");
      var cb = el("input"); cb.type = "checkbox"; cb.value = s;
      lab.appendChild(cb); lab.appendChild(document.createTextNode(SECTIONS[s].label));
      pg.appendChild(lab);
    });
    cr.appendChild(pg);
    var mk = el("button", null, "إنشاء رابط تفعيل (٢٤ ساعة)");
    mk.onclick = function () {
      var perms = [...pg.querySelectorAll("input:checked")].map(function (c) { return c.value; });
      if (!un.value || !perms.length) { msg(false, "أدخل اسم المستخدم واختر قسمًا واحدًا على الأقل"); return; }
      if (/\s/.test(un.value)) { msg(false, "اسم المستخدم لا يمكن أن يحتوي على مسافات"); return; }
      mk.disabled = true;
      api({ action: "inviteCreate", token: session.token, username: un.value, name: nm.value.trim(), phone: ph.value.trim(), perms: perms })
        .then(function (res) {
          mk.disabled = false;
          if (!res.ok) { msg(false, esc(res.error || "فشل")); return; }
          var link = location.origin + ACT_BASE + "#/activate/" + res.invite;
          var phone = (res.phone || "").replace(/[^0-9]/g, "");
          var welcome = "أهلاً " + (res.name || res.username) + "، تم إنشاء حسابك في لوحة إدارة موقع «حكاية من قرية». لتفعيل حسابك واختيار كلمة مرورك افتح هذا الرابط خلال ٢٤ ساعة (يُستخدم مرة واحدة): " + link;
          var wa = phone ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(welcome) : "";
          msg(true,
            "تم إنشاء الدعوة ✓<br>رابط التفعيل (يظهر مرة واحدة):<br><code style=\"font-size:11px;direction:ltr;display:block;word-break:break-all\">" + esc(link) + "</code>" +
            '<div class="actions"><button class="small" id="cp">نسخ الرابط</button>' +
            (wa ? ' <a class="wa" id="wal" href="' + esc(wa) + '" target="_blank" rel="noopener">فتح واتساب مع الرسالة</a>' : "") + "</div>");
          $("#cp", box).onclick = function () { navigator.clipboard.writeText(link); $("#cp", box).textContent = "تم النسخ ✓"; };
          drawList();
        });
    };
    cr.appendChild(mk);
    box.appendChild(cr);

    // قائمة المستخدمين
    var listBox = el("div");
    box.appendChild(listBox);
    function drawList() {
      api({ action: "userList", token: session.token }).then(function (res) {
        if (!res.ok) { listBox.innerHTML = '<div class="msg err">' + esc(res.error || "") + "</div>"; return; }
        var t = el("table");
        t.innerHTML = "<tr><th>المستخدم</th><th>الاسم</th><th>الهاتف</th><th>الأقسام</th><th>الحالة</th><th></th></tr>";
        res.users.forEach(function (u) {
          var tr = el("tr");
          tr.innerHTML =
            "<td dir=ltr>" + esc(u.username) + "</td><td>" + esc(u.name) + "</td><td dir=ltr>" + esc(u.phone || "—") + "</td>" +
            "<td>" + (u.perms || []).map(function (p) { return '<span class="pill">' + esc((SECTIONS[p] || {}).label || p) + "</span>"; }).join(" ") + "</td>" +
            '<td><span class="pill ' + (u.active ? "on" : "off") + '">' + (u.active ? "نشط" : (u.hasPassword ? "موقوف" : "بانتظار التفعيل")) + "</span></td>";
          var td = el("td");
          if (u.phone) {
            var w = el("a", "wa", "واتساب");
            w.target = "_blank"; w.rel = "noopener";
            w.href = "https://wa.me/" + u.phone.replace(/[^0-9]/g, "");
            td.appendChild(w);
          }
          var re = el("button", "small ghost", "دعوة جديدة");
          re.title = "إبطال الرابط السابق وإنشاء رابط تفعيل جديد";
          re.onclick = function () {
            api({ action: "inviteCreate", token: session.token, username: u.username, name: u.name, phone: u.phone, perms: u.perms }).then(function (r) {
              if (r.ok) {
                var link = location.origin + ACT_BASE + "#/activate/" + r.invite;
                msg(true, 'دعوة جديدة لـ ' + esc(u.username) + ':<br><code style="font-size:11px;direction:ltr;display:block;word-break:break-all">' + esc(link) + "</code>");
              } else msg(false, esc(r.error || "فشل"));
            });
          };
          td.appendChild(re);
          var rv = el("button", "small ghost", u.active ? "إيقاف" : "تفعيل");
          rv.onclick = function () {
            if (u.active) {
              api({ action: "userRevoke", token: session.token, username: u.username }).then(function (r) { msg(r.ok, r.ok ? "تم الإيقاف وأُلغيت جلساته وروابطه" : esc(r.error || "")); drawList(); });
            } else {
              api({ action: "userUpdate", token: session.token, username: u.username, perms: u.perms }).then(function () {
                // إعادة التفعيل عبر تحديث (active تُدار بالخادم عند الحاجة)
                drawList();
              });
            }
          };
          td.appendChild(rv);
          var dl = el("button", "small danger", "حذف");
          dl.onclick = function () {
            if (!confirm("حذف المستخدم «" + u.username + "» نهائيًا؟ تُلغى جلساته وروابط تفعيله فورًا.")) return;
            api({ action: "userDelete", token: session.token, username: u.username }).then(function (r) { msg(r.ok, r.ok ? "تم الحذف" : esc(r.error || "")); drawList(); });
          };
          td.appendChild(dl);
          tr.appendChild(td);
          t.appendChild(tr);
        });
        listBox.innerHTML = "";
        listBox.appendChild(t);
      });
    }
    drawList();
  }

  /* ---------- التشغيل ---------- */
  load();
  var m = location.hash.match(/#\/activate\/([a-f0-9]{32,})/i);
  if (m) renderActivate(m[1]);
  else if (session) {
    api({ action: "session", token: session.token }).then(function (res) {
      if (res.ok) { session.perms = res.perms; session.name = res.name; save(); renderDash(); }
      else { clearSession(); renderLogin(); }
    }).catch(function () { renderDash(); });
  } else renderLogin();
})();
