/* ==========================================================================
   Pendopo Ndalem 3D — papan aktivitas tim AI Ndalem AI Tech
   Ruang 3D bergaya balok, bisa diputar. Memakai three.js (dimuat dari CDN).
   Kalau 3D tidak tersedia di perangkat, halaman jatuh ke versi 2D (pendopo.js).

   Sumber data: feed publik anonim (status-public.json). Halaman ini TIDAK
   PERNAH menampilkan teks dari feed secara langsung: setiap nilai dicocokkan
   ke daftar tetap di bawah, lalu yang tampil adalah label milik halaman ini.
   ========================================================================== */

var FEED_URL = 'https://raw.githubusercontent.com/ramapudjiantoro/nat-feed/main/status-public.json';
var DEMO_URL = 'demo-status.json';
/* Penyimpanan langsung (real-time). Kosong = belum tersambung; halaman memakai feed biasa.
   Diisi alamat database, tanpa garis miring di akhir. Hanya dibaca, tidak pernah ditulis dari halaman. */
var LIVE_URL = '';
(function () {   // untuk uji di laptop: ?live=http://localhost:8124 (hanya alamat localhost yang diterima)
  try { var u = new URLSearchParams(window.location.search).get('live'); if (u && /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(u)) LIVE_URL = u; } catch (e) {}
})();
var BASI_MS = 3 * 3600 * 1000;
var BASI_LIVE_MS = 45 * 60 * 1000;
var JEDA_LIVE_MS = 3 * 60 * 1000;
var MUAT_ULANG_MS = 5 * 60 * 1000;
var KECEPATAN = 3.4;

var AGENTS = ['ki-lurah', 'mas-telik', 'mbak-serat', 'mas-wara', 'mbak-niti', 'pak-pamong', 'mas-undagi'];
var NAMA = {
  'ki-lurah': 'Ki Lurah', 'mas-telik': 'Mas Telik', 'mbak-serat': 'Mbak Serat', 'mas-wara': 'Mas Wara',
  'mbak-niti': 'Mbak Niti', 'pak-pamong': 'Pak Pamong', 'mas-undagi': 'Mas Undagi'
};
var PERAN = {
  'ki-lurah': 'Pengatur kerja & laporan', 'mas-telik': 'Pencari calon klien', 'mbak-serat': 'Penulis draf pesan',
  'mas-wara': 'Pembuat draf konten', 'mbak-niti': 'Pencatat', 'pak-pamong': 'Pemeriksa mutu', 'mas-undagi': 'Perawat website'
};
var STATES = ['idle', 'working', 'handoff', 'review', 'done', 'blocked'];
var TASK_LABEL = {
  briefing: 'briefing', sinkron: 'merapikan catatan', riset: 'mencari calon klien', draft: 'menulis draf',
  qa: 'memeriksa draf', konten: 'menyiapkan konten', funnel: 'menghitung angka', laporan: 'menulis laporan',
  maintenance: 'merawat website', rnd: 'mencoba perbaikan', rapat: 'rapat mingguan', ronda: 'ronda'
};
var SHIFT_LABEL = { pagi: 'Shift Pagi', siang: 'Shift Siang', malam: 'Shift Malam', undagi: 'Shift Undagi', rapat: 'Rapat Mingguan' };
var TODAY_LABEL = [
  ['riset', 'Calon klien dicari'], ['draft', 'Draf ditulis'], ['lolos_qa', 'Lolos pemeriksaan'],
  ['menunggu_kirim', 'Menunggu dikirim'], ['terkirim', 'Sudah dikirim'], ['dibalas', 'Dibalas'], ['konten', 'Draf konten']
];

/* Tampilan tiap karakter: p = pria (blangkon), w = wanita (sanggul) */
var RUPA = {
  'ki-lurah':   { jenis: 'p', baju: 0x3b2f2f, aksen: 0xc9a227, kepala: 0x4a2f1b, jarik: 0x6b4423 },
  'mas-telik':  { jenis: 'p', baju: 0x2f6b4f, aksen: 0x1d4634, kepala: 0x3d2a1c, jarik: 0x5a3a20 },
  'mbak-serat': { jenis: 'w', baju: 0xc0577b, aksen: 0xf4efe6, kepala: 0x1c1410, jarik: 0x5a3a20 },
  'mas-wara':   { jenis: 'p', baju: 0xb5532a, aksen: 0x7a3217, kepala: 0x2e2a26, jarik: 0x4f3a2a },
  'mbak-niti':  { jenis: 'w', baju: 0x5b8c5a, aksen: 0xf4efe6, kepala: 0x1c1410, jarik: 0x6b4423 },
  'pak-pamong': { jenis: 'p', baju: 0x7a7a7a, aksen: 0x454545, kepala: 0x3a3a3a, jarik: 0x4a3a2c, kumis: true },
  'mas-undagi': { jenis: 'p', baju: 0x3d5a80, aksen: 0x293f5c, kepala: 0x2c3a4d, jarik: 0x5a3a20 },
  'juragan':    { jenis: 'p', baju: 0xe8dcc0, aksen: 0xb9a77c, kepala: 0x6b4423, jarik: 0x3b2f2f }
};

/* ---- Tata letak (x = kiri-kanan, z = depan-belakang; depan = z positif) ---- */
var LANTAI = { x: 8, z: 5.5, y: 0.5 };
var RUMAH = {
  'ki-lurah': { x: 0, z: -3.4 }, 'mbak-niti': { x: -5.9, z: -3.2 }, 'mbak-serat': { x: -5.4, z: 0.6 },
  'mas-wara': { x: 5.2, z: -3.2 }, 'pak-pamong': { x: 5.6, z: 0.9 }, 'mas-undagi': { x: 11.2, z: 0.4 },
  'mas-telik': { x: -2.4, z: 3.2 }
};
var HADAP = { 'mbak-niti': -1.2, 'mbak-serat': -1.3, 'mas-wara': 0.9, 'pak-pamong': 1.3, 'mas-undagi': 0.6 };
var PERIKSA = { x: 3.4, z: 1.6 };
var REGOL = { x: -11, z: 9.2 };
var LUAR = { x: -19, z: 9.2 };
var TITIK_ANGKRINGAN = AGENTS.map(function (_, i) { return { x: 0.4 + i * 1.75, z: 9.4 }; });
var RONDA = [{ x: -9.5, z: 7 }, { x: 9.5, z: 7 }, { x: 9.5, z: -7 }, { x: -9.5, z: -7 }];

