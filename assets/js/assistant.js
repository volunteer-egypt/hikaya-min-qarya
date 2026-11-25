/* مساعد حكاية — دردشة ذكية مجانية (Gemini عبر خادم الموقع) */
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

  function add(cls, text) {
    var d = document.createElement("div");
    d.className = "hk-msg " + cls;
    d.textContent = text;
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

  var busy = null;
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    add("me", q);
    input.value = "";
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
