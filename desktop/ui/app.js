// Start page: pick a server, see whether it's up and what's new, then play.
"use strict";

const LIVE = { name: "Live playtest", address: "https://playtk.talkingpixels.games", fixed: true };
const STORE = "rk-desktop";
const invoke = (cmd, args) => window.__TAURI__.core.invoke(cmd, args);
const $ = (id) => document.getElementById(id);

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
    return { servers: Array.isArray(saved.servers) ? saved.servers : [], last: saved.last || LIVE.address };
  } catch {
    return { servers: [], last: LIVE.address };
  }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ servers: prefs.servers, last: prefs.last })); } catch { /* not fatal */ }
}

const prefs = load();
let info = null;
let checking = 0;

const all = () => [LIVE, ...prefs.servers];
const current = () => all().find((s) => s.address === prefs.last) || LIVE;

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function drawServers() {
  const list = $("servers");
  list.replaceChildren();
  for (const server of all()) {
    const item = el("div", "server");
    item.setAttribute("role", "radio");
    item.setAttribute("tabindex", server === current() ? "0" : "-1");
    item.setAttribute("aria-checked", String(server === current()));
    const text = el("span", "text");
    text.append(el("span", "name", server.name), el("span", "addr", server.address.replace(/^https?:\/\//, "")));
    item.append(el("span", "pick"), text);
    if (!server.fixed) {
      const remove = el("button", "remove link", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${server.name}`);
      remove.onclick = (e) => {
        e.stopPropagation();
        prefs.servers = prefs.servers.filter((s) => s !== server);
        if (prefs.last === server.address) prefs.last = LIVE.address;
        save();
        drawServers();
        check();
      };
      item.append(remove);
    }
    item.onclick = () => choose(server);
    item.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(server); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const servers = all();
        const next = servers[(servers.indexOf(server) + (e.key === "ArrowDown" ? 1 : servers.length - 1)) % servers.length];
        choose(next);
        list.querySelector('[aria-checked="true"]')?.focus();
      }
    };
    list.append(item);
  }
}

function choose(server) {
  if (prefs.last === server.address) return;
  prefs.last = server.address;
  save();
  drawServers();
  check();
}

function setStatus(state, title, message) {
  $("status").dataset.state = state;
  $("status-title").textContent = title;
  $("status-message").textContent = message || "";
}

function drawNews(items) {
  const list = $("news");
  list.replaceChildren();
  if (!items || !items.length) {
    list.append(el("p", "empty", info ? "This server has no news yet." : "News appears here once the server answers."));
    return;
  }
  for (const n of items) {
    const card = el("article", "news-item");
    const head = el("header");
    if (n.tag) head.append(el("span", "tag", n.tag));
    head.append(el("h3", null, n.title));
    if (n.date) {
      const when = el("time", null, n.date);
      when.dateTime = n.date;
      head.append(when);
    }
    card.append(head, el("p", null, n.body));
    list.append(card);
  }
}

async function check() {
  const ticket = ++checking;
  const server = current();
  info = null;
  $("play").disabled = true;
  $("update").hidden = true;
  $("play-error").textContent = "";
  $("build").textContent = "";
  setStatus("checking", "Checking the Hall…", server.address.replace(/^https?:\/\//, ""));
  try {
    const result = await invoke("server_info", { server: server.address });
    if (ticket !== checking) return;
    info = result;
    const ms = result.ms != null ? ` · ${result.ms} ms` : "";
    setStatus(result.state, result.title + (result.state === "online" ? ms : ""), result.state === "online" ? "" : result.message);
    const playable = result.state === "online" || result.state === "solo";
    $("build").textContent = result.build ? `Server build: ${result.build}` : "";
    $("update").hidden = !result.needs_update;
    $("play").disabled = !playable || result.needs_update;
    drawNews(result.news);
  } catch (e) {
    if (ticket !== checking) return;
    setStatus("unreachable", "Can't check this server", String(e));
    drawNews(null);
  }
  if (!$("play").disabled && !document.activeElement?.closest?.(".add")) $("play").focus();
}

async function play() {
  if ($("play").disabled) return;
  $("play").disabled = true;
  $("play").textContent = "Opening the Hall…";
  try {
    await invoke("play", { server: current().address });
  } catch (e) {
    $("play").disabled = false;
    $("play").textContent = "Play";
    $("play-error").textContent = String(e);
  }
}

function toggleAdd(open) {
  $("add-form").hidden = !open;
  $("add-toggle").setAttribute("aria-expanded", String(open));
  $("add-error").textContent = "";
  if (open) $("add-name").focus();
}

$("add-toggle").onclick = () => toggleAdd($("add-form").hidden);
$("add-cancel").onclick = () => toggleAdd(false);
$("add-form").onsubmit = (e) => {
  e.preventDefault();
  const address = $("add-address").value.trim();
  const name = $("add-name").value.trim() || address;
  if (!address) { $("add-error").textContent = "Type the server's address."; return; }
  // Keep what the player typed; the app works out http or https when it connects.
  if (all().some((s) => s.address === address)) { $("add-error").textContent = "That server is already on the list."; return; }
  prefs.servers.push({ name, address });
  prefs.last = address;
  save();
  $("add-name").value = $("add-address").value = "";
  toggleAdd(false);
  drawServers();
  check();
};
$("recheck").onclick = check;
$("play").onclick = play;
$("get-update").onclick = () => invoke("open_site", { server: current().address }).catch(() => {});

addEventListener("keydown", (e) => {
  if (e.key === "F11") { e.preventDefault(); invoke("toggle_fullscreen").catch(() => {}); }
  if (e.key === "F5") { e.preventDefault(); check(); }
});

// A controller can start the game: A presses the focused control, the D-pad moves focus.
let padWas = {};
function pollPad() {
  const pad = [...(navigator.getGamepads?.() || [])].find(Boolean);
  if (pad) {
    const pressed = (i) => pad.buttons[i]?.pressed && !padWas[i];
    if (pressed(0)) document.activeElement?.click?.();
    if (pressed(12) || pressed(13)) {
      const focusable = [...document.querySelectorAll('button:not(:disabled):not([hidden]), [role="radio"], input')].filter((n) => n.offsetParent);
      const at = focusable.indexOf(document.activeElement);
      focusable[(at + (pressed(13) ? 1 : focusable.length - 1)) % focusable.length]?.focus();
    }
    padWas = Object.fromEntries(pad.buttons.map((b, i) => [i, b.pressed]));
  }
  requestAnimationFrame(pollPad);
}
requestAnimationFrame(pollPad);

window.__TAURI__.app.getVersion().then((v) => { $("version").textContent = `Rift Keepers for Windows ${v}`; }).catch(() => {});
drawServers();
check();