/* ---- Elemen ------------------------------------------------------------ */
var wadah = document.getElementById('pendopo-3d');
var bingkai = wadah ? wadah.parentNode : null;
var elLapis = document.getElementById('pendopo-lapis');
var elDemo = document.getElementById('pendopo-demo');
var elStatus = document.getElementById('pendopo-status');
var elWaktu = document.getElementById('pendopo-waktu');
var elAngka = document.getElementById('pendopo-angka');
var elDaftar = document.getElementById('pendopo-daftar');
var elTombol = document.getElementById('pendopo-replay');
var elPetunjuk = document.getElementById('pendopo-petunjuk');
var elLive = document.getElementById('pendopo-live');

var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var tenang = !!mq.matches;

/* ---- Cadangan 2D -------------------------------------------------------- */
function muatSkrip(src) {
  return new Promise(function (ok, gagal) {
    var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = gagal; document.body.appendChild(s);
  });
}
function pakai2D() {
  if (wadah) wadah.remove();
  if (bingkai) bingkai.classList.remove('tiga-d');
  if (elPetunjuk) elPetunjuk.hidden = true;
  var c = document.getElementById('pendopo-canvas'); if (c) c.hidden = false;
  return muatSkrip('sprites.js').then(function () { return muatSkrip('pendopo.js'); });
}
function bisaWebGL() {
  try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/* ---- Pembersih feed ---------------------------------------------------- */
function angka(v) { return (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 9999 && Math.floor(v) === v) ? v : null; }
function pilih(v, daftar) { return (typeof v === 'string' && daftar.indexOf(v) !== -1) ? v : null; }
function bersihkan(raw) {
  var out = { updated: null, shift: null, agents: {}, today: {}, timeline: [] };
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.updated === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(raw.updated)) {
    var d = new Date(raw.updated);
    if (!isNaN(d.getTime())) out.updated = d;
  }
  out.shift = pilih(raw.shift, Object.keys(SHIFT_LABEL));
  if (raw.agents && typeof raw.agents === 'object') {
    AGENTS.forEach(function (id) {
      var a = raw.agents[id];
      if (!a || typeof a !== 'object') return;
      var st = pilih(a.state, STATES), tk = pilih(a.task, Object.keys(TASK_LABEL));
      if (st && tk) out.agents[id] = { state: st, task: tk };
    });
  }
  if (raw.today && typeof raw.today === 'object') {
    TODAY_LABEL.forEach(function (p) { var n = angka(raw.today[p[0]]); if (n !== null) out.today[p[0]] = n; });
  }
  if (Array.isArray(raw.timeline)) {
    raw.timeline.slice(0, 200).forEach(function (ev) {
      if (!ev || typeof ev !== 'object') return;
      var id = pilih(ev.agent, AGENTS), st = pilih(ev.state, STATES), tk = pilih(ev.task, Object.keys(TASK_LABEL));
      var t = (typeof ev.t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(ev.t)) ? ev.t : null;
      if (id && st && tk && t) out.timeline.push({ t: t, agent: id, state: st, task: tk });
    });
  }
  return out;
}

/* ---- Keadaan ----------------------------------------------------------- */
var feed = null, demo = false, sepi = true, sumber = null;
var mode = 'live';
var replay = { i: 0, timer: 0, langkah: 6, jam: null };
var pelaku = {};
AGENTS.forEach(function (id, i) {
  var p = TITIK_ANGKRINGAN[i];
  pelaku[id] = { id: id, x: p.x, z: p.z, jalur: [], state: 'idle', task: null, t: Math.random() * 6, arah: 0, bawa: false, rondaKe: 0, grup: null };
});

function tujuan(id, state, task) {
  var i = AGENTS.indexOf(id);
  if (state === 'working') {
    if (id === 'mas-telik' && task === 'riset') return [REGOL, LUAR];
    if (task === 'ronda') return [RONDA[0]];
    return [RUMAH[id]];
  }
  if (state === 'handoff' || state === 'review') return [{ x: PERIKSA.x - (i % 3) * 1.3, z: PERIKSA.z + (i % 2) * 1.1 }];
  if (state === 'done' || state === 'blocked') return (id === 'mas-telik') ? [REGOL, RUMAH[id]] : [RUMAH[id]];
  return [TITIK_ANGKRINGAN[i]];
}
function atur(id, state, task, langsung) {
  var p = pelaku[id];
  var berubah = p.state !== state || p.task !== task;
  p.state = state; p.task = task;
  p.bawa = state === 'handoff' || (id === 'mas-telik' && state === 'done' && task === 'riset');
  var jalur = tujuan(id, state, task).map(function (q) { return { x: q.x, z: q.z }; });
  if (langsung || tenang) { var akhir = jalur[jalur.length - 1]; p.x = akhir.x; p.z = akhir.z; p.jalur = []; }
  else if (berubah || !p.jalur.length) p.jalur = jalur;
}
function terapkanLive(langsung) {
  sepi = !feed || !feed.updated || (Date.now() - feed.updated.getTime() > (sumber === 'live' ? BASI_LIVE_MS : BASI_MS));
  AGENTS.forEach(function (id) {
    var a = (!sepi && feed.agents[id]) ? feed.agents[id] : null;
    if (a && a.state !== 'idle') atur(id, a.state, a.task, langsung); else atur(id, 'idle', null, langsung);
  });
  if (sepi && malam(jamSekarang())) atur('mas-telik', 'working', 'ronda', langsung);
  perbaruiDaftar();
}

/* ---- Waktu ------------------------------------------------------------- */
var JAM_PAKSA = (function () {   // ?jam=10 untuk melihat suasana siang/malam (hanya mengubah cahaya)
  try { var v = parseFloat(new URLSearchParams(window.location.search).get('jam')); return (v >= 0 && v < 24) ? v : null; } catch (e) { return null; }
})();
function jamSekarang() { var d = new Date(Date.now() + 7 * 3600 * 1000); return d.getUTCHours() + d.getUTCMinutes() / 60; }
function malam(jam) { return jam >= 18 || jam < 5.5; }
function jamTampil() { if (JAM_PAKSA !== null) return JAM_PAKSA; return (mode === 'replay' && replay.jam !== null) ? replay.jam : jamSekarang(); }
function duaDigit(n) { return (n < 10 ? '0' : '') + n; }
var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
function tulisWaktu(d) {
  var w = new Date(d.getTime() + 7 * 3600 * 1000);
  return duaDigit(w.getUTCHours()) + '.' + duaDigit(w.getUTCMinutes()) + ' WIB, ' + w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()] + ' ' + w.getUTCFullYear();
}

