// love_server.js - የፍቅር app ሰርቨር (PWA ድጋፍ ያለው) - ወደ ~/love/server.js ኮፒ አድርገው
const http = require('http'), fs = require('fs'), path = require('path');
const { Server } = require('socket.io');

// app እንደ ስልክ app እንዲጫን የሚያደርገው manifest
const MANIFEST = JSON.stringify({
  name: 'ፍቅር 💕', short_name: 'ፍቅር', start_url: '/', display: 'standalone',
  orientation: 'portrait', background_color: '#2b0a3e', theme_color: '#2b0a3e',
  icons: [
    { src: '/love_icon_192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/love_icon_512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]
});
// ቀላል service worker
const SW = "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('fetch',()=>{});";

const send = (res, type, body) => { res.writeHead(200, { 'Content-Type': type }); res.end(body); };
const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/manifest.json') return send(res, 'application/manifest+json', MANIFEST);
  if (u === '/sw.js') return send(res, 'text/javascript', SW);
  if (u === '/love_icon_192.png' || u === '/love_icon_512.png')
    return fs.readFile(path.join(__dirname, u.slice(1)), (e, d) => e ? (res.writeHead(404), res.end()) : send(res, 'image/png', d));
  fs.readFile(path.join(__dirname, 'index.html'), (e, d) => send(res, 'text/html; charset=utf-8', d || ''));
});
const io = new Server(srv);
const rooms = {}; // የእያንዳንዱ ክፍል ታሪክ እና ጀርባ
const count = (c) => (io.sockets.adapter.rooms.get(c) || { size: 0 }).size;

io.on('connection', (s) => {
  s.on('join', (code) => {
    code = String(code).trim().slice(0, 30);
    if (!code) return;
    s.join(code); s.room = code;
    const r = (rooms[code] = rooms[code] || { items: [], bg: 'night', fade: false });
    s.emit('init', r);
    io.to(code).emit('count', count(code));
  });
  s.on('item', (it) => {
    const r = rooms[s.room]; if (!r) return;
    // የመስመር ቁርጥራጮችን በ id ያዋህዳል
    const old = it.k === 's' && r.items.find((x) => x.id === it.id);
    if (old) old.p.push(...it.p); else r.items.push(it);
    if (r.items.length > 800) r.items.shift();
    s.to(s.room).emit('item', it);
  });
  s.on('clear', () => { const r = rooms[s.room]; if (r) { r.items = []; s.to(s.room).emit('clear'); } });
  s.on('bg', (b) => { const r = rooms[s.room]; if (r) { r.bg = b; s.to(s.room).emit('bg', b); } });
  s.on('fade', (f) => { const r = rooms[s.room]; if (r) { r.fade = !!f; s.to(s.room).emit('fade', !!f); } });
  s.on('disconnect', () => { if (s.room) io.to(s.room).emit('count', count(s.room)); });
});
srv.listen(process.env.PORT || 3000, () => console.log('ፍቅር app ተነስቷል 💕 port', process.env.PORT || 3000));
