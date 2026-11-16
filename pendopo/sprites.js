/* ==========================================================================
   Pendopo Ndalem — sprite pixel (desain orisinal, tanpa aset pihak ketiga)
   Setiap sprite = deretan baris teks; satu huruf = satu pixel.
   '.' = transparan. Huruf lain dipetakan ke warna lewat palet.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Karakter 16x16. Huruf:
     k garis/mata · s kulit · h rambut · b blangkon · c baju · d aksen baju
     j jarik · e motif jarik · w putih · f alas kaki */
  var PRIA_A = [
    '................',
    '.....bbbbbb.....',
    '....bbbbbbbb....',
    '....bssssssbb...',
    '....sskssksb....',
    '....ssssssss....',
    '.....ssssss.....',
    '....cccddccc....',
    '...ccdcddcdcc...',
    '...scdcddcdcs...',
    '...scdcddcdcs...',
    '....jjjjjjjj....',
    '....jejjejje....',
    '....jjjjjjjj....',
    '.....jj..jj.....',
    '.....ff..ff.....'
  ];
  var PRIA_B = PRIA_A.slice(0, 13).concat([
    '....jjjjjjjj....',
    '....jj....jj....',
    '...ff......ff...'
  ]);

  var WANITA_A = [
    '................',
    '.....hhhhhh.....',
    '....hhhhhhhhhh..',
    '....hsssssshhh..',
    '....sskssksh....',
    '....ssssssss....',
    '.....ssssss.....',
    '....cccwwccc....',
    '...cccwccwccc...',
    '...sccccccccs...',
    '...sccccccccs...',
    '....jjjjjjjj....',
    '....jejjejje....',
    '....jjjjjjjj....',
    '....jjjjjjjj....',
    '.....ff..ff.....'
  ];
  var WANITA_B = WANITA_A.slice(0, 14).concat([
    '....jjjjjjjj....',
    '....ff....ff....'
  ]);

  /* Pak Pamong: lebih sepuh, berkumis putih */
  var SEPUH_A = PRIA_A.slice();
  SEPUH_A[5] = '....sswwwwss....';
  var SEPUH_B = PRIA_B.slice();
  SEPUH_B[5] = '....sswwwwss....';

  var DASAR = { k: '#2b1d16', s: '#e0a878', h: '#1c1410', w: '#f4efe6', f: '#3a2a1c', e: '#c9a227' };

  function palet(extra) {
    var p = {};
    Object.keys(DASAR).forEach(function (k) { p[k] = DASAR[k]; });
    Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  var KARAKTER = {
    'ki-lurah':   { frames: [PRIA_A, PRIA_B],     pal: palet({ b: '#4a2f1b', c: '#3b2f2f', d: '#c9a227', j: '#6b4423' }) },
    'mas-telik':  { frames: [PRIA_A, PRIA_B],     pal: palet({ b: '#3d2a1c', c: '#2f6b4f', d: '#1d4634', j: '#5a3a20' }) },
    'mbak-serat': { frames: [WANITA_A, WANITA_B], pal: palet({ c: '#c0577b', j: '#5a3a20' }) },
    'mas-wara':   { frames: [PRIA_A, PRIA_B],     pal: palet({ b: '#2e2a26', c: '#b5532a', d: '#7a3217', j: '#4f3a2a' }) },
    'mbak-niti':  { frames: [WANITA_A, WANITA_B], pal: palet({ c: '#5b8c5a', j: '#6b4423' }) },
    'pak-pamong': { frames: [SEPUH_A, SEPUH_B],   pal: palet({ b: '#3a3a3a', c: '#6f6f6f', d: '#454545', j: '#4a3a2c' }) },
    'mas-undagi': { frames: [PRIA_A, PRIA_B],     pal: palet({ b: '#2c3a4d', c: '#3d5a80', d: '#293f5c', j: '#5a3a20' }) },
    'juragan':    { frames: [PRIA_A, PRIA_B],     pal: palet({ b: '#6b4423', c: '#e8dcc0', d: '#b9a77c', j: '#3b2f2f' }) }
  };

  /* Perabot kecil */
  var PROP = {
    gulungan: {
      rows: ['.wwww.', 'wkwwkw', 'wwwwww', 'wkwwkw', '.wwww.'],
      pal: { w: '#f4efe6', k: '#b08d57' }
    },
    lentera: {
      rows: ['..kk..', '.kkkk.', '.kyyk.', 'kyyyyk', 'kyoyyk', 'kyyyyk', '.kyyk.', '.kkkk.'],
      pal: { k: '#3a2a1c', y: '#ffd66b', o: '#ff9d2e' }
    },
    lenteraMati: {
      rows: ['..kk..', '.kkkk.', '.kggk.', 'kggggk', 'kggggk', 'kggggk', '.kggk.', '.kkkk.'],
      pal: { k: '#3a2a1c', g: '#8a8f94' }
    },
    teko: {
      rows: ['...kk...', '.kkkkkk.', 'kttttttk', 'kttttttkk', 'kttttttk.', '.kkkkkk.'],
      pal: { k: '#3a2a1c', t: '#7fa7a0' }
    },
    centang: {
      rows: ['.....g', '....gg', 'g..gg.', 'gggg..', '.gg...'],
      pal: { g: '#38a169' }
    },
    seru: {
      rows: ['rr', 'rr', 'rr', '..', 'rr'],
      pal: { r: '#d64545' }
    },
    kamera: {
      rows: ['..kkkk..', '.kkllkk.', '.kkllkk.', '..kkkk..', '...kk...', '..k..k..', '.k....k.'],
      pal: { k: '#2b1d16', l: '#9fc4e8' }
    }
  };

  function gambar(ctx, rows, pal, x, y, balik) {
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      for (var c = 0; c < row.length; c++) {
        var ch = row.charAt(c);
        if (ch === '.') continue;
        var col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x + (balik ? row.length - 1 - c : c), y + r, 1, 1);
      }
    }
  }

  global.PendopoSprites = { KARAKTER: KARAKTER, PROP: PROP, gambar: gambar };
})(typeof window !== 'undefined' ? window : globalThis);