/* ---- Replay ------------------------------------------------------------ */
function mulaiReplay() {
  if (!feed || !feed.timeline.length) return;
  mode = 'replay'; replay.i = 0; replay.timer = 0; replay.jam = null;
  replay.langkah = Math.min(60 / feed.timeline.length, 6);
  AGENTS.forEach(function (id) { atur(id, 'idle', null, true); });
  majuReplay();
  if (elTombol) elTombol.textContent = 'Hentikan putar ulang';
  if (elLive) elLive.hidden = true;
}
function majuReplay() {
  var ev = feed.timeline[replay.i];
  if (!ev) { selesaiReplay(); return; }
  atur(ev.agent, ev.state, ev.task, false);
  var b = ev.t.split(':');
  replay.jam = parseInt(b[0], 10) + parseInt(b[1], 10) / 60;
  setStatus('Putar ulang · ' + ev.t + ' · ' + NAMA[ev.agent] + ' · ' + TASK_LABEL[ev.task] + (ev.state === 'done' ? ' (selesai)' : ''));
  perbaruiDaftar();
  replay.i++;
}
function selesaiReplay() {
  mode = 'live'; replay.jam = null;
  if (elTombol) elTombol.textContent = 'Putar ulang shift terakhir';
  terapkanLive(false); tulisStatusLive();
}

/* ---- Teks & panel ------------------------------------------------------ */
function setStatus(t) { if (elStatus) elStatus.textContent = t; }
function tulisStatusLive() {
  if (!feed) { setStatus('Data belum tersedia.'); return; }
  if (sepi) { if (elLive) elLive.hidden = true; setStatus('Pendopo sedang sepi: tidak ada shift yang berjalan. Para asisten istirahat di angkringan.'); return; }
  var aktif = AGENTS.some(function (id) { var s = pelaku[id].state; return s === 'working' || s === 'handoff' || s === 'review'; });
  // di jeda antar tugas tidak ada yang "working"; selama kabar terakhir masih baru, shift dianggap masih berjalan
  var baru = sumber === 'live' && (Date.now() - feed.updated.getTime() < JEDA_LIVE_MS);
  var langsung = sumber === 'live' && (aktif || baru);
  if (elLive) elLive.hidden = !langsung;
  setStatus((langsung ? 'Langsung · ' : '') + (SHIFT_LABEL[feed.shift] || 'Shift') + ((aktif || baru) ? ' sedang berjalan.' : ' sudah selesai.'));
}
function teksKeadaan(p) {
  if (p.state === 'working') return 'sedang ' + (TASK_LABEL[p.task] || 'bekerja');
  if (p.state === 'handoff') return 'mengantar hasil untuk diperiksa';
  if (p.state === 'review') return 'hasilnya sedang diperiksa';
  if (p.state === 'done') return 'selesai ' + (TASK_LABEL[p.task] || '');
  if (p.state === 'blocked') return 'terhambat saat ' + (TASK_LABEL[p.task] || 'bekerja');
  return 'istirahat di angkringan';
}
function hex(n) { return '#' + ('000000' + n.toString(16)).slice(-6); }
function perbaruiDaftar() {
  if (!elDaftar) return;
  AGENTS.forEach(function (id) {
    var li = elDaftar.querySelector('[data-agent="' + id + '"]');
    if (!li) {
      li = document.createElement('li'); li.setAttribute('data-agent', id); li.className = 'pendopo-agen';
      var titik = document.createElement('span'); titik.className = 'pendopo-titik'; titik.style.background = hex(RUPA[id].baju);
      var isi = document.createElement('span'); isi.className = 'pendopo-isi';
      var nama = document.createElement('strong'); nama.textContent = NAMA[id];
      var peran = document.createElement('span'); peran.className = 'pendopo-peran'; peran.textContent = PERAN[id];
      var kead = document.createElement('span'); kead.className = 'pendopo-keadaan';
      isi.appendChild(nama); isi.appendChild(peran); isi.appendChild(kead);
      li.appendChild(titik); li.appendChild(isi); elDaftar.appendChild(li);
    }
    li.querySelector('.pendopo-keadaan').textContent = teksKeadaan(pelaku[id]);
    li.setAttribute('data-state', pelaku[id].state);
  });
}
function perbaruiPanel() {
  if (elDemo) elDemo.hidden = !demo;
  if (elWaktu) {
    var awal = sumber === 'live' ? 'Tersambung langsung' : 'Diperbarui tiap shift';
    elWaktu.textContent = (feed && feed.updated) ? awal + ' · kabar terakhir ' + tulisWaktu(feed.updated) : awal + ' · belum ada data';
  }
  if (elAngka) {
    while (elAngka.firstChild) elAngka.removeChild(elAngka.firstChild);
    var ada = false;
    TODAY_LABEL.forEach(function (p) {
      if (!feed || feed.today[p[0]] === undefined) return;
      ada = true;
      var k = document.createElement('div'); k.className = 'pendopo-kotak';
      var n = document.createElement('span'); n.className = 'pendopo-n'; n.textContent = String(feed.today[p[0]]);
      var l = document.createElement('span'); l.className = 'pendopo-l'; l.textContent = p[1];
      k.appendChild(n); k.appendChild(l); elAngka.appendChild(k);
    });
    if (!ada) { var ks = document.createElement('p'); ks.className = 'pendopo-l'; ks.textContent = 'Belum ada angka untuk shift terakhir.'; elAngka.appendChild(ks); }
  }
  if (elTombol) elTombol.disabled = !(feed && feed.timeline.length);
}

/* ==========================================================================
   Dunia 3D
   ========================================================================== */
