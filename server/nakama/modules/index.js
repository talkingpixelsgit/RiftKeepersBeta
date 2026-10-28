// Rift Keepers server modules for Nakama (JavaScript runtime).
// Restores the online API the client was built against: whoami, db, content_get/put, econ_apply,
// claim_name, invites, reports and the staff model. Nakama finds registered functions by name, so every
// handler is a top-level function declaration (no arrow functions passed to the initializer).

var SYSTEM = "00000000-0000-0000-0000-000000000000";
var STAFF_ROLES = ["owner", "gm", "mod", "builder"];
var RESERVED = /^(gm|admin|administrator|mod|moderator|staff|owner|creator|system|unknown|support|talking ?pixels|the ?creator|the ?hall)$/i;
var LOOKALIKE = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "|": "l" };
var MAX_LIST = 500;
var START_COINS = 40;

function env(ctx, key, fallback) {
  var v = ctx.env && ctx.env[key];
  return v === undefined || v === null || v === "" ? fallback : v;
}
function inviteOnly(ctx) { return env(ctx, "RK_INVITE_ONLY", "false") === "true"; }
function parse(payload) {
  if (!payload) return {};
  try { return JSON.parse(payload); } catch (e) { throw rkError("Bad request.", 3); }
}
function rkError(message, code) { var e = new Error(message); e.code = code || 13; return e; }
function now() { return Date.now(); }

// ---------- storage helpers (system-owned documents) ----------
function readSys(nk, collection, key) {
  var r = nk.storageRead([{ collection: collection, key: key, userId: SYSTEM }]);
  return r && r.length ? r[0].value : null;
}
function writeSys(nk, collection, key, value) {
  nk.storageWrite([{ collection: collection, key: key, userId: SYSTEM, value: value, permissionRead: 0, permissionWrite: 0 }]);
}
function deleteSys(nk, collection, key) {
  nk.storageDelete([{ collection: collection, key: key, userId: SYSTEM }]);
}
function listSys(nk, collection) {
  var out = [], cursor = "";
  do {
    var page = nk.storageList(SYSTEM, collection, 100, cursor);
    (page.objects || []).forEach(function (o) { out.push({ id: o.key, data: o.value }); });
    cursor = page.cursor || "";
  } while (cursor && out.length < MAX_LIST);
  return out;
}

