/* ==========================================================================
   Pendopo Ndalem — papan aktivitas tim AI Ndalem AI Tech
   Canvas 2D, vanilla JS, tanpa library.

   Sumber data: feed publik anonim (status-public.json). Feed hanya berisi
   nilai dari daftar tetap. Halaman ini TIDAK PERNAH menampilkan teks dari
   feed secara langsung: setiap nilai dicocokkan dulu ke daftar di bawah,
   lalu yang tampil adalah label milik halaman ini sendiri.
   ========================================================================== */
(function () {
  'use strict';

  var SP = window.PendopoSprites;
  var FEED_URL = 'https://raw.githubusercontent.com/ramapudjiantoro/nat-feed/main/status-public.json';
  var DEMO_URL = 'demo-status.json';

  var W = 256, H = 208, SCALE = 3;
  var KECEPATAN = 34;            // pixel logis per detik
  var BASI_MS = 3 * 3600 * 1000; // lebih lama dari ini = tidak ada shift berjalan
  var MUAT_ULANG_MS = 5 * 60 * 1000;

  var AGENTS = ['ki-lurah', 'mas-telik', 'mbak-serat', 'mas-wara', 'mbak-niti', 'pak-pamong', 'mas-undagi'];
  var NAMA = {
    'ki-lurah': 'Ki Lurah', 'mas-telik': 'Mas Telik', 'mbak-serat': 'Mbak Serat', 'mas-wara': 'Mas Wara',
    'mbak-niti': 'Mbak Niti', 'pak-pamong': 'Pak Pamong', 'mas-undagi': 'Mas Undagi'
  };
  var PERAN = {
    'ki-lurah': 'Pengatur kerja & laporan', 'mas-telik': 'Pencari calon klien', 'mbak-serat': 'Penulis draf pesan',
    'mas-wara': 'Pembuat draf konten', 'mbak-niti': 'Pencatat', 'pak-pamong': 'Pemeriksa mutu',
    'mas-undagi': 'Perawat website'
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

  /* ---- Tata letak (koordinat logis) -------------------------------------- */
  var RUMAH = {
    'ki-lurah': { x: 120, y: 60 }, 'mbak-niti': { x: 54, y: 62 }, 'mbak-serat': { x: 62, y: 100 },
    'mas-wara': { x: 180, y: 62 }, 'pak-pamong': { x: 178, y: 104 }, 'mas-undagi': { x: 228, y: 98 },
    'mas-telik': { x: 96, y: 126 }
  };
  var PERIKSA = { x: 158, y: 110 };
  var REGOL = { x: 20, y: 172 };
  var LUAR = { x: -26, y: 172 };
  var TITIK_ANGKRINGAN = AGENTS.map(function (_, i) { return { x: 112 + i * 19, y: 184 }; });
  var RONDA = [{ x: 30, y: 152 }, { x: 214, y: 152 }, { x: 214, y: 36 }, { x: 30, y: 36 }];

  /* ---- Elemen ------------------------------------------------------------ */
  var canvas = document.getElementById('pendopo-canvas');
  if (!canvas || !SP) return;
  var ctx = canvas.getContext('2d');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  var elLapis = document.getElementById('pendopo-lapis');
  var elDemo = document.getElementById('pendopo-demo');
  var elStatus = document.getElementById('pendopo-status');
  var elWaktu = document.getElementById('pendopo-waktu');
  var elAngka = document.getElementById('pendopo-angka');
  var elDaftar = document.getElementById('pendopo-daftar');
  var elTombol = document.getElementById('pendopo-replay');

  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var tenang = !!mq.matches;

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
        if (st && tk) out.agents[id] = { state: st, task: tk, count: angka(a.count) };
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
  var feed = null, demo = false, sepi = true;
  var mode = 'live';           // 'live' | 'replay'
  var replay = { i: 0, timer: 0, langkah: 6, jam: null };
  var pelaku = {};
  AGENTS.forEach(function (id, i) {
    var p = TITIK_ANGKRINGAN[i];
    pelaku[id] = { id: id, x: p.x, y: p.y, jalur: [], state: 'idle', task: null, frame: 0, t: 0, balik: false, bawa: false, rondaKe: 0 };
  });

  function tujuan(id, state, task) {
    var i = AGENTS.indexOf(id);
    if (state === 'working') {
      if (id === 'mas-telik' && task === 'riset') return [REGOL, LUAR];
      if (task === 'ronda') return [RONDA[0]];
      return [RUMAH[id]];
    }
    if (state === 'handoff' || state === 'review') return [{ x: PERIKSA.x - (i % 3) * 14, y: PERIKSA.y + (i % 2) * 10 }];
    if (state === 'done' || state === 'blocked') {
      return (id === 'mas-telik') ? [REGOL, RUMAH[id]] : [RUMAH[id]];
    }
    return [TITIK_ANGKRINGAN[i]];
  }

  function atur(id, state, task, langsung) {
    var p = pelaku[id];
    var berubah = p.state !== state || p.task !== task;
    p.state = state; p.task = task;
    p.bawa = state === 'handoff' || (id === 'mas-telik' && state === 'done' && task === 'riset');
    var jalur = tujuan(id, state, task).map(function (q) { return { x: q.x, y: q.y }; });
    if (langsung || tenang) {
      var akhir = jalur[jalur.length - 1];
      p.x = akhir.x; p.y = akhir.y; p.jalur = [];
    } else if (berubah || !p.jalur.length) {
      p.jalur = jalur;
    }
  }

  function terapkanLive(langsung) {
    sepi = !feed || !feed.updated || (Date.now() - feed.updated.getTime() > BASI_MS);
    AGENTS.forEach(function (id) {
      var a = (!sepi && feed.agents[id]) ? feed.agents[id] : null;
      if (a && a.state !== 'idle') atur(id, a.state, a.task, langsung);
      else atur(id, 'idle', null, langsung);
    });
    if (sepi && malam(jamSekarang())) atur('mas-telik', 'working', 'ronda', langsung);
    perbaruiDaftar();
  }

  /* ---- Waktu ------------------------------------------------------------- */
  function jamSekarang() { var d = new Date(Date.now() + 7 * 3600 * 1000); return d.getUTCHours() + d.getUTCMinutes() / 60; }
  function malam(jam) { return jam >= 18 || jam < 5.5; }
  function jamTampil() { return (mode === 'replay' && replay.jam !== null) ? replay.jam : jamSekarang(); }
  function duaDigit(n) { return (n < 10 ? '0' : '') + n; }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tulisWaktu(d) {
    var w = new Date(d.getTime() + 7 * 3600 * 1000);
    return duaDigit(w.getUTCHours()) + '.' + duaDigit(w.getUTCMinutes()) + ' WIB, ' + w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()] + ' ' + w.getUTCFullYear();
  }

  /* ---- Replay ------------------------------------------------------------ */
  function mulaiReplay() {
    if (!feed || !feed.timeline.length) return;
    mode = 'replay';
    replay.i = 0; replay.timer = 0; replay.jam = null;
    replay.langkah = Math.min(60 / feed.timeline.length, 6);
    AGENTS.forEach(function (id) { atur(id, 'idle', null, true); });
    majuReplay();
    if (elTombol) elTombol.textContent = 'Hentikan putar ulang';
    if (tenang) jadwalTenang();
  }
  function majuReplay() {
    var ev = feed.timeline[replay.i];
    if (!ev) { selesaiReplay(); return; }
    atur(ev.agent, ev.state, ev.task, false);
    var bagian = ev.t.split(':');
    replay.jam = parseInt(bagian[0], 10) + parseInt(bagian[1], 10) / 60;
    setStatus('Putar ulang · ' + ev.t + ' · ' + NAMA[ev.agent] + ' · ' + TASK_LABEL[ev.task] + (ev.state === 'done' ? ' (selesai)' : ''));
    perbaruiDaftar();
    replay.i++;
  }
  function selesaiReplay() {
    mode = 'live'; replay.jam = null;
    if (elTombol) elTombol.textContent = 'Putar ulang shift terakhir';
    terapkanLive(false);
    tulisStatusLive();
  }
  var timerTenang = null;
  function jadwalTenang() {
    clearTimeout(timerTenang);
    if (mode !== 'replay') return;
    timerTenang = setTimeout(function () {
      if (mode !== 'replay') return;
      if (replay.i >= feed.timeline.length) selesaiReplay(); else majuReplay();
      render(); jadwalTenang();
    }, replay.langkah * 1000);
  }

  /* ---- Teks & panel ------------------------------------------------------ */
  function setStatus(t) { if (elStatus) elStatus.textContent = t; }
  function tulisStatusLive() {
    if (!feed) { setStatus('Data belum tersedia.'); return; }
    if (sepi) setStatus('Pendopo sedang sepi: tidak ada shift yang berjalan. Para asisten istirahat di angkringan.');
    else {
      var aktif = AGENTS.some(function (id) { var s = pelaku[id].state; return s === 'working' || s === 'handoff' || s === 'review'; });
      setStatus((SHIFT_LABEL[feed.shift] || 'Shift') + (aktif ? ' sedang berjalan.' : ' baru saja selesai.'));
    }
  }
  function teksKeadaan(p) {
    if (p.state === 'working') return 'sedang ' + (TASK_LABEL[p.task] || 'bekerja');
    if (p.state === 'handoff') return 'mengantar hasil untuk diperiksa';
    if (p.state === 'review') return 'hasilnya sedang diperiksa';
    if (p.state === 'done') return 'selesai ' + (TASK_LABEL[p.task] || '');
    if (p.state === 'blocked') return 'terhambat saat ' + (TASK_LABEL[p.task] || 'bekerja');
    return 'istirahat di angkringan';
  }
  function perbaruiDaftar() {
    if (!elDaftar) return;
    AGENTS.forEach(function (id) {
      var li = elDaftar.querySelector('[data-agent="' + id + '"]');
      if (!li) {
        li = document.createElement('li');
        li.setAttribute('data-agent', id);
        li.className = 'pendopo-agen';
        var titik = document.createElement('span'); titik.className = 'pendopo-titik';
        titik.style.background = SP.KARAKTER[id].pal.c;
        var isi = document.createElement('span'); isi.className = 'pendopo-isi';
        var nama = document.createElement('strong'); nama.textContent = NAMA[id];
        var peran = document.createElement('span'); peran.className = 'pendopo-peran'; peran.textContent = PERAN[id];
        var kead = document.createElement('span'); kead.className = 'pendopo-keadaan';
        isi.appendChild(nama); isi.appendChild(peran); isi.appendChild(kead);
        li.appendChild(titik); li.appendChild(isi);
        elDaftar.appendChild(li);
      }
      li.querySelector('.pendopo-keadaan').textContent = teksKeadaan(pelaku[id]);
      li.setAttribute('data-state', pelaku[id].state);
    });
  }
  function perbaruiPanel() {
    if (elDemo) elDemo.hidden = !demo;
    if (elWaktu) {
      elWaktu.textContent = (feed && feed.updated)
        ? 'Diperbarui tiap shift · terakhir ' + tulisWaktu(feed.updated)
        : 'Diperbarui tiap shift · belum ada data';
    }
    if (elAngka) {
      while (elAngka.firstChild) elAngka.removeChild(elAngka.firstChild);
      var ada = false;
      TODAY_LABEL.forEach(function (p) {
        if (!feed || feed.today[p[0]] === undefined) return;
        ada = true;
        var kotak = document.createElement('div'); kotak.className = 'pendopo-kotak';
        var n = document.createElement('span'); n.className = 'pendopo-n'; n.textContent = String(feed.today[p[0]]);
        var l = document.createElement('span'); l.className = 'pendopo-l'; l.textContent = p[1];
        kotak.appendChild(n); kotak.appendChild(l); elAngka.appendChild(kotak);
      });
      if (!ada) {
        var kosong = document.createElement('p'); kosong.className = 'pendopo-l'; kosong.textContent = 'Belum ada angka untuk shift terakhir.';
        elAngka.appendChild(kosong);
      }
    }
    if (elTombol) elTombol.disabled = !(feed && feed.timeline.length);
  }

  /* ---- Menggambar -------------------------------------------------------- */
  function kotak(x, y, w, h, warna) { ctx.fillStyle = warna; ctx.fillRect(x, y, w, h); }

  function gambarLatar() {
    kotak(0, 0, W, H, '#86b36b');
    // rumput bertekstur
    for (var gy = 0; gy < H; gy += 8) for (var gx = (gy / 8 % 2) * 6; gx < W; gx += 12) kotak(gx, gy + 3, 2, 1, '#79a55f');
    // jalan tanah dari regol ke tangga pendopo
    kotak(0, 176, 100, 10, '#c9ab7c'); kotak(92, 158, 12, 28, '#c9ab7c'); kotak(92, 156, 72, 8, '#c9ab7c');
    kotak(0, 176, 100, 1, '#b3956a'); kotak(104, 164, 60, 1, '#b3956a');
    // semak & pohon
    [[8, 20], [232, 16], [240, 150], [6, 120], [226, 44]].forEach(function (p) {
      kotak(p[0], p[1] + 4, 14, 8, '#4f8a4a'); kotak(p[0] + 2, p[1], 10, 6, '#5d9c56'); kotak(p[0] + 4, p[1] + 2, 3, 2, '#7fb873');
    });
  }

  function gambarPendopo() {
    // lantai tegel
    kotak(34, 42, 180, 110, '#b9895a');
    for (var ty = 44; ty < 150; ty += 12) for (var tx = 36; tx < 212; tx += 12) {
      kotak(tx, ty, 11, 11, ((tx + ty) / 12 % 2 < 1) ? '#e7d3b0' : '#d8bf95');
    }
    kotak(34, 150, 180, 3, '#8a6238');
    // tangga depan
    kotak(104, 152, 48, 4, '#cdbfa8'); kotak(108, 156, 40, 3, '#b8aa93');
    // atap joglo (tampak dari depan-atas)
    kotak(100, 2, 56, 8, '#6d3320'); kotak(76, 10, 104, 8, '#80402a'); kotak(48, 18, 160, 10, '#93492f'); kotak(28, 28, 200, 10, '#6d3320');
    for (var gx = 30; gx < 226; gx += 6) kotak(gx, 30, 1, 6, '#5a2a1a');
    for (var hx = 50; hx < 206; hx += 6) kotak(hx, 20, 1, 6, '#7a3b24');
    kotak(120, 0, 16, 3, '#c9a227');
    kotak(34, 38, 180, 4, 'rgba(60,35,20,.35)');
  }

  function gambarSaka(x, y) {
    kotak(x - 1, y + 26, 10, 3, '#5a3a20'); kotak(x, y, 8, 27, '#7b4a25'); kotak(x + 1, y, 2, 27, '#96602f');
    kotak(x - 1, y - 2, 10, 3, '#c9a227');
  }

  function gambarPerabot(jam) {
    var gelap = malam(jam);
    // dampar Ki Lurah + papan target
    kotak(112, 44, 32, 9, '#f4efe6'); kotak(112, 44, 32, 1, '#7b4a25'); kotak(112, 52, 32, 1, '#7b4a25');
    kotak(116, 47, 10, 1, '#2e75b6'); kotak(116, 49, 16, 1, '#38a169'); kotak(134, 47, 6, 3, '#c9a227');
    kotak(110, 74, 36, 5, '#8a5a2b'); kotak(110, 79, 36, 2, '#6b4423');
    // lemari arsip Mbak Niti
    kotak(38, 46, 14, 30, '#6b4423'); kotak(40, 48, 10, 6, '#8a5a2b'); kotak(40, 56, 10, 6, '#8a5a2b'); kotak(40, 64, 10, 6, '#8a5a2b');
    kotak(44, 50, 2, 1, '#c9a227'); kotak(44, 58, 2, 1, '#c9a227'); kotak(44, 66, 2, 1, '#c9a227');
    // meja tulis Mbak Serat
    kotak(42, 108, 20, 9, '#8a5a2b'); kotak(42, 117, 20, 2, '#6b4423'); kotak(46, 109, 7, 5, '#f4efe6'); kotak(55, 110, 4, 1, '#2b1d16');
    // pojok foto Mas Wara
    kotak(198, 44, 14, 24, '#efe3cf'); kotak(198, 44, 14, 2, '#c0577b'); kotak(200, 50, 10, 1, '#d8c7a8');
    SP.gambar(ctx, SP.PROP.kamera.rows, SP.PROP.kamera.pal, 198, 70);
    // papan tulis Pak Pamong (grafik corong dari angka nyata)
    kotak(198, 96, 14, 30, '#5a3a20'); kotak(199, 97, 12, 28, '#f7f7f2');
    var t = feed ? feed.today : {};
    var nilai = [t.riset, t.draft, t.lolos_qa, t.terkirim, t.dibalas].map(function (v) { return v === undefined ? 0 : v; });
    var maks = Math.max.apply(null, nilai.concat([1]));
    var warna = ['#2e75b6', '#3d8bcf', '#38a169', '#d69e2e', '#c0577b'];
    nilai.forEach(function (v, i) { var w = Math.round(v / maks * 10); if (w > 0) kotak(200, 99 + i * 5, w, 3, warna[i]); });
    // kursi Juragan + lentera
    kotak(118, 132, 20, 4, '#3b2f2f'); kotak(118, 126, 3, 10, '#3b2f2f'); kotak(135, 126, 3, 10, '#3b2f2f'); kotak(121, 128, 14, 5, '#a53a2b');
    var menunggu = feed && feed.today.menunggu_kirim ? feed.today.menunggu_kirim : 0;
    var lampu = menunggu > 0 ? SP.PROP.lentera : SP.PROP.lenteraMati;
    SP.gambar(ctx, lampu.rows, lampu.pal, 142, 126);
    // bengkel Mas Undagi
    kotak(216, 82, 40, 50, '#bfa074'); kotak(216, 82, 40, 2, '#8a6238'); kotak(216, 82, 2, 50, '#8a6238');
    kotak(220, 118, 26, 8, '#8a5a2b'); kotak(220, 126, 2, 4, '#6b4423'); kotak(244, 126, 2, 4, '#6b4423');
    kotak(224, 116, 8, 2, '#9aa3ab'); kotak(236, 115, 2, 3, '#c9a227');
    kotak(238, 86, 14, 11, '#22303c'); kotak(240, 88, 8, 1, '#5fd08a'); kotak(240, 90, 5, 1, '#9fc4e8'); kotak(240, 92, 9, 1, '#5fd08a'); kotak(244, 97, 2, 3, '#22303c');
    // regol (gerbang)
    kotak(10, 160, 6, 26, '#93492f'); kotak(34, 160, 6, 26, '#93492f'); kotak(6, 154, 38, 6, '#6d3320'); kotak(12, 150, 26, 4, '#80402a');
    kotak(11, 162, 2, 22, '#a85a3a'); kotak(35, 162, 2, 22, '#a85a3a');
    // angkringan
    kotak(104, 200, 136, 4, '#8a5a2b'); kotak(108, 204, 3, 4, '#6b4423'); kotak(232, 204, 3, 4, '#6b4423');
    kotak(190, 168, 54, 12, '#8a5a2b'); kotak(190, 180, 54, 2, '#6b4423');
    for (var sx = 186; sx < 248; sx += 8) kotak(sx, 160, 4, 6, '#f4efe6');
    for (var rx = 190; rx < 248; rx += 8) kotak(rx, 160, 4, 6, '#b5532a');
    kotak(186, 158, 62, 2, '#6d3320'); kotak(188, 160, 2, 20, '#5a3a20'); kotak(244, 160, 2, 20, '#5a3a20');
    SP.gambar(ctx, SP.PROP.teko.rows, SP.PROP.teko.pal, 196, 162);
    SP.gambar(ctx, SP.PROP.teko.rows, SP.PROP.teko.pal, 212, 162);
    kotak(228, 164, 3, 4, '#f4efe6'); kotak(233, 164, 3, 4, '#f4efe6');
    return gelap;
  }

  function cahaya(x, y, r) {
    ctx.fillStyle = 'rgba(255,214,107,.10)'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,214,107,.14)'; ctx.fillRect(x - r * 0.65, y - r * 0.65, r * 1.3, r * 1.3);
    ctx.fillStyle = 'rgba(255,224,150,.20)'; ctx.fillRect(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6);
  }

  function gambarPelaku(p) {
    var k = SP.KARAKTER[p.id];
    var jalan = p.jalur.length > 0;
    var fr = jalan ? k.frames[p.frame] : k.frames[0];
    var angkat = (!tenang && !jalan && p.state === 'working') ? (Math.floor(p.t * 2) % 2) : 0;
    var x = Math.round(p.x), y = Math.round(p.y) - angkat;
    kotak(x + 3, Math.round(p.y) + 15, 10, 2, 'rgba(0,0,0,.18)');
    SP.gambar(ctx, fr, k.pal, x, y, p.balik);
    if (p.bawa) SP.gambar(ctx, SP.PROP.gulungan.rows, SP.PROP.gulungan.pal, x + (p.balik ? -3 : 13), y + 8);
    if (!jalan && p.state === 'done') SP.gambar(ctx, SP.PROP.centang.rows, SP.PROP.centang.pal, x + 11, y - 4);
    if (!jalan && p.state === 'blocked') SP.gambar(ctx, SP.PROP.seru.rows, SP.PROP.seru.pal, x + 13, y - 5);
  }

  function render() {
    var jam = jamTampil();
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    gambarLatar();
    gambarPendopo();
    gambarSaka(74, 56); gambarSaka(166, 56);
    var gelap = gambarPerabot(jam);
    // Juragan duduk menunggu pesan untuk dikirim
    SP.gambar(ctx, SP.KARAKTER.juragan.frames[0], SP.KARAKTER.juragan.pal, 120, 118);
    var urut = AGENTS.map(function (id) { return pelaku[id]; }).sort(function (a, b) { return a.y - b.y; });
    urut.forEach(function (p) { if (p.x > -18) gambarPelaku(p); });
    gambarSaka(74, 116); gambarSaka(166, 116);
    if (gelap) {
      kotak(0, 0, W, H, 'rgba(10,16,44,.52)');
      [[78, 60], [170, 60], [78, 120], [170, 120]].forEach(function (q) { cahaya(q[0], q[1], 26); });
      cahaya(217, 172, 34); cahaya(25, 164, 20); cahaya(244, 92, 16);
      var menunggu = feed && feed.today.menunggu_kirim ? feed.today.menunggu_kirim : 0;
      if (menunggu > 0) cahaya(145, 130, 22);
    }
    letakkanLabel();
  }

  /* ---- Label di atas canvas (teks HTML agar tajam & terbaca) -------------- */
  var label = {};
  function buatLabel(kunci, kelas) {
    var el = document.createElement('span');
    el.className = 'pendopo-label ' + (kelas || '');
    el.hidden = true;
    elLapis.appendChild(el); label[kunci] = el; return el;
  }
  function letakkan(el, x, y, teks) {
    el.textContent = teks;
    el.style.left = (x / W * 100) + '%'; el.style.top = (y / H * 100) + '%';
    el.hidden = false;
  }
  function letakkanLabel() {
    if (!elLapis) return;
    AGENTS.forEach(function (id) {
      var p = pelaku[id], el = label[id] || buatLabel(id, 'pendopo-balon');
      var tampil = p.x > 0 && p.jalur.length === 0 && (p.state === 'working' || p.state === 'blocked') && TASK_LABEL[p.task];
      if (tampil) letakkan(el, p.x + 8, p.y - 3, (p.state === 'blocked' ? 'terhambat: ' : '') + TASK_LABEL[p.task]);
      else el.hidden = true;
    });
    var j = label.juragan || buatLabel('juragan', 'pendopo-tanda');
    var menunggu = feed && feed.today.menunggu_kirim !== undefined ? feed.today.menunggu_kirim : null;
    if (menunggu !== null) letakkan(j, 128, 150, menunggu + ' pesan menunggu dikirim'); else j.hidden = true;
  }

  /* ---- Gerak ------------------------------------------------------------- */
  function gerak(dt) {
    AGENTS.forEach(function (id) {
      var p = pelaku[id];
      p.t += dt;
      if (p.state === 'working' && p.task === 'ronda' && !p.jalur.length) {
        p.rondaKe = (p.rondaKe + 1) % RONDA.length;
        p.jalur = [{ x: RONDA[p.rondaKe].x, y: RONDA[p.rondaKe].y }];
      }
      if (!p.jalur.length) return;
      var q = p.jalur[0], dx = q.x - p.x, dy = q.y - p.y, jarak = Math.sqrt(dx * dx + dy * dy), langkah = KECEPATAN * dt;
      if (jarak <= langkah) { p.x = q.x; p.y = q.y; p.jalur.shift(); }
      else { p.x += dx / jarak * langkah; p.y += dy / jarak * langkah; if (Math.abs(dx) > 0.5) p.balik = dx < 0; }
      p.frame = Math.floor(p.t * 6) % 2;
    });
  }

  var terakhir = 0;
  function putaran(ts) {
    if (tenang) return;
    var nyata = (ts - terakhir) / 1000; terakhir = ts;
    if (!document.hidden) {
      if (mode === 'replay') {
        // pewaktu memakai jam sungguhan, jadi tetap tepat walau browser memperlambat animasi
        replay.timer += Math.min(nyata, replay.langkah);
        if (replay.timer >= replay.langkah) {
          replay.timer = 0;
          if (replay.i >= feed.timeline.length) selesaiReplay(); else majuReplay();
        }
      }
      // gerak dipecah jadi langkah kecil supaya tidak melompat saat frame jarang
      var sisa = Math.min(nyata, 2);
      while (sisa > 0) { var potong = Math.min(sisa, 0.05); gerak(potong); sisa -= potong; }
      render();
    }
    window.requestAnimationFrame(putaran);
  }

  /* ---- Ambil data -------------------------------------------------------- */
  function ambil(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('status ' + r.status);
      return r.json();
    }).then(function (raw) {
      var b = bersihkan(raw);
      if (!b || !b.updated) throw new Error('feed tidak valid');
      return b;
    });
  }
  var pertama = true;
  function muat() {
    return ambil(FEED_URL).then(function (b) { feed = b; demo = false; })
      .catch(function () { return ambil(DEMO_URL).then(function (b) { feed = b; demo = true; }); })
      .catch(function () { feed = null; demo = false; })
      .then(function () {
        perbaruiPanel();
        if (mode === 'live') { terapkanLive(pertama); tulisStatusLive(); }
        if (pertama && sepi && !tenang && feed && feed.timeline.length) mulaiReplay();
        pertama = false;
        render();
      });
  }

  if (elTombol) {
    elTombol.addEventListener('click', function () {
      if (mode === 'replay') { clearTimeout(timerTenang); selesaiReplay(); }
      else mulaiReplay();
      render();
    });
  }
  if (mq.addEventListener) mq.addEventListener('change', function (e) { tenang = e.matches; if (!tenang) window.requestAnimationFrame(putaran); });

  perbaruiDaftar();
  render();
  muat();
  window.setInterval(muat, MUAT_ULANG_MS);
  if (tenang) window.setInterval(function () { if (mode === 'live') render(); }, 60000);
  else window.requestAnimationFrame(function (ts) { terakhir = ts; putaran(ts); });
})();