function mulai3D(THREE, OrbitControls) {
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  wadah.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Pendopo joglo 3D dengan tujuh asisten AI. Rincian siapa mengerjakan apa ada di daftar di bawah.');

  var scene = new THREE.Scene();
  var kamera = new THREE.PerspectiveCamera(36, 16 / 11, 0.5, 200);
  var kontrol = new OrbitControls(kamera, renderer.domElement);
  kontrol.target.set(2.0, 1.4, 2.0);
  kontrol.enablePan = false; kontrol.enableDamping = true; kontrol.dampingFactor = 0.08;
  kontrol.minDistance = 14; kontrol.maxDistance = 70;
  kontrol.minPolarAngle = 0.25; kontrol.maxPolarAngle = Math.PI / 2 - 0.05;
  kontrol.autoRotate = !tenang; kontrol.autoRotateSpeed = 0.45;
  kontrol.addEventListener('start', function () { kontrol.autoRotate = false; if (elPetunjuk) elPetunjuk.hidden = true; });

  function bahan(warna, opsi) {
    var o = { color: warna }; if (opsi) Object.keys(opsi).forEach(function (k) { o[k] = opsi[k]; });
    return new THREE.MeshLambertMaterial(o);
  }
  function balok(w, h, d, warna, x, y, z, induk, opsi) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bahan(warna, opsi));
    m.position.set(x, y, z); (induk || scene).add(m); return m;
  }

  /* ---- Cahaya ---- */
  var langit = new THREE.HemisphereLight(0xffffff, 0x7c9a6a, 2.2); scene.add(langit);
  var matahari = new THREE.DirectionalLight(0xfff2d6, 2.0); matahari.position.set(-14, 22, 16); scene.add(matahari);
  var lampu = [];
  function titikLampu(x, y, z, kuat, jarak) {
    var l = new THREE.PointLight(0xffc76b, 0, jarak || 12, 1.6); l.position.set(x, y, z); l.userData.kuat = kuat; scene.add(l); lampu.push(l); return l;
  }
  var nyala = [];   // benda yang berpendar di malam hari
  function pendar(mesh) { nyala.push(mesh); return mesh; }

  /* ---- Tanah ---- */
  var tanah = new THREE.Mesh(new THREE.CircleGeometry(60, 48), bahan(0x86b36b)); tanah.rotation.x = -Math.PI / 2; scene.add(tanah);
  balok(15, 0.06, 2.2, 0xc9ab7c, -12.5, 0.03, 9.2);     // jalan dari regol
  balok(2.4, 0.06, 5.2, 0xc9ab7c, -4.2, 0.03, 8.2);
  balok(6.5, 0.06, 2.2, 0xc9ab7c, -1, 0.03, 6.8);
  balok(13, 0.06, 3.4, 0xc9ab7c, 6, 0.03, 9.6);         // pelataran angkringan

  /* ---- Lantai pendopo (tegel) ---- */
  var kt = document.createElement('canvas'); kt.width = 64; kt.height = 64;
  var g2 = kt.getContext('2d');
  for (var ty = 0; ty < 2; ty++) for (var tx = 0; tx < 2; tx++) { g2.fillStyle = ((tx + ty) % 2) ? '#d8bf95' : '#e9d6b4'; g2.fillRect(tx * 32, ty * 32, 32, 32); }
  g2.strokeStyle = '#b9895a'; g2.lineWidth = 2; g2.strokeRect(0, 0, 32, 32); g2.strokeRect(32, 0, 32, 32); g2.strokeRect(0, 32, 32, 32); g2.strokeRect(32, 32, 32, 32);
  var tegel = new THREE.CanvasTexture(kt); tegel.wrapS = tegel.wrapT = THREE.RepeatWrapping; tegel.repeat.set(8, 5.5);
  tegel.magFilter = THREE.NearestFilter; tegel.colorSpace = THREE.SRGBColorSpace;
  balok(LANTAI.x * 2 + 0.6, LANTAI.y, LANTAI.z * 2 + 0.6, 0x9a7347, 0, LANTAI.y / 2, 0);
  var atasLantai = new THREE.Mesh(new THREE.PlaneGeometry(LANTAI.x * 2, LANTAI.z * 2), new THREE.MeshLambertMaterial({ map: tegel }));
  atasLantai.rotation.x = -Math.PI / 2; atasLantai.position.y = LANTAI.y + 0.01; scene.add(atasLantai);
  balok(5, 0.25, 0.9, 0xcdbfa8, 0, 0.125, LANTAI.z + 0.75); balok(4.2, 0.12, 0.8, 0xb8aa93, 0, 0.06, LANTAI.z + 1.5);   // tangga

  /* ---- Tiang ---- */
  function tiang(x, z, tebal, tinggi, warna) {
    balok(tebal + 0.22, 0.25, tebal + 0.22, 0x8a8f94, x, LANTAI.y + 0.125, z);
    balok(tebal, tinggi, tebal, warna, x, LANTAI.y + 0.25 + tinggi / 2, z);
    balok(tebal + 0.18, 0.14, tebal + 0.18, 0xc9a227, x, LANTAI.y + 0.25 + tinggi - 0.3, z);
  }
  [[-2.9, -1.9], [2.9, -1.9], [-2.9, 1.9], [2.9, 1.9]].forEach(function (q) { tiang(q[0], q[1], 0.5, 5.2, 0x7b4a25); });   // saka guru
  for (var sx = -7.4; sx <= 7.41; sx += 3.7) { tiang(sx, -5, 0.3, 3.3, 0x8a5a2b); tiang(sx, 5, 0.3, 3.3, 0x8a5a2b); }
  [-1.7, 1.7].forEach(function (z) { tiang(-7.4, z, 0.3, 3.3, 0x8a5a2b); tiang(7.4, z, 0.3, 3.3, 0x8a5a2b); });
  // balok penghubung saka guru (tumpang sari sederhana)
  balok(6.3, 0.3, 0.3, 0x6b4423, 0, 5.8, -1.9); balok(6.3, 0.3, 0.3, 0x6b4423, 0, 5.8, 1.9);
  balok(0.3, 0.3, 4.1, 0x6b4423, -2.9, 5.8, 0); balok(0.3, 0.3, 4.1, 0x6b4423, 2.9, 5.8, 0);

  /* ---- Atap joglo: dua tingkat, memudar saat dilihat dari atas ---- */
  function limas(bx, bz, ax, az, y0, y1) {
    var A = [[-bx, y0, bz], [bx, y0, bz], [bx, y0, -bz], [-bx, y0, -bz]];
    var B = [[-ax, y1, az], [ax, y1, az], [ax, y1, -az], [-ax, y1, -az]];
    var v = [];
    function segi(a, b, c) { v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
    for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; segi(A[i], A[j], B[j]); segi(A[i], B[j], B[i]); }
    segi(B[0], B[1], B[2]); segi(B[0], B[2], B[3]);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    return geo;
  }
  var bahanAtap = [];
  function atap(geo, warna) {
    var m = new THREE.MeshLambertMaterial({ color: warna, side: THREE.DoubleSide, transparent: true, opacity: 1, depthWrite: false });
    bahanAtap.push(m);
    var mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 5; scene.add(mesh);
    var garis = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4a2114 })); scene.add(garis);
    return mesh;
  }
  atap(limas(9.6, 7.1, 4.2, 3.0, 3.9, 5.9), 0x93492f);     // atap bawah (landai)
  atap(limas(4.2, 3.0, 2.0, 0.25, 5.9, 9.0), 0x80402a);    // brunjung (curam)
  balok(4.4, 0.25, 0.35, 0xc9a227, 0, 9.1, 0);             // bubungan

  /* ---- Perabot ---- */
  var Y = LANTAI.y;
  // dampar Ki Lurah + papan target
  balok(2.6, 0.3, 1.3, 0x8a5a2b, 0, Y + 0.15, -3.5); balok(2.8, 0.08, 1.5, 0xc9a227, 0, Y + 0.04, -3.5);
  balok(0.14, 2.2, 0.14, 0x6b4423, -1.5, Y + 1.1, -4.8); balok(0.14, 2.2, 0.14, 0x6b4423, 1.5, Y + 1.1, -4.8);
  balok(3.2, 1.3, 0.1, 0xf4efe6, 0, Y + 1.75, -4.8);
  balok(1.2, 0.14, 0.04, 0x2e75b6, -0.7, Y + 2.05, -4.73); balok(1.9, 0.14, 0.04, 0x38a169, -0.35, Y + 1.75, -4.73); balok(0.5, 0.5, 0.04, 0xc9a227, 1.1, Y + 1.8, -4.73);
  // lemari arsip Mbak Niti
  balok(1.0, 2.4, 2.0, 0x6b4423, -7.0, Y + 1.2, -3.2);
  [0.5, 1.2, 1.9].forEach(function (h) { balok(0.06, 0.5, 1.7, 0x8a5a2b, -6.48, Y + h, -3.2); balok(0.06, 0.08, 0.3, 0xc9a227, -6.44, Y + h, -3.2); });
  // meja tulis Mbak Serat
  balok(1.0, 0.1, 1.7, 0x8a5a2b, -6.6, Y + 0.85, 0.6);
  [[-7, -0.1], [-7, 1.3], [-6.2, -0.1], [-6.2, 1.3]].forEach(function (q) { balok(0.1, 0.85, 0.1, 0x6b4423, q[0], Y + 0.42, q[1]); });
  balok(0.5, 0.03, 0.7, 0xf4efe6, -6.6, Y + 0.92, 0.5); balok(0.06, 0.06, 0.4, 0x2b1d16, -6.3, Y + 0.93, 1.0);
  // pojok foto Mas Wara
  balok(0.1, 2.6, 2.4, 0xefe3cf, 7.1, Y + 1.3, -3.4); balok(0.12, 0.2, 2.4, 0xc0577b, 7.08, Y + 2.5, -3.4);
  balok(0.5, 0.36, 0.36, 0x2b1d16, 6.0, Y + 1.5, -2.4); balok(0.16, 0.2, 0.2, 0x9fc4e8, 6.3, Y + 1.5, -2.4);
  balok(0.07, 1.35, 0.07, 0x2b1d16, 6.0, Y + 0.67, -2.4);
  // papan tulis Pak Pamong (grafik corong dari angka nyata)
  balok(0.12, 2.3, 2.6, 0x5a3a20, 7.2, Y + 1.35, 0.9); balok(0.06, 2.0, 2.3, 0xf7f7f2, 7.12, Y + 1.4, 0.9);
  var batang = [0x2e75b6, 0x3d8bcf, 0x38a169, 0xd69e2e, 0xc0577b].map(function (w, i) {
    var m = balok(0.05, 0.24, 1, w, 7.07, Y + 2.15 - i * 0.36, 0.9); m.visible = false; return m;
  });
  // kursi Juragan + lentera
  balok(1.0, 0.12, 0.9, 0x3b2f2f, 0, Y + 0.55, 3.2); balok(1.0, 1.1, 0.12, 0x3b2f2f, 0, Y + 1.05, 2.75);
  balok(0.84, 0.1, 0.74, 0xa53a2b, 0, Y + 0.66, 3.22);
  [[-0.42, 2.82], [0.42, 2.82], [-0.42, 3.58], [0.42, 3.58]].forEach(function (q) { balok(0.1, 0.55, 0.1, 0x3b2f2f, q[0], Y + 0.27, q[1]); });
  balok(0.5, 0.75, 0.5, 0x6b4423, 1.5, Y + 0.37, 3.2);
  var lentera = pendar(balok(0.3, 0.42, 0.3, 0xffd66b, 1.5, Y + 1.0, 3.2)); balok(0.36, 0.08, 0.36, 0x3a2a1c, 1.5, Y + 1.25, 3.2);
  var lampuLentera = titikLampu(1.5, Y + 1.2, 3.2, 26, 9);
  // lampu teplok di saka guru
  [[-2.9, -1.9], [2.9, -1.9], [-2.9, 1.9], [2.9, 1.9]].forEach(function (q) { pendar(balok(0.2, 0.3, 0.2, 0xffd66b, q[0], Y + 3.3, q[1] + (q[1] > 0 ? 0.36 : -0.36))); });
  titikLampu(0, Y + 3.4, -2.4, 60, 16); titikLampu(0, Y + 3.4, 2.4, 60, 16);

  // bengkel Mas Undagi (samping pendopo)
  balok(4.6, 0.12, 6.2, 0xbfa074, 11.4, 0.06, 0.4);
  [[9.4, -2.4], [13.4, -2.4], [9.4, 3.2], [13.4, 3.2]].forEach(function (q) { balok(0.22, 3.0, 0.22, 0x8a5a2b, q[0], 1.5, q[1]); });
  var atapBengkel = new THREE.Mesh(limas(2.5, 3.3, 2.5, 3.3, 3.0, 3.12), new THREE.MeshLambertMaterial({ color: 0x80402a, side: THREE.DoubleSide, transparent: true, opacity: 1, depthWrite: false }));
  atapBengkel.renderOrder = 5; scene.add(atapBengkel); bahanAtap.push(atapBengkel.material);
  balok(2.6, 0.12, 1.0, 0x8a5a2b, 11.6, 0.95, 2.2); balok(0.1, 0.95, 0.1, 0x6b4423, 10.5, 0.47, 2.2); balok(0.1, 0.95, 0.1, 0x6b4423, 12.7, 0.47, 2.2);
  balok(0.9, 0.08, 0.16, 0x9aa3ab, 11.2, 1.06, 2.2); balok(0.12, 0.3, 0.12, 0xc9a227, 12.2, 1.16, 2.2);
  balok(1.5, 0.1, 0.8, 0x8a5a2b, 12.4, 0.95, -1.2); balok(0.1, 0.95, 0.1, 0x6b4423, 12.4, 0.47, -1.2);
  var layar = pendar(balok(1.3, 0.85, 0.08, 0x22303c, 12.5, 1.6, -1.3)); layar.rotation.y = -0.5;
  [0x5fd08a, 0x9fc4e8, 0x5fd08a].forEach(function (w, i) { var b = balok(0.5 + i * 0.2, 0.06, 0.02, w, -0.2 + i * 0.05, 0.22 - i * 0.2, 0.05, layar); pendar(b); });
  titikLampu(11.6, 2.4, 0.6, 22, 9);

  // regol (gerbang)
  balok(0.5, 3.0, 0.5, 0x93492f, -11, 1.5, 7.9); balok(0.5, 3.0, 0.5, 0x93492f, -11, 1.5, 10.5);
  balok(1.1, 0.3, 3.9, 0x6d3320, -11, 3.15, 9.2); balok(0.8, 0.3, 2.9, 0x80402a, -11, 3.45, 9.2);
  pendar(balok(0.22, 0.3, 0.22, 0xffd66b, -10.6, 2.3, 7.9)); titikLampu(-10.2, 2.4, 9.2, 22, 9);

  // angkringan
  balok(4.2, 1.0, 1.3, 0x8a5a2b, 9.2, 0.5, 8.0); balok(4.4, 0.1, 1.5, 0x6b4423, 9.2, 1.05, 8.0);
  [[7.2, 7.4], [11.2, 7.4], [7.2, 8.6], [11.2, 8.6]].forEach(function (q) { balok(0.12, 2.5, 0.12, 0x5a3a20, q[0], 1.25, q[1]); });
  for (var k = 0; k < 8; k++) balok(0.56, 0.08, 1.9, (k % 2) ? 0xb5532a : 0xf4efe6, 7.2 + k * 0.57, 2.55, 8.0);
  [8.2, 9.2].forEach(function (x) { var t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 8), bahan(0x7fa7a0)); t.position.set(x, 1.27, 8.0); scene.add(t); balok(0.26, 0.05, 0.05, 0x3a2a1c, x + 0.22, 1.3, 8.0); });
  balok(0.14, 0.2, 0.14, 0xf4efe6, 10.2, 1.2, 8.1); balok(0.14, 0.2, 0.14, 0xf4efe6, 10.5, 1.2, 7.9);
  pendar(balok(0.2, 0.3, 0.2, 0xffd66b, 7.25, 2.1, 8.6)); titikLampu(6.0, 2.6, 10.6, 70, 16);
  balok(11.5, 0.1, 0.55, 0x8a5a2b, 6.0, 0.5, 10.7); balok(0.12, 0.5, 0.4, 0x6b4423, 0.8, 0.25, 10.7); balok(0.12, 0.5, 0.4, 0x6b4423, 11.2, 0.25, 10.7);

  // pepohonan & semak
  [[-13, -7], [14.5, -8], [-15, 2], [16, 7.5], [-6, -10], [7, -10.5], [-14, 13]].forEach(function (q, i) {
    balok(0.5, 1.6, 0.5, 0x6b4423, q[0], 0.8, q[1]);
    balok(2.4, 1.5, 2.4, 0x4f8a4a, q[0], 2.2, q[1]); balok(1.7, 1.1, 1.7, 0x5d9c56, q[0] + (i % 2 ? 0.2 : -0.2), 3.3, q[1]);
  });
  [[-9.5, 3], [-9.5, -3], [9, -6.6], [-4, -6.6], [3, -6.6]].forEach(function (q) { balok(1.3, 0.7, 1.3, 0x5d9c56, q[0], 0.35, q[1]); });

  /* ---- Karakter balok ---- */
  function buatKarakter(id) {
    var r = RUPA[id], gr = new THREE.Group();
    var kulit = 0xe0a878;
    var kakiK = new THREE.Group(), kakiN = new THREE.Group();
    kakiK.position.set(-0.14, 0.5, 0); kakiN.position.set(0.14, 0.5, 0);
    balok(0.2, 0.5, 0.22, 0x3a2a1c, 0, -0.25, 0, kakiK); balok(0.2, 0.5, 0.22, 0x3a2a1c, 0, -0.25, 0, kakiN);
    gr.add(kakiK); gr.add(kakiN);
    balok(0.58, 0.5, 0.38, r.jarik, 0, 0.72, 0, gr);
    balok(0.6, 0.08, 0.4, 0xc9a227, 0, 0.6, 0, gr);
    balok(0.62, 0.62, 0.38, r.baju, 0, 1.26, 0, gr);
    if (r.jenis === 'p') { balok(0.07, 0.6, 0.02, r.aksen, -0.13, 1.26, 0.2, gr); balok(0.07, 0.6, 0.02, r.aksen, 0.13, 1.26, 0.2, gr); }
    else balok(0.2, 0.5, 0.02, r.aksen, 0, 1.3, 0.2, gr);
    var lenganK = new THREE.Group(), lenganN = new THREE.Group();
    lenganK.position.set(-0.4, 1.52, 0); lenganN.position.set(0.4, 1.52, 0);
    balok(0.17, 0.42, 0.2, r.baju, 0, -0.2, 0, lenganK); balok(0.15, 0.16, 0.18, kulit, 0, -0.48, 0, lenganK);
    balok(0.17, 0.42, 0.2, r.baju, 0, -0.2, 0, lenganN); balok(0.15, 0.16, 0.18, kulit, 0, -0.48, 0, lenganN);
    gr.add(lenganK); gr.add(lenganN);
    var gulungan = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), bahan(0xf4efe6));
    gulungan.rotation.z = Math.PI / 2; gulungan.position.set(0, -0.5, 0.16); gulungan.visible = false; lenganN.add(gulungan);
    balok(0.46, 0.44, 0.42, kulit, 0, 1.8, 0, gr);
    balok(0.07, 0.08, 0.02, 0x2b1d16, -0.11, 1.84, 0.215, gr); balok(0.07, 0.08, 0.02, 0x2b1d16, 0.11, 1.84, 0.215, gr);
    if (r.kumis) balok(0.26, 0.06, 0.02, 0xf4efe6, 0, 1.7, 0.215, gr);
    if (r.jenis === 'p') {
      balok(0.5, 0.18, 0.46, r.kepala, 0, 2.06, 0, gr); balok(0.5, 0.1, 0.12, r.kepala, 0, 1.94, -0.19, gr);
      balok(0.16, 0.16, 0.14, r.kepala, 0, 1.98, -0.28, gr);        // mondolan blangkon
    } else {
      balok(0.5, 0.14, 0.46, r.kepala, 0, 2.05, 0, gr); balok(0.5, 0.3, 0.1, r.kepala, 0, 1.86, -0.2, gr);
      balok(0.24, 0.22, 0.2, r.kepala, 0, 1.86, -0.32, gr);         // sanggul
    }
    var bayang = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    bayang.rotation.x = -Math.PI / 2; bayang.position.y = 0.02; gr.add(bayang);
    gr.scale.setScalar(1.22);
    gr.userData = { kakiK: kakiK, kakiN: kakiN, lenganK: lenganK, lenganN: lenganN, gulungan: gulungan };
    scene.add(gr); return gr;
  }
  AGENTS.forEach(function (id) { pelaku[id].grup = buatKarakter(id); });
  var juragan = buatKarakter('juragan');
  juragan.position.set(0, Y + 0.12, 3.25); juragan.userData.kakiK.rotation.x = -1.35; juragan.userData.kakiN.rotation.x = -1.35;

  function tinggiTanah(x, z) { return (Math.abs(x) <= LANTAI.x + 0.2 && Math.abs(z) <= LANTAI.z + 0.2) ? LANTAI.y : 0; }

  /* ---- Label (HTML di atas canvas) ---- */
  var label = {};
  function buatLabel(kunci) {
    var el = document.createElement('span'); el.className = 'pendopo-nama'; el.hidden = true; elLapis.appendChild(el); label[kunci] = el; return el;
  }
  var vek = new THREE.Vector3();
  function tempel(el, x, y, z, teks, keadaan) {
    vek.set(x, y, z).project(kamera);
    if (vek.z > 1 || Math.abs(vek.x) > 1.05 || Math.abs(vek.y) > 1.05) { el.hidden = true; return; }
    if (el.textContent !== teks) el.textContent = teks;
    el.setAttribute('data-state', keadaan);
    el.style.left = ((vek.x * 0.5 + 0.5) * 100) + '%'; el.style.top = ((-vek.y * 0.5 + 0.5) * 100) + '%';
    el.hidden = false;
  }
  function perbaruiLabel() {
    if (!elLapis) return;
    AGENTS.forEach(function (id) {
      var p = pelaku[id], el = label[id] || buatLabel(id);
      if (!p.grup.visible) { el.hidden = true; return; }
      var diam = p.jalur.length === 0, teks = NAMA[id];
      if (diam && (p.state === 'working' || p.state === 'blocked') && TASK_LABEL[p.task]) teks += ' · ' + (p.state === 'blocked' ? 'terhambat' : TASK_LABEL[p.task]);
      else if (diam && p.state === 'done') teks += ' ✓';
      var tinggi = 2.95 + ((diam && p.state === 'idle') ? (AGENTS.indexOf(id) % 2) * 0.75 : 0);
      tempel(el, p.grup.position.x, p.grup.position.y + tinggi, p.grup.position.z, teks, diam ? p.state : 'idle');
    });
    var j = label.juragan || buatLabel('juragan');
    var n = feed && feed.today.menunggu_kirim !== undefined ? feed.today.menunggu_kirim : null;
    tempel(j, 0, Y + 3.1, 3.25, n === null ? 'Juragan' : 'Juragan · ' + n + ' pesan menunggu dikirim', 'juragan');
  }

  /* ---- Siang / malam ---- */
  var warnaSiang = new THREE.Color(0xbfe3f5), warnaMalam = new THREE.Color(0x0b1430), gelapKini = -1;
  scene.background = new THREE.Color(0xbfe3f5);
  function aturCahaya(gelap) {
    if (gelap === gelapKini) return; gelapKini = gelap;
    scene.background.copy(gelap ? warnaMalam : warnaSiang);
    langit.intensity = gelap ? 1.25 : 2.2; langit.color.set(gelap ? 0x7f93cc : 0xffffff); langit.groundColor.set(gelap ? 0x2a3350 : 0x7c9a6a);
    matahari.intensity = gelap ? 0.7 : 2.0; matahari.color.set(gelap ? 0x8fa3d9 : 0xfff2d6);
    lampu.forEach(function (l) { l.intensity = gelap ? l.userData.kuat : 0; });
    nyala.forEach(function (m) { m.material.emissive.set(gelap ? m.material.color : 0x000000); m.material.emissiveIntensity = gelap ? 0.9 : 0; });
    perbaruiLentera();
  }
  function perbaruiLentera() {
    var n = feed && feed.today.menunggu_kirim ? feed.today.menunggu_kirim : 0;
    lentera.material.color.set(n > 0 ? 0xffd66b : 0x8a8f94);
    lentera.material.emissive.set(n > 0 ? 0xffb347 : 0x000000); lentera.material.emissiveIntensity = n > 0 ? 1 : 0;
    lampuLentera.intensity = (n > 0 && gelapKini) ? lampuLentera.userData.kuat : 0;
  }
  function perbaruiPapan() {
    var t = feed ? feed.today : {};
    var nilai = [t.riset, t.draft, t.lolos_qa, t.terkirim, t.dibalas].map(function (v) { return v === undefined ? 0 : v; });
    var maks = Math.max.apply(null, nilai.concat([1]));
    nilai.forEach(function (v, i) {
      var pj = v / maks * 2.0; batang[i].visible = pj > 0.02;
      batang[i].scale.z = Math.max(pj, 0.02); batang[i].position.z = 0.9 - 1.0 + pj / 2;
    });
  }

  /* ---- Gerak & animasi ---- */
  function gerak(dt) {
    AGENTS.forEach(function (id) {
      var p = pelaku[id]; p.t += dt;
      if (p.state === 'working' && p.task === 'ronda' && !p.jalur.length) {
        p.rondaKe = (p.rondaKe + 1) % RONDA.length; p.jalur = [{ x: RONDA[p.rondaKe].x, z: RONDA[p.rondaKe].z }];
      }
      if (!p.jalur.length) return;
      var q = p.jalur[0], dx = q.x - p.x, dz = q.z - p.z, jarak = Math.sqrt(dx * dx + dz * dz), langkah = KECEPATAN * dt;
      if (jarak <= langkah) { p.x = q.x; p.z = q.z; p.jalur.shift(); }
      else { p.x += dx / jarak * langkah; p.z += dz / jarak * langkah; p.arah = Math.atan2(dx, dz); }
    });
  }
  function pose() {
    AGENTS.forEach(function (id) {
      var p = pelaku[id], g = p.grup, u = g.userData, jalan = p.jalur.length > 0;
      g.visible = p.x > -17.5;
      var naik = 0, ayun = 0, lk = 0, ln = 0;
      if (jalan && !tenang) { ayun = Math.sin(p.t * 11) * 0.7; lk = -ayun * 0.7; ln = ayun * 0.7; }
      else if (!jalan) {
        var hadap = (p.state === 'idle') ? 0 : (HADAP[id] !== undefined && p.state !== 'review' && p.state !== 'handoff' ? HADAP[id] : 0);
        p.arah = hadap;
        if (!tenang && p.state === 'working') { lk = -1.0 + Math.sin(p.t * 7) * 0.3; ln = -1.0 + Math.cos(p.t * 7) * 0.3; naik = Math.abs(Math.sin(p.t * 3.5)) * 0.04; }
        else if (!tenang && p.state === 'idle') { ln = (Math.sin(p.t * 0.9) > 0.75) ? -2.0 : 0; }
        else if (p.state === 'blocked') { lk = -2.6; ln = -2.6; }
      }
      if (p.bawa) ln = -0.9;
      u.kakiK.rotation.x = ayun; u.kakiN.rotation.x = -ayun; u.lenganK.rotation.x = lk; u.lenganN.rotation.x = ln;
      u.gulungan.visible = p.bawa;
      g.position.set(p.x, tinggiTanah(p.x, p.z) + naik, p.z);
      var beda = p.arah - g.rotation.y; while (beda > Math.PI) beda -= 2 * Math.PI; while (beda < -Math.PI) beda += 2 * Math.PI;
      g.rotation.y += tenang ? beda : beda * 0.2;
    });
  }
  function pudarAtap() {
    var elev = Math.PI / 2 - kontrol.getPolarAngle();
    var o = Math.max(0.14, Math.min(1, (0.3 - elev) / 0.18));
    bahanAtap.forEach(function (m) { m.opacity = o; });
  }

  /* ---- Ukuran & kamera ---- */
  var pertamaUkur = true;
  function ukur() {
    var w = wadah.clientWidth, h = wadah.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
    if (pertamaUkur) {
      pertamaUkur = false;
      var jarak = 32 * Math.max(1, 1.2 / kamera.aspect), az = 0.42, el = 0.46;
      kamera.position.set(kontrol.target.x + jarak * Math.cos(el) * Math.sin(az), kontrol.target.y + jarak * Math.sin(el), kontrol.target.z + jarak * Math.cos(el) * Math.cos(az));
      kontrol.update();
    }
  }
  if (window.ResizeObserver) new ResizeObserver(ukur).observe(wadah); else window.addEventListener('resize', ukur);
  ukur();

  /* ---- Putaran ---- */
  function gambar() {
    aturCahaya(malam(jamTampil())); pose(); kontrol.update(); pudarAtap(); renderer.render(scene, kamera); perbaruiLabel();
  }
  var terakhir = performance.now();
  function putaran(ts) {
    var nyata = Math.min((ts - terakhir) / 1000, 2); terakhir = ts;
    if (!document.hidden) {
      if (mode === 'replay') {
        replay.timer += Math.min(nyata, replay.langkah);
        if (replay.timer >= replay.langkah) { replay.timer = 0; if (replay.i >= feed.timeline.length) selesaiReplay(); else majuReplay(); }
      }
      var sisa = nyata; while (sisa > 0) { var potong = Math.min(sisa, 0.05); gerak(potong); sisa -= potong; }
      gambar();
    }
    window.requestAnimationFrame(putaran);
  }

  /* ---- Data ---- */
  function ambil(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
      .then(function (raw) { var b = bersihkan(raw); if (!b || !b.updated) throw new Error('feed tidak valid'); return b; });
  }
  var pertama = true;
  function ambilTerbaik() {
    var rantai = LIVE_URL ? ambil(LIVE_URL + '/status.json').then(function (b) { return { b: b, s: 'live' }; }) : Promise.reject(new Error('tanpa live'));
    return rantai
      .catch(function () { return ambil(FEED_URL).then(function (b) { return { b: b, s: 'feed' }; }); })
      .catch(function () { return ambil(DEMO_URL).then(function (b) { return { b: b, s: 'demo' }; }); })
      .catch(function () { return { b: null, s: null }; });
  }
  var sedangMuat = false;
  function muat() {
    if (sedangMuat) return Promise.resolve();
    sedangMuat = true;
    return ambilTerbaik().then(function (h) {
      sedangMuat = false;
      var sama = feed && h.b && feed.updated && h.b.updated.getTime() === feed.updated.getTime() && h.s === sumber;
      if (sama && !pertama) {      // tidak ada kabar baru; cukup periksa apakah datanya sudah basi
        if (mode === 'live' && !sepi && Date.now() - feed.updated.getTime() > (sumber === 'live' ? BASI_LIVE_MS : BASI_MS)) { terapkanLive(false); tulisStatusLive(); }
        return;
      }
      feed = h.b; sumber = h.s; demo = h.s === 'demo';
      perbaruiPanel(); perbaruiPapan(); perbaruiLentera();
      if (mode === 'replay' && !pertama && sumber === 'live') selesaiReplay();   // ada kabar langsung: tinggalkan putar ulang
      else if (mode === 'live') { terapkanLive(pertama); tulisStatusLive(); }
      if (pertama && sepi && !tenang && feed && feed.timeline.length) mulaiReplay();
      pertama = false;
    }, function () { sedangMuat = false; });
  }
  function langganan() {
    if (!LIVE_URL) return;
    var berkala = null;
    function cekBerkala() { if (!berkala) berkala = window.setInterval(muat, 3000); }
    if (!window.EventSource) { cekBerkala(); return; }
    try {
      var es = new EventSource(LIVE_URL + '/status.json');
      es.addEventListener('put', muat); es.addEventListener('patch', muat);
      es.onerror = function () { es.close(); cekBerkala(); };
    } catch (e) { cekBerkala(); }
  }
  if (elTombol) elTombol.addEventListener('click', function () { if (mode === 'replay') selesaiReplay(); else mulaiReplay(); });
  if (mq.addEventListener) mq.addEventListener('change', function (e) { tenang = e.matches; if (tenang) kontrol.autoRotate = false; });

  perbaruiDaftar(); muat().then(langganan); window.setInterval(muat, MUAT_ULANG_MS);
  window.setInterval(function () { if (mode === 'live' && feed) tulisStatusLive(); }, 20000);
  window.requestAnimationFrame(putaran);
}

/* ---- Mulai ------------------------------------------------------------- */
(async function () {
  if (!wadah || !bisaWebGL()) { pakai2D(); return; }
  try {
    var THREE = await import('three');
    var tambahan = await import('three/addons/controls/OrbitControls.js');
    mulai3D(THREE, tambahan.OrbitControls);
  } catch (e) {
    if (window.console) console.warn('Pendopo 3D tidak bisa dimuat, memakai versi 2D.', e);
    pakai2D();
  }
})();
