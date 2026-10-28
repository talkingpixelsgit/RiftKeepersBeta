'use strict';
// Runs the round-2 /mmo services (party battles, guilds, arena, tavern, trading, Patron quest, world presence)
// behind the Nakama stack while they are ported to Nakama modules one by one.
// Identity comes from Nakama: the client sends its Nakama session token, this bridge verifies it with the
// shared session key and maps the Nakama user to one round-2 session named after their Keeper.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const LEGACY = process.env.RK_LEGACY_DIR || '/legacy/server';
const STATE = process.env.RK_STATE_DIR || '/state';
const HOST = process.env.PUBLIC_HOST, ORIGIN = 'https://' + HOST, KEY = process.env.NAKAMA_SESSION_KEY;
if (!HOST || !KEY) throw Error('PUBLIC_HOST and NAKAMA_SESSION_KEY are required.');

const { socialHTTP } = require(path.join(LEGACY, 'social-http.cjs'));
const { createBulletin } = require(path.join(LEGACY, 'bulletin-service.cjs'));

function validateRequest(req) {
  if (req.headers.host !== HOST) throw Error('Game hostname required.');
  if ((req.headers.origin && req.headers.origin !== ORIGIN) || (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== ORIGIN)) throw Error('Same-origin requests required.');
}
// Only nginx (on the private compose network) reaches this service; it appends the client address last.
function clientAddress(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return fwd[fwd.length - 1] || req.socket.remoteAddress;
}

// ---- Nakama session tokens: HS256 JWTs signed with session.encryption_key ----
const b64url = buf => buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function nakamaUser(header) {
  const m = /^Nakama ([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(header || ''));
  if (!m) return null;
  const expected = b64url(crypto.createHmac('sha256', KEY).update(m[1] + '.' + m[2]).digest());
  const given = Buffer.from(m[3]), want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) throw Object.assign(Error('Sign in again.'), { status: 401 });
  const claims = JSON.parse(Buffer.from(m[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  if (!claims.uid || !claims.usn || !(claims.exp * 1000 > Date.now())) throw Object.assign(Error('Your session expired. Sign in again.'), { status: 401 });
  return { id: claims.uid, name: claims.usn };
}

const linksFile = path.join(STATE, 'nakama-links.json');
let links = fs.existsSync(linksFile) ? JSON.parse(fs.readFileSync(linksFile, 'utf8')) : {};
function saveLinks() { const tmp = linksFile + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(links)); fs.renameSync(tmp, linksFile); }

fs.mkdirSync(STATE, { recursive: true });
const bulletin = createBulletin({ file: path.join(STATE, 'bulletin.json') });
const social = socialHTTP({ bulletin, file: path.join(STATE, 'combat03.json'), validateRequest, clientAddress, scope: 'rift-keepers-beta' });

// socialHTTP doesn't export session(), so call its own route in-process (keeps its name checks and limits).
function createSession(name) {
  let out = null, status = 0;
  const req = require('node:stream').Readable.from([JSON.stringify({ name })]);
  Object.assign(req, { url: '/mmo/session', method: 'POST', headers: { host: HOST, origin: ORIGIN, 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' } });
  const res = { writeHead(s) { status = s; }, end(body) { out = JSON.parse(body); } };
  return social(req, res).then(() => { if (status !== 200) throw Object.assign(Error(out && out.error || 'Could not join the board.'), { status }); return out.token; });
}

const server = http.createServer(async (req, res) => {
  const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(body)); };
  try {
    if (req.url === '/mmo/health') { reply(200, { service: 'riftkeepers-mmo-bridge', status: 'ready' }); return; }
    if (!req.url.startsWith('/mmo/')) { reply(404, { error: 'Unknown route.' }); return; }
    if (req.url !== '/mmo/bulletin') {
      const u = nakamaUser(req.headers.authorization);
      if (!u) { reply(401, { error: 'Sign in to the Hall to use shared play.' }); return; }
      // One round-2 session per Nakama user, created on first use and renamed when their Keeper name changes.
      let token = links[u.id];
      if (!token) { token = await createSession(u.name); links[u.id] = token; saveLinks(); }
      else {
        try { if (social.read(token).you.name !== u.name) { try { social.claimName(token, u.name); } catch (e) { /* keeps the old name */ } } }
        catch (e) { token = await createSession(u.name); links[u.id] = token; saveLinks(); }
      }
      req.headers.authorization = token;
      // Keeper names are managed by Nakama; /mmo/session just returns the linked board state.
      if (req.url === '/mmo/session' || req.url === '/mmo/name') { validateRequest(req); reply(200, { token: 'nakama', ...social.read(token) }); return; }
    }
    if (!(await social(req, res))) reply(404, { error: 'Unknown route.' });
  } catch (e) { reply(e.status || 400, { error: e.message }); }
});
server.listen(8090, () => console.log('Rift Keepers /mmo bridge listening on 8090 for ' + HOST));