// ---------- identity, roles, sanctions ----------
function roleOf(nk, uid) {
  if (!uid) return null;
  var owner = readSys(nk, "rk_meta", "owner");
  if (owner && owner.id === uid) return "owner";
  var r = readSys(nk, "db:roles", uid);
  return r && STAFF_ROLES.indexOf(r.role) >= 0 ? r.role : null;
}
function isStaff(nk, uid) { return !!roleOf(nk, uid); }
function activeBan(nk, uid) {
  var b = readSys(nk, "db:bans", uid);
  return b && (b.perm || (b.until || 0) > now()) ? b : null;
}
function activeMute(nk, uid) {
  var m = readSys(nk, "db:mutes", uid);
  return m && (m.until || 0) > now() ? m : null;
}
function hasAccess(ctx, nk, uid) {
  if (!inviteOnly(ctx)) return true;
  if (roleOf(nk, uid)) return true;
  return !!readSys(nk, "rk_access", uid);
}
function nameProblem(name) {
  var n = String(name || "").trim();
  if (n.length < 3 || n.length > 18) return "Keeper names are 3 to 18 characters.";
  if (!/^[A-Za-z0-9 _'.-]+$/.test(n)) return "Use letters, numbers, spaces and _ ' . - only.";
  var plain = n.toLowerCase().replace(/[013457@$!|]/g, function (c) { return LOOKALIKE[c]; }).replace(/[^a-z ]/g, "").trim();
  if (RESERVED.test(n) || RESERVED.test(plain)) return "That name is reserved.";
  return null;
}

function rpcWhoami(ctx, logger, nk, payload) {
  var uid = ctx.userId;
  return JSON.stringify({
    id: uid,
    access: hasAccess(ctx, nk, uid),
    role: roleOf(nk, uid) === "owner" ? "creator" : roleOf(nk, uid),
    ban: activeBan(nk, uid),
    mute: activeMute(nk, uid),
    inviteOnly: inviteOnly(ctx)
  });
}

function rpcClaimName(ctx, logger, nk, payload) {
  var name = String(parse(payload).name || "").trim();
  var problem = nameProblem(name);
  if (problem) throw rkError(problem, 3);
  try {
    nk.accountUpdateId(ctx.userId, name, name, null, null, null, null, null);
  } catch (e) {
    throw rkError("Another Keeper already uses that name.", 6);
  }
  return JSON.stringify({ name: name });
}

function rpcRedeemInvite(ctx, logger, nk, payload) {
  var code = String(parse(payload).code || "").trim().toUpperCase();
  if (!code) throw rkError("Enter an invite code.", 3);
  if (!inviteOnly(ctx)) { writeSys(nk, "rk_access", ctx.userId, { at: now(), code: "open" }); return JSON.stringify({ ok: true }); }
  var inv = readSys(nk, "rk_invites", code);
  if (!inv || (inv.uses || 0) >= (inv.max || 1)) throw rkError("That invite code isn't valid.", 5);
  inv.uses = (inv.uses || 0) + 1;
  writeSys(nk, "rk_invites", code, inv);
  writeSys(nk, "rk_access", ctx.userId, { at: now(), code: code });
  return JSON.stringify({ ok: true });
}

function rpcClaimCreator(ctx, logger, nk, payload) {
  var code = String(parse(payload).code || "").trim();
  var secret = env(ctx, "RK_CREATOR_CODE", "");
  if (!secret || code !== secret) throw rkError("That code isn't valid.", 5);
  var owner = readSys(nk, "rk_meta", "owner");
  if (owner && owner.id !== ctx.userId) throw rkError("The Creator is already claimed.", 7);
  writeSys(nk, "rk_meta", "owner", { id: ctx.userId, at: now() });
  writeSys(nk, "rk_access", ctx.userId, { at: now(), code: "creator" });
  return JSON.stringify({ ok: true });
}

// ---------- the shared document store behind the client's `db` bridge ----------
// Paths mirror the client: "players", "stalls", "spaces/<id>/book", "data/users/<id>" ...
function splitPath(path) { return String(path || "").split("/").filter(function (s) { return s; }); }
function collectionKey(path) { return "db:" + splitPath(path).join("/"); }

// Rules: who may read, create, overwrite and delete in each collection.
function rules(path, uid, nk) {
  var p = splitPath(path), top = p[0], staff = isStaff(nk, uid);
  var own = function (id) { return id === uid; };
  var anyone = function () { return true; };
  var staffOnly = function () { return staff; };
  var none = function () { return false; };
  switch (top) {
    case "players": return { read: anyone, set: function (id) { return own(id); }, del: function (id) { return own(id) || staff; } };
    case "data": return p[1] === "users" && p[2] === uid ? { read: anyone, set: anyone, del: anyone } : { read: none, set: none, del: none };
    case "config": case "weapons": case "gates": case "roles": case "bans": case "mutes":
      return { read: anyone, set: top === "roles" ? function () { return roleOf(nk, uid) === "owner"; } : staffOnly, del: staffOnly };
    case "world": return { read: anyone, set: function (id) { return id === "flags" || staff; }, del: staffOnly };
    case "firsts": return { read: anyone, set: function (id, old) { return !old || staff; }, del: staffOnly };
    case "stalls": return { read: anyone, add: anyone, del: anyone, stamp: "seller" };
    case "inbox": return { read: function (id, d) { return d && d.to === uid; }, add: anyone, del: function (id, old) { return old && old.to === uid; } };
    case "gifts": return { read: function (id, d) { return d && d.to === uid; }, add: staffOnly, del: function (id, old) { return old && old.to === uid || staff; } };
    case "mail": return { read: function (id, d) { return d && (d.to === uid || d.from === uid); }, add: anyone, del: function (id, old) { return old && (old.to === uid || old.from === uid); }, stamp: "from" };
    case "caves": return p.length > 1 ? { read: anyone, add: anyone } : { read: anyone, set: anyone, del: staffOnly };
    case "spaces": return p.length > 1 ? { read: anyone, add: anyone, del: staffOnly } : { read: anyone, set: function (id) { return own(id); }, del: function (id) { return own(id) || staff; } };
    case "hidden": return { read: anyone, add: anyone, del: anyone, stamp: "from" };
    case "reports": return { read: staffOnly, add: anyone, set: staffOnly, del: staffOnly, stamp: "by" };
    default: return { read: none, set: none, del: none };
  }
}

function matches(doc, where) {
  if (!where) return true;
  var f = where[0], op = where[1], v = where[2], x = doc ? doc[f] : undefined;
  switch (op) {
    case "==": return x === v;
    case "!=": return x !== v;
    case ">": return x > v;
    case ">=": return x >= v;
    case "<": return x < v;
    case "<=": return x <= v;
    case "in": return Array.isArray(v) && v.indexOf(x) >= 0;
    case "array-contains": return Array.isArray(x) && x.indexOf(v) >= 0;
    default: return false;
  }
}

function capInbox(path, data) {
  // Keep player-to-player coin transfers in a sane range.
  if ((path === "inbox" || path === "mail") && typeof data.coins === "number") {
    data.coins = Math.max(-1000, Math.min(100000, Math.round(data.coins)));
  }
  return data;
}

function rpcDb(ctx, logger, nk, payload) {
  var a = parse(payload), uid = ctx.userId, op = a.op, path = a.path;
  if (activeBan(nk, uid)) throw rkError("You are banned.", 7);
  var R = rules(path, uid, nk), coll = collectionKey(path);
  if (op === "get") {
    var d = readSys(nk, coll, String(a.id));
    if (!R.read || !R.read(a.id, d)) return JSON.stringify({ item: null });
    return JSON.stringify({ item: d });
  }
  if (op === "list") {
    var items = listSys(nk, coll).filter(function (it) { return R.read && R.read(it.id, it.data) && matches(it.data, a.where); });
    if (a.orderBy) {
      var f = a.orderBy[0], dir = a.orderBy[1] === "desc" ? -1 : 1;
      items.sort(function (x, y) { return (x.data[f] > y.data[f] ? 1 : x.data[f] < y.data[f] ? -1 : 0) * dir; });
    }
    if (a.limit) items = items.slice(0, Math.max(0, a.limit | 0));
    return JSON.stringify({ items: items });
  }
  if (op === "add") {
    if (!R.add || !R.add()) throw rkError("Not allowed.", 7);
    var data = capInbox(path, a.data || {});
    if (R.stamp) data[R.stamp] = uid;
    var id = nk.uuidv4();
    writeSys(nk, coll, id, data);
    return JSON.stringify({ id: id });
  }
  if (op === "set") {
    var key = String(a.id), old = readSys(nk, coll, key);
    if (!R.set || !R.set(key, old)) throw rkError("Not allowed.", 7);
    var next = a.merge && old ? Object.assign({}, old, a.data) : (a.data || {});
    writeSys(nk, coll, key, capInbox(path, next));
    return JSON.stringify({ ok: true });
  }
  if (op === "del") {
    var k = String(a.id), prev = readSys(nk, coll, k);
    if (!prev) return JSON.stringify({ ok: true, existed: false });
    if (!R.del || !R.del(k, prev)) throw rkError("Not allowed.", 7);
    deleteSys(nk, coll, k);
    return JSON.stringify({ ok: true, existed: true });
  }
  throw rkError("Unknown operation.", 3);
}

// ---------- live content (stories, items, gates layered over the built-in data) ----------
function rpcContentGet(ctx, logger, nk, payload) {
  var c = readSys(nk, "rk_content", "main") || { content: {}, version: 0 };
  return JSON.stringify(c);
}
function deepMerge(base, add) {
  Object.keys(add || {}).forEach(function (k) {
    var v = add[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) deepMerge(base[k], v);
    else base[k] = v;
  });
  return base;
}
function rpcContentPut(ctx, logger, nk, payload) {
  var role = roleOf(nk, ctx.userId);
  if (role !== "owner" && role !== "builder") throw rkError("Only the Creator and World Builders can publish content.", 7);
  var a = parse(payload), cur = readSys(nk, "rk_content", "main") || { content: {}, version: 0 };
  cur.content = deepMerge(cur.content || {}, a.changes || {});
  cur.version = (cur.version || 0) + 1;
  cur.log = (cur.log || []).concat([{ at: now(), by: ctx.userId, tag: a.tag || "update", note: String(a.note || "").slice(0, 200), additions: a.additions || [] }]).slice(-100);
  writeSys(nk, "rk_content", "main", cur);
  return JSON.stringify({ ok: true, version: cur.version });
}

// ---------- economy: the server keeps the authoritative purse ----------
function rpcEconApply(ctx, logger, nk, payload) {
  var deltas = parse(payload).deltas || [];
  var r = nk.storageRead([{ collection: "rk_wallet", key: "main", userId: ctx.userId }]);
  var w = r && r.length ? r[0].value : { coins: START_COINS, log: [] };
  deltas.slice(0, 200).forEach(function (d) {
    var n = Math.round(Number(d && d.d) || 0);
    n = Math.max(-1000000, Math.min(5000, n)); // one earn event can't mint a fortune
    w.coins = Math.max(0, (w.coins || 0) + n);
  });
  w.at = now();
  nk.storageWrite([{ collection: "rk_wallet", key: "main", userId: ctx.userId, value: w, permissionRead: 1, permissionWrite: 0 }]);
  return JSON.stringify({ coins: w.coins });
}

// ---------- client feature modules (served from the server; none yet) ----------
function rpcFeatures(ctx, logger, nk, payload) { return JSON.stringify({ modules: [] }); }
function rpcModuleGet(ctx, logger, nk, payload) { return JSON.stringify({}); }

// ---------- reports ----------
function rpcReport(ctx, logger, nk, payload) {
  var a = parse(payload);
  var acct = nk.accountGetId(ctx.userId);
  writeSys(nk, "db:reports", nk.uuidv4(), {
    kind: String(a.kind || "other").slice(0, 20), target: a.target || null,
    text: String(a.text || "").slice(0, 1500), context: String(a.context || "").slice(0, 500),
    by: ctx.userId, bh: acct.user.username, status: "open", at: now()
  });
  return JSON.stringify({ ok: true });
}
function rpcListReports(ctx, logger, nk, payload) {
  if (!isStaff(nk, ctx.userId)) throw rkError("Staff only.", 7);
  var items = listSys(nk, "db:reports").map(function (it) { return Object.assign({ id: it.id }, it.data); });
  items.sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
  return JSON.stringify({ items: items });
}

// ---------- hooks ----------
function beforeAuthenticateEmail(ctx, logger, nk, data) {
  if (data.create && data.username) {
    var problem = nameProblem(data.username);
    if (problem) throw rkError(problem, 3);
  }
  return data;
}
function beforeChannelMessageSend(ctx, logger, nk, envelope) {
  var uid = ctx.userId;
  if (activeBan(nk, uid) || activeMute(nk, uid)) throw rkError("You can't speak right now.", 7);
  return envelope;
}

function InitModule(ctx, logger, nk, initializer) {
  initializer.registerRpc("whoami", rpcWhoami);
  initializer.registerRpc("claim_name", rpcClaimName);
  initializer.registerRpc("redeem_invite", rpcRedeemInvite);
  initializer.registerRpc("claim_creator", rpcClaimCreator);
  initializer.registerRpc("db", rpcDb);
  initializer.registerRpc("content_get", rpcContentGet);
  initializer.registerRpc("content_put", rpcContentPut);
  initializer.registerRpc("econ_apply", rpcEconApply);
  initializer.registerRpc("features", rpcFeatures);
  initializer.registerRpc("module_get", rpcModuleGet);
  initializer.registerRpc("report", rpcReport);
  initializer.registerRpc("list_reports", rpcListReports);
  initializer.registerRtBefore("ChannelMessageSend", beforeChannelMessageSend);
  initializer.registerBeforeAuthenticateEmail(beforeAuthenticateEmail);
  logger.info("Rift Keepers modules loaded (invite only: %s)", inviteOnly(ctx));
}
