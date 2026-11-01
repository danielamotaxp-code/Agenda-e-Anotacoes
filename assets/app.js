/* Agenda Jurídica — site estático. Dados em data/*.json, atualizados pelo Claude via GitHub. */
(function () {
  'use strict';
  var ORDER = ['CUL', 'TEO', 'HIST', 'CID', 'DHF', 'LAB', 'FIL', 'SOC', 'LIB'];
  var STATUS = { 'confirmada': 'Confirmada', 'prevista': 'Prevista', 'a-confirmar': 'A confirmar', 'a-definir': 'A definir' };
  var SECOES = [
    ['provas', 'Provas'], ['atividades', 'Atividades Avaliativas'], ['trabalhos', 'Trabalhos'],
    ['extensao', 'Trabalhos de Extensão'], ['seminarios', 'Seminários'], ['estudos', 'Estudos Dirigidos'],
    ['globais', 'Avaliações Globais'], ['reavaliacoes', 'Reavaliações']
  ];
  var WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var S = { agenda: null, disc: [], notes: {}, cal: null, calSel: null, tab: {}, fc: {}, q: '' };
  var app = document.getElementById('app');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function LSget(k, d) { try { var v = localStorage.getItem('aj:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function LSset(k, v) { try { localStorage.setItem('aj:' + k, JSON.stringify(v)); } catch (e) { } }
  function pd(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function addD(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dm(s) { var d = pd(s); return d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') : '—'; }
  function dmy(s) { var d = pd(s); return d ? dm(s) + '/' + d.getFullYear() : '—'; }
  function wd(s) { var d = pd(s); return d ? WD[d.getDay()] : ''; }
  function days(s) { var d = pd(s); return d ? Math.round((d - today()) / 864e5) : null; }
  function endOf(e) { return e.fim || e.data; }
  function isPast(e) { return e.data && pd(endOf(e)) < today(); }
  function cvar(sig) { return 'var(--' + sig + ',var(--navy))'; }
  function discInfo(sig) { for (var i = 0; i < S.disc.length; i++) if (S.disc[i].sigla === sig) return S.disc[i]; return { sigla: sig, nome: '', professor: '' }; }
  function sigChip(sig) { return '<span class="sig" style="--c:' + cvar(sig) + '">' + esc(sig) + '</span>'; }
  function byDate(a, b) { var x = a.data || '9999', y = b.data || '9999'; return x < y ? -1 : x > y ? 1 : ORDER.indexOf(a.disc) - ORDER.indexOf(b.disc); }
  function evs() { return (S.agenda && S.agenda.eventos) || []; }
  function stPill(e) {
    var d = days(e.data);
    if (e.status === 'confirmada' && d !== null && d >= 0 && d <= 3) return '<span class="pill st-soon">' + (d === 0 ? 'hoje' : d === 1 ? 'amanhã' : 'em ' + d + ' dias') + '</span>';
    return '<span class="pill st-' + esc(e.status) + '">' + esc(STATUS[e.status] || e.status) + '</span>';
  }
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  /* Markdown próprio (sem dependências): títulos, listas, citações, tabelas, **negrito**, *itálico*, ==marca-texto==, links. */
  function inl(s) {
    return esc(s)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function md(src) {
    var L = String(src || '').replace(/\r/g, '').split('\n'), out = [], i = 0;
    function cells(l) { return l.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
    while (i < L.length) {
      var l = L[i];
      if (!l.trim()) { i++; continue; }
      var h = l.match(/^(#{1,6})\s+(.*)$/);
      if (h) { var lv = Math.min(4, Math.max(3, h[1].length)); out.push('<h' + lv + '>' + inl(h[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^\s*\|/.test(l) && L[i + 1] && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
        var head = cells(l), body = []; i += 2;
        while (i < L.length && /^\s*\|/.test(L[i])) { body.push(cells(L[i])); i++; }
        out.push('<div class="tbl"><table><thead><tr>' + head.map(function (c) { return '<th>' + inl(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inl(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
        continue;
      }
      if (/^>\s?/.test(l)) { var q = []; while (i < L.length && /^>\s?/.test(L[i])) { q.push(L[i].replace(/^>\s?/, '')); i++; } out.push('<blockquote><p>' + inl(q.join(' ')) + '</p></blockquote>'); continue; }
      var lm = l.match(/^(\s*)([-*]|\d+\.)\s+/);
      if (lm) {
        var ord = /\d/.test(lm[2]), items = [];
        while (i < L.length) {
          var m = L[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
          if (m && m[1].length < 2) { items.push(m[3]); i++; }
          else if (m && items.length) { items[items.length - 1] += '\n' + L[i].trim(); i++; }
          else if (L[i].trim() && /^\s{2,}/.test(L[i]) && items.length) { items[items.length - 1] += ' ' + L[i].trim(); i++; }
          else break;
        }
        out.push((ord ? '<ol>' : '<ul>') + items.map(function (it) {
          var parts = it.split('\n'), first = inl(parts.shift());
          var sub = parts.length ? '<ul>' + parts.map(function (p) { return '<li>' + inl(p.replace(/^([-*]|\d+\.)\s+/, '')) + '</li>'; }).join('') + '</ul>' : '';
          return '<li>' + first + sub + '</li>';
        }).join('') + (ord ? '</ol>' : '</ul>'));
        continue;
      }
      var p = [];
      while (i < L.length && L[i].trim() && !/^(#{1,6}\s|>|\s*([-*]|\d+\.)\s|\s*\|)/.test(L[i])) { p.push(L[i].trim()); i++; }
      if (!p.length) { p.push(L[i].trim()); i++; }
      out.push('<p>' + inl(p.join(' ')) + '</p>');
    }
    return out.join('');
  }
  function rowHTML(e, opts) {
    opts = opts || {};
    var date = e.data ? (e.fim ? dm(e.data) + '–' + dm(e.fim) : dm(e.data)) : '—';
    var sub = e.data ? (e.fim ? 'período' : wd(e.data)) : 'sem data';
    var extra = [];
    if (e.detalhes) extra.push(esc(e.detalhes));
    if (e.grupo) extra.push(esc(e.grupo));
    return '<div class="row' + (isPast(e) ? ' dim' : '') + '"><div class="d">' + date + '<small>' + sub + '</small></div>' +
      (opts.noSig ? '<span></span>' : sigChip(e.disc)) +
      '<div class="t"><b>' + esc(e.titulo) + '</b>' + (extra.length ? '<p>' + extra.join(' · ') + '</p>' : '') + '</div>' +
      '<div class="meta">' + stPill(e) + (e.pontos ? '<span class="pts">' + esc(e.pontos) + '</span>' : '') + '</div></div>';
  }
  function rows(list, opts) { return list.length ? '<div class="card rows">' + list.map(function (e) { return rowHTML(e, opts); }).join('') + '</div>' : '<div class="card empty">Nada por aqui.</div>'; }

  /* ---------- dados ---------- */
  function getJSON(path) {
    var v = Math.floor(Date.now() / 60000);
    return fetch(path + '?v=' + v, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function loadNotes(sig) {
    if (!S.notes[sig]) S.notes[sig] = { anotacoes: [], questoes: [] };
    return Promise.resolve(S.notes[sig]);
  }

  /* ---------- acesso da turma (conteúdo criptografado) ---------- */
  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function toB64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function derive(user, pass, pkg) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(user.trim().toLowerCase() + ':' + pass), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(pkg.salt), iterations: pkg.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']); });
  }
  function open(key, pkg) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(pkg.iv) }, key, b64(pkg.data))
      .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function usar(bundle) {
    S.agenda = bundle.agenda; S.disc = (bundle.disciplinas && bundle.disciplinas.disciplinas) || [];
    S.notes = bundle.anotacoes || {};
    S.mat = bundle.materiais || null;
    S.res = bundle.resumos || null;
    document.body.classList.remove('locked');
    var fu = document.getElementById('foot-upd');
    if (fu) fu.innerHTML = 'Agenda atualizada em ' + dmy(S.agenda.atualizadoEm) + '. <button class="linkbtn" data-act="sair">Sair deste aparelho</button>';
    render();
  }
  function loginView(msg) {
    document.body.classList.add('locked');
    app.innerHTML = '<div class="page login"><form class="card loginbox" id="login" autocomplete="on">' +
      '<span class="eyebrow">Acesso da turma</span><h1>Direito</h1><p class="lead">Agenda, anotações e materiais exclusivos da turma. Entre com o acesso divulgado no grupo.</p>' +
      (msg ? '<p class="err" role="alert">' + esc(msg) + '</p>' : '') +
      '<label>Usuário<input class="input" id="lg-user" name="username" autocomplete="username" required value="Direito"></label>' +
      '<label>Senha<input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" required></label>' +
      '<label class="chk"><input type="checkbox" id="lg-rem" checked> Lembrar neste aparelho</label>' +
      '<button class="btn primary" type="submit" id="lg-btn">Entrar</button></form></div>';
    var p = document.getElementById('lg-pass'); if (p) p.focus();
  }
  var PKG = null;
  function iniciar() {
    getJSON('data/conteudo.json').then(function (pkg) {
      PKG = pkg;
      var saved = LSget('key', null);
      if (!saved) return loginView();
      crypto.subtle.importKey('raw', b64(saved), { name: 'AES-GCM' }, true, ['decrypt'])
        .then(function (k) { return open(k, pkg); })
        .then(usar, function () { try { localStorage.removeItem('aj:key'); } catch (e) { } loginView('O acesso mudou. Entre de novo com a senha atual.'); });
    }).catch(function () {
      app.innerHTML = '<div class="page"><div class="card empty">Não foi possível carregar a agenda agora. Recarregue a página em instantes.</div></div>';
    });
  }
  document.addEventListener('submit', function (ev) {
    if (ev.target.id !== 'login') return;
    ev.preventDefault();
    var u = document.getElementById('lg-user').value, pw = document.getElementById('lg-pass').value, rem = document.getElementById('lg-rem').checked;
    var btn = document.getElementById('lg-btn'); btn.disabled = true; btn.textContent = 'Entrando…';
    var key;
    derive(u, pw, PKG).then(function (k) { key = k; return open(k, PKG); }).then(function (bundle) {
      if (rem) crypto.subtle.exportKey('raw', key).then(function (raw) { LSset('key', toB64(raw)); });
      usar(bundle);
    }, function () { loginView('Usuário ou senha incorretos.'); });
  });

  /* ---------- visão geral ---------- */
  function vHome() {
    var t = today(), wEnd = addD(t, 6), E = evs();
    var future = E.filter(function (e) { return e.data && !isPast(e); }).sort(byDate);
    var week = future.filter(function (e) { return pd(e.data) <= wEnd; });
    var provas = future.filter(function (e) { return e.secao === 'provas'; });
    var globais = E.filter(function (e) { return e.secao === 'globais'; });
    var tbd = E.filter(function (e) { return !e.data; });
    var h = '<div class="page"><div class="head"><span class="eyebrow">Agenda · Visão geral</span><h1>Agenda da turma</h1><hr class="rule"><p class="lead">Hoje é ' + WD[t.getDay()] + ', ' + dmy(iso(t)) + '. Prazos, provas e avaliações de todas as disciplinas.</p></div>';
    h += '<div class="stats">' + [[provas.length, 'provas datadas a fazer'], [globais.length, 'avaliações globais'], [week.length, 'itens nos próximos 7 dias'], [tbd.length, 'itens a definir']].map(function (s) { return '<div class="card stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('') + '</div>';
    h += '<section><h2>Próximos 7 dias</h2>' + rows(week) + '</section>';
    h += '<section><div class="bar" style="justify-content:space-between"><h2>Próximos prazos</h2><button class="btn" data-act="ics"><svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/></svg>Exportar calendário (.ics)</button></div>' + rows(future.slice(0, 12)) + '</section></div>';
    return h;
  }

  /* ---------- início: os três espaços ---------- */
  function countMat(sig) {
    var M = S.mat && S.mat.disciplinas && S.mat.disciplinas[sig];
    return M ? M.modulos.reduce(function (a, m) { return a + m.itens.filter(function (i) { return i.tipo !== 'H'; }).length; }, 0) : 0;
  }
  function vInicio() {
    var t = today(), next = evs().filter(function (e) { return e.data && !isPast(e); }).sort(byDate).slice(0, 3);
    var nNotas = 0, nPerg = 0, nMat = 0;
    ORDER.forEach(function (s) { var d = discInfo(s); nNotas += d.notas || 0; nPerg += d.perguntas || 0; nMat += countMat(s); });
    var h = '<div class="page"><div class="head"><span class="eyebrow">Turma de Direito · PUC Minas · 2026/2</span><h1>Direito</h1><hr class="rule"><p class="lead">Hoje é ' + WD[t.getDay()] + ', ' + dmy(iso(t)) + '. Escolha um dos espaços.</p></div><div class="spaces">';
    h += '<a class="card space sp-agenda" href="#/agenda"><span class="eyebrow">Espaço 1</span><h2>Agenda</h2><p>Calendário, provas, trabalhos, avaliações globais e avisos para o WhatsApp.</p><ul>' +
      (next.length ? next.map(function (e) { return '<li><b>' + dm(e.data) + '</b> ' + esc(e.disc) + ' · ' + esc(e.titulo) + '</li>'; }).join('') : '<li>Nenhum prazo próximo.</li>') + '</ul><span class="go">Abrir a agenda →</span></a>';
    h += '<a class="card space sp-notes" href="#/anotacoes"><span class="eyebrow">Espaço 2</span><h2>Anotações</h2><p>Resumos das aulas por disciplina e perguntas de revisão para as provas.</p><ul><li><b>' + nNotas + '</b> anotações</li><li><b>' + nPerg + '</b> perguntas de revisão</li></ul><span class="go">Abrir o caderno →</span></a>';
    var R = resList().slice().sort(resSort).filter(function (r) { var d = resDate(r); return d && pd(d) >= today(); }).slice(0, 3);
    h += '<a class="card space sp-res" href="#/resumos"><span class="eyebrow">Espaço 3</span><h2>Resumos para provas</h2><p>Um resumo por avaliação e os resumos do ano para as globais.</p><ul>' +
      (R.length ? R.map(function (r) { return '<li><b>' + dm(resDate(r)) + '</b> ' + esc(r.disc) + ' · ' + esc(r.titulo) + '</li>'; }).join('') : '<li>' + resList().length + ' resumos</li>') + '</ul><span class="go">Abrir os resumos →</span></a>';
    h += '<a class="card space sp-mat" href="#/materiais"><span class="eyebrow">Espaço 4</span><h2>Materiais do Canvas</h2><p>Textos, slides, videoaulas e tarefas de cada disciplina, com link direto para o Canvas.</p><ul><li><b>' + nMat + '</b> itens em ' + ORDER.length + ' disciplinas</li>' + (S.mat ? '<li>Atualizado em ' + dmy(S.mat.atualizadoEm) + '</li>' : '') + '</ul><span class="go">Abrir os materiais →</span></a>';
    h += '<a class="card space sp-pdf" href="#/pdf"><span class="eyebrow">Espaço 5</span><h2>Baixar em PDF</h2><p>Anotações, questões e resumos de cada disciplina em PDF, atualizados até a última data publicada.</p><ul><li><b>' + nPerg + '</b> questões · <b>' + resList().length + '</b> resumos</li></ul><span class="go">Gerar PDF →</span></a>';
    return h + '</div></div>';
  }
  function agendaNav(sub) {
    return '<nav class="subnav" aria-label="Agenda">' + [['', 'Visão geral'], ['calendario', 'Calendário'], ['atividades', 'Atividades'], ['disciplinas', 'Por disciplina'], ['avisos', 'Avisos']].map(function (x) {
      return '<a href="#/agenda' + (x[0] ? '/' + x[0] : '') + '"' + ((sub || '') === x[0] ? ' aria-current="page"' : '') + '>' + x[1] + '</a>';
    }).join('') + '</nav>';
  }

  /* ---------- materiais do Canvas ---------- */
  function vMatHome() {
    var h = '<div class="page"><div class="head"><span class="eyebrow">Materiais do Canvas</span><h1>Materiais por disciplina</h1><hr class="rule"><p class="lead">Tudo o que os professores publicaram no Canvas, organizado pelos módulos de cada disciplina. Os links abrem no Canvas com o seu login da PUC.</p></div><div class="grid">';
    ORDER.forEach(function (s) {
      var d = discInfo(s), M = S.mat && S.mat.disciplinas && S.mat.disciplinas[s], n = countMat(s);
      h += '<a class="card dcard" style="--c:' + cvar(s) + ';text-decoration:none;color:inherit" href="#/materiais/' + s.toLowerCase() + '">' + sigChip(s) + '<div class="nm">' + esc(d.nome || s) + '</div>' +
        (d.professor ? '<div class="meta">' + esc(d.professor) + '</div>' : '') +
        '<div class="next">' + (n ? '<b>' + n + '</b> itens em ' + M.modulos.filter(function (m) { return m.itens.length; }).length + ' módulos' : 'Nenhum material publicado') + '</div></a>';
    });
    return h + '</div>' + (S.mat ? '<p class="muted" style="font-size:13px">Lista copiada do Canvas em ' + dmy(S.mat.atualizadoEm) + '. Itens novos aparecem aqui quando a lista é atualizada.</p>' : '') + '</div>';
  }
  function vMatDisc(sig) {
    var d = discInfo(sig), M = S.mat && S.mat.disciplinas && S.mat.disciplinas[sig];
    return '<div class="page" style="--c:' + cvar(sig) + '"><div class="head dhead"><span class="eyebrow"><a href="#/materiais">Materiais do Canvas</a> · ' + esc(sig) + (d.professor ? ' · ' + esc(d.professor) : '') + '</span><h1>' + esc(d.nome || sig) + '</h1></div>' + matHTML(M) +
      '<p class="muted" style="font-size:14px">Mesma disciplina em outros espaços: <a href="#/anotacoes/' + sig.toLowerCase() + '">Anotações</a> · <a href="#/agenda/disciplinas#' + sig + '">Datas na agenda</a></p></div>';
  }

  /* ---------- calendário ---------- */
  function vCal() {
    if (!S.cal) { var t = today(); S.cal = { y: t.getFullYear(), m: t.getMonth() }; }
    var y = S.cal.y, m = S.cal.m, first = new Date(y, m, 1), start = addD(first, -first.getDay());
    var E = evs().filter(function (e) { return e.data; });
    var h = '<div class="page"><div class="head"><span class="eyebrow">Calendário</span></div>';
    h += '<div class="cal-head"><h2>' + MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1) + ' de ' + y + '</h2><div class="bar"><button class="btn" data-cal="-1" aria-label="Mês anterior">‹</button><button class="btn" data-cal="0">Hoje</button><button class="btn" data-cal="1" aria-label="Próximo mês">›</button></div></div>';
    h += '<div class="card" style="overflow:hidden"><div class="cal">' + WD.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('');
    var tISO = iso(today());
    for (var w = 0; w < 6; w++) {
      var ws = addD(start, w * 7); if (w > 3 && ws.getMonth() !== m) break;
      var we = addD(ws, 6), wsI = iso(ws), weI = iso(we);
      var multi = E.filter(function (e) { return e.fim && e.data <= weI && e.fim >= wsI; });
      for (var d = 0; d < 7; d++) {
        var day = addD(ws, d), dI = iso(day);
        var cls = 'day' + (day.getMonth() !== m ? ' out' : '') + (dI === tISO ? ' today' : '') + (S.calSel === dI ? ' sel' : '');
        var inner = '<span class="n">' + day.getDate() + '</span>';
        multi.forEach(function (e) {
          if (dI < e.data || dI > e.fim) { inner += '<div class="band ghost" style="--c:transparent;background:transparent">.</div>'; return; }
          var st = dI === e.data, en = dI === e.fim, showT = st || d === 0;
          inner += '<div class="band' + (st ? ' start' : '') + (en ? ' end' : '') + '" style="--c:' + cvar(e.disc) + (e.status !== 'confirmada' ? ';opacity:.6' : '') + '" title="' + esc(e.disc + ' · ' + e.titulo) + '">' + (showT ? esc(e.disc + ' · ' + e.titulo) : '&nbsp;') + '</div>';
        });
        E.filter(function (e) { return !e.fim && e.data === dI; }).forEach(function (e) {
          inner += '<div class="ev' + (e.status !== 'confirmada' ? ' soft' : '') + '" style="--c:' + cvar(e.disc) + '" title="' + esc(e.disc + ' · ' + e.titulo) + '"><i></i><span>' + esc(e.disc) + ' · ' + esc(e.titulo) + '</span></div>';
        });
        h += '<button class="' + cls + '" data-day="' + dI + '" aria-label="' + dmy(dI) + '">' + inner + '</button>';
      }
    }
    h += '</div></div>';
    h += '<div class="legend">' + ORDER.map(function (s) { return '<span><i class="sig" style="--c:' + cvar(s) + ';min-width:0;padding:0;width:10px;height:10px;border-radius:50%"></i>' + s + '</span>'; }).join('') + '<span>○ prevista / a confirmar</span><span>faixa = período de vários dias</span></div>';
    if (S.calSel) {
      var sel = E.filter(function (e) { return S.calSel >= e.data && S.calSel <= endOf(e); }).sort(byDate);
      h += '<section><h2>' + WD[pd(S.calSel).getDay()] + ', ' + dmy(S.calSel) + '</h2>' + rows(sel) + '</section>';
    } else h += '<p class="muted">Clique num dia para ver os detalhes.</p>';
    return h + '</div>';
  }

  /* ---------- atividades ---------- */
  var F = { q: '', disc: '', secao: '', status: '', past: false };
  function vAtiv() {
    var E = evs().filter(function (e) {
      if (F.disc && e.disc !== F.disc) return false;
      if (F.secao && e.secao !== F.secao) return false;
      if (F.status && e.status !== F.status) return false;
      if (!F.past && isPast(e)) return false;
      if (F.q) { var s = (e.titulo + ' ' + (e.detalhes || '') + ' ' + e.disc).toLowerCase(); if (s.indexOf(F.q.toLowerCase()) < 0) return false; }
      return true;
    }).sort(byDate);
    var groups = [
      ['Prazos', E.filter(function (e) { return e.data && e.secao !== 'globais' && e.secao !== 'reavaliacoes'; })],
      ['Avaliações globais', E.filter(function (e) { return e.secao === 'globais'; })],
      ['Reavaliações', E.filter(function (e) { return e.secao === 'reavaliacoes'; })],
      ['A definir', E.filter(function (e) { return !e.data && e.secao !== 'globais' && e.secao !== 'reavaliacoes'; })]
    ];
    var h = '<div class="page"><div class="head"><span class="eyebrow">Atividades</span><h1>Todas as atividades</h1></div>';
    h += '<div class="bar"><input class="input" id="f-q" type="search" placeholder="Buscar atividade" value="' + esc(F.q) + '">' +
      sel('f-disc', F.disc, [['', 'Todas as disciplinas']].concat(ORDER.map(function (s) { return [s, s]; }))) +
      sel('f-secao', F.secao, [['', 'Todos os tipos']].concat(SECOES)) +
      sel('f-status', F.status, [['', 'Toda situação']].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k]]; }))) +
      '<label class="chip"><input type="checkbox" id="f-past" ' + (F.past ? 'checked' : '') + '> Incluir passadas</label></div>';
    groups.forEach(function (g) { if (g[1].length) h += '<section><h2>' + g[0] + ' <span class="muted" style="font-size:16px">(' + g[1].length + ')</span></h2>' + rows(g[1]) + '</section>'; });
    if (!E.length) h += '<div class="card empty">Nenhuma atividade com esses filtros.</div>';
    return h + '</div>';
  }
  function sel(id, val, opts) { return '<select class="select" id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }

  /* ---------- disciplinas ---------- */
  function nextOf(sig) { return evs().filter(function (e) { return e.disc === sig && e.data && !isPast(e); }).sort(byDate)[0]; }
  function vDisc() {
    var h = '<div class="page"><div class="head"><span class="eyebrow">Agenda · Por disciplina</span><h1>Datas por disciplina</h1></div><div class="bar chips">' +
      ORDER.map(function (s) { return '<a class="chip" href="#/agenda/disciplinas#' + s + '" data-jump="' + s + '">' + s + '</a>'; }).join('') + '</div>';
    ORDER.forEach(function (s) {
      var d = discInfo(s), list = evs().filter(function (e) { return e.disc === s; }).sort(byDate);
      var pts = list.reduce(function (a, e) { var n = parseFloat(e.pontos); return a + (isNaN(n) || e.vinculo ? 0 : n); }, 0);
      h += '<section id="d-' + s + '" style="--c:' + cvar(s) + '"><div class="dhead"><span class="eyebrow">' + esc(s) + (d.professor ? ' · ' + esc(d.professor) : '') + '</span><h2>' + esc(d.nome || s) + '</h2>' +
        '<p class="muted" style="margin:4px 0 0;font-size:14px">' + (list.length ? list.length + ' atividades · ' + pts + ' pts mapeados' : 'Nenhuma data cadastrada na agenda') + '</p></div>' +
        (list.length ? rows(list, { noSig: true }) : '') + '</section>';
    });
    return h + '</div>';
  }

  /* ---------- anotações ---------- */
  function discCardNotes(s) {
    var d = discInfo(s), nx = nextOf(s);
    return '<a class="card dcard" style="--c:' + cvar(s) + ';text-decoration:none;color:inherit" href="#/anotacoes/' + s.toLowerCase() + '">' + sigChip(s) +
      '<div class="nm">' + esc(d.nome || 'Nome a confirmar') + '</div><div class="meta">' + (d.notas ? d.notas + ' anotações · ' + (d.perguntas || 0) + ' perguntas' : 'Aguardando material') + '</div>' +
      '<div class="next">' + (nx ? 'Próxima: <b>' + dm(nx.data) + '</b> · ' + esc(nx.titulo) : 'Sem próxima data definida') + '</div></a>';
  }
  function vNotesHome() {
    var h = '<div class="page"><div class="head"><span class="eyebrow">Anotações</span><h1>Caderno de estudos</h1><hr class="rule"><p class="lead">Resumos organizados a partir das aulas, com perguntas de revisão para as provas.</p></div>';
    h += '<div class="bar"><input class="input" id="nq" type="search" placeholder="Buscar em todas as anotações (ex.: pretor, glosadores)" value="' + esc(S.q) + '"></div><div id="nres"></div>';
    return h + '<div class="grid">' + ORDER.map(discCardNotes).join('') + '</div></div>';
  }
  function searchNotes(q) {
    var box = document.getElementById('nres'); if (!box) return;
    if (!q.trim()) { box.innerHTML = ''; return; }
    var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
    var t = norm(q.trim());
    Promise.all(ORDER.filter(function (s) { return discInfo(s).notas; }).map(loadNotes)).then(function () {
      var res = [];
      ORDER.forEach(function (s) {
        var N = S.notes[s]; if (!N) return;
        (N.anotacoes || []).forEach(function (n) { var p = (n.titulo + ' ' + n.conteudo_md).replace(/[#*_>|=`]/g, ' '); var i = norm(p).indexOf(t); if (i >= 0) res.push([s, n.titulo, p.substr(Math.max(0, i - 50), 160), '#/anotacoes/' + s.toLowerCase() + '/n/' + n.id]); });
        (N.questoes || []).forEach(function (x) { var p = x.pergunta + ' ' + x.resposta_md.replace(/[#*_>|=`]/g, ' '); if (norm(p).indexOf(t) >= 0) res.push([s, 'Pergunta: ' + x.pergunta, '', '#/anotacoes/' + s.toLowerCase() + '/revisao']); });
      });
      box.innerHTML = '<div class="card rows">' + (res.length ? res.slice(0, 40).map(function (r) { return '<a class="row" style="text-decoration:none;color:inherit;grid-template-columns:auto minmax(0,1fr)" href="' + r[3] + '">' + sigChip(r[0]) + '<div class="t"><b>' + esc(r[1]) + '</b>' + (r[2] ? '<p>…' + esc(r[2]) + '…</p>' : '') + '</div></a>'; }).join('') : '<div class="empty">Nada encontrado.</div>') + '</div>';
    });
  }
  function vNotebook(sig, sub, arg) {
    var d = discInfo(sig), N = S.notes[sig];
    if (!N) { loadNotes(sig).then(render); return '<div class="page"><p class="muted">Carregando anotações…</p></div>'; }
    var notas = (N.anotacoes || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    var qs = (N.questoes || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    var pz = evs().filter(function (e) { return e.disc === sig; }).sort(byDate);
    var tab = sub === 'revisao' ? sub : 'notas';
    var done = LSget('done', {}), nd = notas.filter(function (n) { return done[n.id]; }).length;
    var h = '<div class="page" style="--c:' + cvar(sig) + '"><div class="head dhead"><span class="eyebrow"><a href="#/anotacoes">Anotações</a> · ' + esc(sig) + (d.professor ? ' · ' + esc(d.professor) : '') + '</span><h1>' + esc(d.nome || 'Nome a confirmar') + '</h1>' +
      (d.descricao ? '<p class="lead">' + esc(d.descricao) + '</p>' : '') +
      (notas.length ? '<div class="prog"><span class="track"><i style="width:' + Math.round(nd / notas.length * 100) + '%"></i></span>' + nd + ' de ' + notas.length + ' revisadas</div>' : '') + '</div>';
    h += '<div class="bar"><button class="btn" data-pdf="notas" data-sig="' + sig + '">Anotações em PDF</button><button class="btn" data-pdf="questoes" data-sig="' + sig + '">Questões em PDF</button>' + (resList().some(function (r) { return r.disc === sig; }) ? '<a class="btn" href="#/resumos">Resumos para provas</a>' : '') + '</div>';
    var base = '#/anotacoes/' + sig.toLowerCase();
    h += '<div class="tabs" role="tablist">' + [['notas', 'Anotações', notas.length, base], ['revisao', 'Revisão', qs.length, base + '/revisao']].map(function (t) {
      return '<button role="tab" aria-selected="' + (tab === t[0]) + '" data-go="' + t[3] + '">' + t[1] + '<span class="n">' + t[2] + '</span></button>';
    }).join('') + '</div>';
    if (tab === 'notas') {
      if (!notas.length) h += '<div class="card empty">Ainda sem anotações desta disciplina. Elas aparecem aqui assim que o material do grupo for processado.</div>';
      var units = []; notas.forEach(function (n) { if (units.indexOf(n.unidade || '') < 0) units.push(n.unidade || ''); });
      units.forEach(function (u) {
        h += '<section class="unit">' + (u ? '<h3>' + esc(u) + '</h3>' : '');
        notas.filter(function (n) { return (n.unidade || '') === u; }).forEach(function (n) {
          var open = arg === n.id;
          h += '<details class="note" id="n-' + esc(n.id) + '"' + (open ? ' open' : '') + '><summary><svg class="chev" viewBox="0 0 20 20"><path d="M7 4l6 6-6 6"/></svg><span class="nt">' + esc(n.titulo) + (n.subtitulo ? '<small>' + esc(n.subtitulo) + '</small>' : '') + '</span><label class="done" onclick="event.stopPropagation()"><input type="checkbox" data-done="' + esc(n.id) + '"' + (done[n.id] ? ' checked' : '') + '>revisado</label></summary><div class="prose">' + (open ? md(n.conteudo_md) : '') + '</div></details>';
        });
        h += '</section>';
      });
    } else h += flashHTML(sig, qs);
    if (N.atualizadoEm) h += '<p class="muted" style="font-size:13px">Anotações atualizadas em ' + dmy(N.atualizadoEm.slice(0, 10)) + (N.fonte ? ' · fonte: ' + esc(N.fonte) : '') + '</p>';
    var nx = nextOf(sig);
    h += '<p class="muted" style="font-size:14px">Mesma disciplina em outros espaços: <a href="#/materiais/' + sig.toLowerCase() + '">Materiais do Canvas</a> · <a href="#/agenda/disciplinas#' + sig + '">Datas na agenda</a>' + (nx ? ' (próxima: ' + dm(nx.data) + ', ' + esc(nx.titulo) + ')' : '') + '</p>';
    return h + '</div>';
  }
  var TIPO = { F: 'Arquivo', P: 'Página', L: 'Link', Q: 'Questionário', A: 'Tarefa', D: 'Fórum' };
  function ext(t) { var m = String(t).match(/\.([a-z0-9]{2,4})$/i); return m ? m[1].toUpperCase() : ''; }
  function matHTML(M) {
    if (!M || !M.modulos.length) return '<div class="card empty">Nenhum material encontrado no Canvas desta disciplina.</div>';
    var base = (S.mat && S.mat.base) || 'https://pucminas.instructure.com';
    var h = '<div class="bar" style="justify-content:space-between"><p class="muted" style="margin:0;font-size:14px">Os links abrem no Canvas da PUC, com o seu login. Lista atualizada em ' + dmy(S.mat.atualizadoEm) + '.</p>' +
      '<a class="btn" target="_blank" rel="noopener" href="' + esc(base + '/courses/' + M.curso) + '">Abrir disciplina no Canvas ↗</a></div>';
    M.modulos.forEach(function (m) {
      if (!m.itens.length) return;
      h += '<section class="unit"><h3>' + esc(m.nome) + '</h3><div class="card mats">';
      m.itens.forEach(function (it) {
        if (it.tipo === 'H') { h += '<div class="mat-h">' + esc(it.titulo) + '</div>'; return; }
        var e = it.tipo === 'F' ? ext(it.titulo) : '';
        var title = e ? it.titulo.replace(/\.[a-z0-9]{2,4}$/i, '') : it.titulo;
        h += '<a class="mat" target="_blank" rel="noopener" href="' + esc(base + it.url) + '"><span class="mat-t mat-' + it.tipo + '">' + esc(e || TIPO[it.tipo] || 'Item') + '</span><span class="mat-n">' + esc(title) + '</span><span class="mat-go" aria-hidden="true">↗</span></a>';
      });
      h += '</div></section>';
    });
    return h;
  }
  function fcState(sig, qs) {
    var temas = []; qs.forEach(function (q) { if (temas.indexOf(q.tema || 'Geral') < 0) temas.push(q.tema || 'Geral'); });
    var st = S.fc[sig] || (S.fc[sig] = { tema: temas[0] || '', order: null, i: 0, show: false });
    if (temas.indexOf(st.tema) < 0) st.tema = temas[0] || '';
    var pool = qs.filter(function (q) { return (q.tema || 'Geral') === st.tema; });
    if (!st.order || st.order.length !== pool.length) st.order = pool.map(function (q) { return q.id; });
    if (st.i >= st.order.length) st.i = 0;
    return { st: st, temas: temas, qs: qs };
  }
  function flashHTML(sig, qs) {
    if (!qs.length) return '<div class="card empty">Sem perguntas de revisão ainda.</div>';
    var f = fcState(sig, qs), st = f.st, q = qs.filter(function (x) { return x.id === st.order[st.i]; })[0];
    var sc = LSget('score', {})[sig] || { ok: 0, no: 0 };
    var h = '<div class="bar"><div class="chips">' + f.temas.map(function (t) { return '<button class="chip" data-tema="' + esc(t) + '" aria-pressed="' + (st.tema === t) + '">' + esc(t) + '</button>'; }).join('') + '</div><span style="flex:1"></span><button class="chip" data-fc="shuffle">Embaralhar</button></div>';
    if (!q) return h;
    h += '<div class="card flash"><div class="src"><span>Pergunta ' + (st.i + 1) + ' de ' + st.order.length + '</span><span>' + esc(q.fonte || '') + '</span></div><div class="q">' + esc(q.pergunta) + '</div>';
    if (st.show) h += '<div class="ans"><div class="prose">' + md(q.resposta_md) + '</div>' + (q.ref ? '<p class="muted" style="font-size:13px;margin:6px 0 0">Ver anotação: ' + esc(q.ref) + '</p>' : '') + '</div>';
    h += '<div class="acts">' + (st.show ? '<button class="btn good" data-fc="ok">Acertei</button><button class="btn bad" data-fc="no">Revisar de novo</button>' : '<button class="btn primary" data-fc="show">Mostrar resposta</button>') +
      '<span style="flex:1"></span><button class="btn" data-fc="prev"' + (st.i === 0 ? ' disabled' : '') + '>Anterior</button><button class="btn" data-fc="next">Próxima</button></div></div>';
    return h + '<p class="muted" style="font-size:13px">' + sc.ok + ' acertos · ' + sc.no + ' para revisar (salvo só neste aparelho)</p>';
  }

  /* ---------- resumos para provas ---------- */
  function resList() { return (S.res && S.res.resumos) || []; }
  function resEv(r) { return r.evento ? evs().filter(function (e) { return e.id === r.evento; })[0] : null; }
  function resDate(r) { var e = resEv(r); return (e && e.data) || r.data || null; }
  function resSort(a, b) { var x = resDate(a) || '9999', y = resDate(b) || '9999'; return x < y ? -1 : x > y ? 1 : ORDER.indexOf(a.disc) - ORDER.indexOf(b.disc); }
  function resCard(r) {
    var e = resEv(r), dt = resDate(r), n = days(dt);
    var when = dt ? dm(dt) + ' (' + wd(dt) + ')' + (n !== null && n >= 0 ? ' · ' + (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : 'em ' + n + ' dias') : '') : 'Data a definir';
    return '<a class="card dcard res-card" style="--c:' + cvar(r.disc) + ';text-decoration:none;color:inherit" href="#/resumos/' + esc(r.id) + '">' + sigChip(r.disc) +
      '<div class="nm">' + esc(r.titulo) + '</div><div class="meta">' + esc(discInfo(r.disc).nome) + '</div>' +
      '<div class="next"><b>' + esc(when) + '</b>' + (e && e.pontos ? ' · ' + esc(e.pontos) : '') + (e && e.status && e.status !== 'confirmada' ? ' · ' + esc(STATUS[e.status] || e.status) : '') + '</div>' +
      (r.pronto === false ? '<span class="pill st-a-definir">Em construção</span>' : '') + '</a>';
  }
  function vResHome() {
    var L = resList().slice().sort(resSort);
    var up = L.filter(function (r) { var d = resDate(r); return r.tipo !== 'global' && (!d || pd(d) >= today()); });
    var gl = L.filter(function (r) { return r.tipo === 'global'; });
    var past = L.filter(function (r) { var d = resDate(r); return r.tipo !== 'global' && d && pd(d) < today(); });
    var h = '<div class="page"><div class="head"><span class="eyebrow">Resumos para provas</span><h1>Resumos para provas</h1><hr class="rule"><p class="lead">Um resumo para cada avaliação: o que cai, os conceitos-chave e o que costuma confundir. As globais juntam o semestre inteiro. Tudo é refeito a cada atualização do Canvas e dos grupos.</p></div>';
    h += '<div class="bar"><a class="btn" href="#/pdf">Baixar em PDF</a></div>';
    h += '<section><h2>Próximas provas</h2>' + (up.length ? '<div class="grid">' + up.map(resCard).join('') + '</div>' : '<div class="card empty">Nenhuma prova próxima com resumo.</div>') + '</section>';
    h += '<section><h2>Avaliações globais</h2>' + (gl.length ? '<div class="grid">' + gl.map(resCard).join('') + '</div>' : '<div class="card empty">Ainda sem resumos de globais.</div>') + '</section>';
    if (past.length) h += '<section><h2>Provas já feitas</h2><div class="grid">' + past.map(resCard).join('') + '</div></section>';
    return h + (S.res && S.res.atualizadoEm ? '<p class="muted" style="font-size:13px">Resumos atualizados em ' + dmy(S.res.atualizadoEm.slice(0, 10)) + '.</p>' : '') + '</div>';
  }
  function vResumo(id) {
    var r = resList().filter(function (x) { return x.id === id; })[0];
    if (!r) return '<div class="page"><div class="card empty">Resumo não encontrado. <a href="#/resumos">Voltar aos resumos</a></div></div>';
    var e = resEv(r), dt = resDate(r), sig = r.disc;
    var h = '<div class="page" style="--c:' + cvar(sig) + '"><div class="head dhead"><span class="eyebrow"><a href="#/resumos">Resumos para provas</a> · ' + esc(sig) + '</span><h1>' + esc(r.titulo) + '</h1>' +
      '<p class="lead">' + esc(discInfo(sig).nome) + ' · ' + (dt ? dmy(dt) + ' (' + wd(dt) + ')' : 'data a definir') + (e && e.pontos ? ' · ' + esc(e.pontos) : '') + '</p></div>';
    h += '<div class="bar"><button class="btn primary" data-pdf="resumo" data-id="' + esc(r.id) + '">Baixar este resumo em PDF</button><a class="btn" href="#/anotacoes/' + sig.toLowerCase() + '/revisao">Treinar com as perguntas</a><a class="btn" href="#/anotacoes/' + sig.toLowerCase() + '">Anotações completas</a></div>';
    if (r.abrange && r.abrange.length) h += '<div class="card res-scope"><b>O que cai</b><ul>' + r.abrange.map(function (a) { return '<li>' + inl(a) + '</li>'; }).join('') + '</ul></div>';
    h += '<article class="card prose res-body">' + md(r.conteudo_md) + '</article>';
    return h + '<p class="muted" style="font-size:13px">Resumo atualizado em ' + dmy((r.atualizadoEm || (S.res && S.res.atualizadoEm) || '').slice(0, 10)) + (r.fonte ? ' · ' + esc(r.fonte) : '') + '</p></div>';
  }

  /* ---------- PDFs (impressão → Salvar como PDF) ---------- */
  function lastDate(sig) {
    var N = S.notes[sig] || {}, ds = [N.atualizadoEm];
    resList().forEach(function (r) { if (r.disc === sig) ds.push(r.atualizadoEm); });
    ds = ds.filter(Boolean).map(function (s) { return s.slice(0, 10); }).sort();
    return ds[ds.length - 1] || null;
  }
  function pNotas(sig) {
    var N = S.notes[sig] || {}, notas = (N.anotacoes || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    if (!notas.length) return '<p class="p-empty">Ainda sem anotações desta disciplina.</p>';
    var h = '', u = null;
    notas.forEach(function (n) {
      if ((n.unidade || '') !== u) { u = n.unidade || ''; if (u) h += '<h2 class="p-unit">' + esc(u) + '</h2>'; }
      h += '<section class="p-note"><h3>' + esc(n.titulo) + '</h3>' + (n.subtitulo ? '<p class="p-sub">' + esc(n.subtitulo) + '</p>' : '') + '<div class="prose">' + md(n.conteudo_md) + '</div></section>';
    });
    return h;
  }
  function pQuest(sig) {
    var qs = ((S.notes[sig] || {}).questoes || []).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    if (!qs.length) return '<p class="p-empty">Ainda sem perguntas de revisão desta disciplina.</p>';
    var h = '', t = null, i = 0;
    qs.forEach(function (q) {
      if ((q.tema || 'Geral') !== t) { t = q.tema || 'Geral'; h += '<h2 class="p-unit">' + esc(t) + '</h2>'; }
      i++;
      h += '<section class="p-q"><p class="p-qq"><b>' + i + '.</b> ' + esc(q.pergunta) + '</p><div class="p-ans prose">' + md(q.resposta_md) + '</div>' + (q.fonte ? '<p class="p-src">Fonte: ' + esc(q.fonte) + '</p>' : '') + '</section>';
    });
    return h;
  }
  function pResumo(r) {
    var dt = resDate(r), e = resEv(r);
    return '<section class="p-res"><h2 class="p-unit">' + esc(r.titulo) + '</h2><p class="p-sub">' + (dt ? dmy(dt) : 'Data a definir') + (e && e.pontos ? ' · ' + esc(e.pontos) : '') + '</p>' +
      (r.abrange && r.abrange.length ? '<div class="p-box"><b>O que cai</b><ul>' + r.abrange.map(function (a) { return '<li>' + inl(a) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="prose">' + md(r.conteudo_md) + '</div></section>';
  }
  function pResumos(sig) {
    var L = resList().filter(function (r) { return r.disc === sig; }).sort(resSort);
    return L.length ? L.map(pResumo).join('') : '<p class="p-empty">Ainda sem resumos de prova desta disciplina.</p>';
  }
  var KIND = { notas: ['Anotações', pNotas], questoes: ['Questões de revisão', pQuest], resumos: ['Resumos para provas', pResumos] };
  function printDoc(title, body) {
    var root = document.getElementById('printroot');
    if (!root) { root = document.createElement('div'); root.id = 'printroot'; document.body.appendChild(root); }
    root.innerHTML = '<div class="pdoc">' + body + '<p class="p-foot">Direito · Turma PUC Minas 2026/2 · gerado em ' + dmy(iso(today())) + '. Material de estudo da turma, feito a partir das aulas, do Canvas e dos grupos. Confira sempre com os professores.</p></div>';
    var old = document.title; document.title = title.replace(/[\\/:*?"<>|]/g, '-');
    document.body.classList.add('printing');
    var done = function () { document.body.classList.remove('printing'); document.title = old; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); setTimeout(done, 1500); }, 60);
  }
  function cover(t, sig, extra) {
    var d = discInfo(sig), ld = lastDate(sig);
    return '<header class="p-cover" style="--c:' + cvar(sig) + '"><span class="p-eye">' + esc(t) + '</span><h1>' + esc(d.nome || sig) + '</h1><p>' + esc(sig) + (d.professor ? ' · ' + esc(d.professor) : '') + '</p>' +
      '<p class="p-upd">Conteúdo atualizado até ' + (ld ? dmy(ld) : '—') + (extra ? ' · ' + esc(extra) : '') + '</p></header>';
  }
  function makePDF(kind, sig, id) {
    if (kind === 'resumo') {
      var r = resList().filter(function (x) { return x.id === id; })[0]; if (!r) return;
      printDoc(r.disc + ' - ' + r.titulo, cover('Resumo para prova', r.disc) + pResumo(r)); return;
    }
    var sigs = sig ? [sig] : ORDER.filter(function (s) { return kind === 'resumos' ? resList().some(function (r) { return r.disc === s; }) : (S.notes[s] && ((S.notes[s].anotacoes || []).length || (S.notes[s].questoes || []).length)); });
    var kinds = kind === 'tudo' ? ['resumos', 'notas', 'questoes'] : [kind];
    var body = sigs.map(function (s, i) {
      return '<div class="p-disc' + (i ? ' p-break' : '') + '">' + kinds.map(function (k, j) { return (j ? '<div class="p-break"></div>' : '') + cover(KIND[k][0], s) + KIND[k][1](s); }).join('') + '</div>';
    }).join('');
    var name = (sig || 'Todas as disciplinas') + ' - ' + (kind === 'tudo' ? 'Material completo' : KIND[kind][0]) + ' - ' + dmy(iso(today())).replace(/\//g, '-');
    printDoc(name, body || '<p>Nada para baixar ainda.</p>');
  }
  function vPDF() {
    var h = '<div class="page"><div class="head"><span class="eyebrow">Baixar em PDF</span><h1>Baixar em PDF</h1><hr class="rule"><p class="lead">Gere o PDF do que está publicado até a última atualização. Ao tocar no botão, abre a janela de impressão: escolha <b>Salvar como PDF</b> (no celular, use Compartilhar ou Imprimir → Salvar PDF).</p></div>';
    h += '<div class="card rows pdf-rows">';
    h += '<div class="pdf-row all"><div class="t"><b>Todas as disciplinas</b><p>Um único PDF com tudo</p></div><div class="pdf-b">' + [['notas', 'Anotações'], ['questoes', 'Questões'], ['resumos', 'Resumos'], ['tudo', 'Tudo']].map(function (k) { return '<button class="btn" data-pdf="' + k[0] + '" data-sig="">' + k[1] + '</button>'; }).join('') + '</div></div>';
    ORDER.forEach(function (s) {
      var d = discInfo(s), N = S.notes[s] || {}, nn = (N.anotacoes || []).length, nq = (N.questoes || []).length, nr = resList().filter(function (r) { return r.disc === s; }).length, ld = lastDate(s);
      h += '<div class="pdf-row" style="--c:' + cvar(s) + '">' + sigChip(s) + '<div class="t"><b>' + esc(d.nome || s) + '</b><p>' + nn + ' anotações · ' + nq + ' questões · ' + nr + ' resumos' + (ld ? ' · atualizado até ' + dmy(ld) : '') + '</p></div><div class="pdf-b">' +
        '<button class="btn" data-pdf="notas" data-sig="' + s + '"' + (nn ? '' : ' disabled') + '>Anotações</button>' +
        '<button class="btn" data-pdf="questoes" data-sig="' + s + '"' + (nq ? '' : ' disabled') + '>Questões</button>' +
        '<button class="btn" data-pdf="resumos" data-sig="' + s + '"' + (nr ? '' : ' disabled') + '>Resumos</button>' +
        '<button class="btn primary" data-pdf="tudo" data-sig="' + s + '"' + (nn + nq + nr ? '' : ' disabled') + '>Tudo</button></div></div>';
    });
    return h + '</div></div>';
  }

  /* ---------- avisos ---------- */
  var A = { de: '', ate: '', disc: '', tbd: true, past: false };
  function avisoText() {
    var E = evs().filter(function (e) {
      if (A.disc && e.disc !== A.disc) return false;
      if (!e.data) return A.tbd;
      if (!A.past && isPast(e)) return false;
      if (A.de && endOf(e) < A.de) return false;
      if (A.ate && e.data > A.ate) return false;
      return true;
    }).sort(byDate);
    var out = ['*AVISOS* ⚠️'];
    SECOES.forEach(function (s) {
      var list = E.filter(function (e) { return e.secao === s[0]; }); if (!list.length) return;
      out.push('', '*' + s[1] + '*');
      list.forEach(function (e) {
        var when = e.data ? (e.fim ? dm(e.data) + ' (' + wd(e.data) + ') a ' + dm(e.fim) + ' (' + wd(e.fim) + ')' : dm(e.data) + ' (' + wd(e.data) + ')') : 'Data a definir';
        out.push('• ' + e.disc + ' — ' + when + ' — ' + e.titulo + (e.pontos ? ' — ' + e.pontos : ''));
        if (e.detalhes) out.push('   ↳ ' + e.detalhes);
        if (e.grupo) out.push('   ↳ ' + e.grupo);
        if (e.status === 'prevista') out.push('   ↳ Data PREVISTA, ainda não confirmada.');
        if (e.status === 'a-confirmar') out.push('   ↳ Data A CONFIRMAR.');
      });
    });
    if (out.length === 1) out.push('', 'Nenhum item no período escolhido.');
    return out.join('\n');
  }
  function vAvisos() {
    var h = '<div class="page"><div class="head"><span class="eyebrow">Avisos</span><h1>Aviso para o WhatsApp</h1><p class="lead">Texto pronto para colar no grupo. Por padrão traz todo o restante do semestre.</p></div>';
    h += '<div class="card" style="padding:16px"><div class="form">' +
      '<label>De<input class="input" type="date" id="a-de" value="' + A.de + '"></label>' +
      '<label>Até<input class="input" type="date" id="a-ate" value="' + A.ate + '"></label>' +
      '<label>Disciplina' + sel('a-disc', A.disc, [['', 'Todas']].concat(ORDER.map(function (s) { return [s, s]; }))) + '</label>' +
      '<label class="chk"><input type="checkbox" id="a-tbd"' + (A.tbd ? ' checked' : '') + '> Incluir itens a definir</label>' +
      '<label class="chk"><input type="checkbox" id="a-past"' + (A.past ? ' checked' : '') + '> Incluir passados</label></div></div>';
    var txt = avisoText();
    h += '<div class="bar"><button class="btn primary" data-act="copy">Copiar texto</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(txt) + '">Enviar no WhatsApp</a></div>';
    return h + '<div class="aviso" id="aviso">' + esc(txt) + '</div></div>';
  }

  /* ---------- .ics ---------- */
  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Agenda Juridica//PT-BR', 'CALSCALE:GREGORIAN'];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var escI = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); };
    evs().filter(function (e) { return e.data; }).forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + e.id + '@agenda-juridica', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + e.data.replace(/-/g, ''),
        'DTEND;VALUE=DATE:' + iso(addD(pd(endOf(e)), 1)).replace(/-/g, ''), 'SUMMARY:' + escI(e.disc + ' · ' + e.titulo + (e.status !== 'confirmada' ? ' (' + (STATUS[e.status] || e.status) + ')' : '')),
        'DESCRIPTION:' + escI([e.pontos, e.detalhes, e.grupo].filter(Boolean).join(' — ')), 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })); a.download = 'agenda-juridica.ics'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- roteamento ---------- */
  var OLD = { calendario: 'agenda/calendario', atividades: 'agenda/atividades', disciplinas: 'agenda/disciplinas', avisos: 'agenda/avisos' };
  function route() {
    var raw = location.hash.replace(/^#\/?/, '') || '';
    var parts = raw.split('#'); S.anchor = parts[1] || '';
    var r = parts[0].split('/');
    if (OLD[r[0]]) { location.replace('#/' + OLD[r[0]]); return OLD[r[0]].split('/'); }
    return r;
  }
  function isSig(x) { return x && ORDER.indexOf(x.toUpperCase()) >= 0; }
  function render() {
    if (!S.agenda) return;
    var r = route(), h;
    document.querySelectorAll('#nav a').forEach(function (a) { if (a.dataset.r === r[0]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (r[0] === 'agenda') {
      var sub = r[1] || '';
      h = sub === 'calendario' ? vCal() : sub === 'atividades' ? vAtiv() : sub === 'disciplinas' ? vDisc() : sub === 'avisos' ? vAvisos() : vHome();
      h = h.replace('<div class="page">', '<div class="page">' + agendaNav(sub));
    }
    else if (r[0] === 'anotacoes' && isSig(r[1])) h = vNotebook(r[1].toUpperCase(), r[2], r[3]);
    else if (r[0] === 'anotacoes') h = vNotesHome();
    else if (r[0] === 'materiais' && isSig(r[1])) h = vMatDisc(r[1].toUpperCase());
    else if (r[0] === 'materiais') h = vMatHome();
    else if (r[0] === 'resumos' && r[1]) h = vResumo(r[1]);
    else if (r[0] === 'resumos') h = vResHome();
    else if (r[0] === 'pdf') h = vPDF();
    else h = vInicio();
    var focusId = document.activeElement && document.activeElement.id, pos = focusId && document.activeElement.selectionStart;
    app.innerHTML = h;
    if (focusId && document.getElementById(focusId)) { var el = document.getElementById(focusId); el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { } }
    if (r[0] === 'anotacoes' && !r[1] && S.q) searchNotes(S.q);
    if (r[2] === 'n' && r[3]) { var n = document.getElementById('n-' + r[3]); if (n) setTimeout(function () { n.scrollIntoView({ block: 'start' }); }, 30); }
    if (S.anchor) { var an = document.getElementById('d-' + S.anchor); if (an) setTimeout(function () { an.scrollIntoView({ block: 'start' }); }, 30); }
    var title = { agenda: 'Agenda', anotacoes: 'Anotações', materiais: 'Materiais do Canvas', resumos: 'Resumos para provas', pdf: 'Baixar em PDF' }[r[0]];
    document.title = (title ? title + ' · ' : '') + 'Direito · Turma 2026';
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-pdf],[data-act],[data-cal],[data-day],[data-go],[data-tema],[data-fc]'); if (!t) return;
    var r = route(), sig = (r[1] || '').toUpperCase();
    if (t.dataset.pdf) { makePDF(t.dataset.pdf, t.dataset.sig, t.dataset.id); return; }
    if (t.dataset.act === 'sair') { try { localStorage.removeItem('aj:key'); } catch (e) { } location.hash = ''; location.reload(); }
    else if (t.dataset.act === 'ics') ics();
    else if (t.dataset.act === 'copy') {
      var txt = avisoText();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Texto copiado'); }, function () {
        var rg = document.createRange(); rg.selectNodeContents(document.getElementById('aviso')); var s = getSelection(); s.removeAllRanges(); s.addRange(rg); toast('Texto selecionado: use Ctrl+C');
      });
    }
    else if (t.dataset.cal !== undefined) { var k = +t.dataset.cal; if (k === 0) { var d = today(); S.cal = { y: d.getFullYear(), m: d.getMonth() }; S.calSel = iso(d); } else { var nm = new Date(S.cal.y, S.cal.m + k, 1); S.cal = { y: nm.getFullYear(), m: nm.getMonth() }; } render(); }
    else if (t.dataset.day) { S.calSel = t.dataset.day; var dd = pd(t.dataset.day); if (dd.getMonth() !== S.cal.m) S.cal = { y: dd.getFullYear(), m: dd.getMonth() }; render(); }
    else if (t.dataset.go) location.hash = t.dataset.go;
    else if (t.dataset.tema) { S.fc[sig] = { tema: t.dataset.tema, order: null, i: 0, show: false }; render(); }
    else if (t.dataset.fc) {
      var st = S.fc[sig]; if (!st) return; var a = t.dataset.fc;
      if (a === 'show') st.show = true;
      else if (a === 'next') { st.i = (st.i + 1) % st.order.length; st.show = false; }
      else if (a === 'prev') { st.i = Math.max(0, st.i - 1); st.show = false; }
      else if (a === 'shuffle') { st.order = st.order.slice().sort(function () { return Math.random() - .5; }); st.i = 0; st.show = false; }
      else if (a === 'ok' || a === 'no') { var sc = LSget('score', {}); sc[sig] = sc[sig] || { ok: 0, no: 0 }; sc[sig][a]++; LSset('score', sc); st.i = (st.i + 1) % st.order.length; st.show = false; }
      render();
    }
  });
  document.addEventListener('toggle', function (ev) {
    var dt = ev.target; if (!dt.matches || !dt.matches('details.note') || !dt.open) return;
    var body = dt.querySelector('.prose'); if (body.innerHTML) return;
    var sig = route()[1].toUpperCase(), id = dt.id.slice(2);
    var n = (S.notes[sig].anotacoes || []).filter(function (x) { return x.id === id; })[0];
    body.innerHTML = md(n && n.conteudo_md);
  }, true);
  var qt;
  document.addEventListener('input', function (ev) {
    var id = ev.target.id;
    if (id === 'f-q') { clearTimeout(qt); qt = setTimeout(function () { F.q = ev.target.value; render(); }, 150); }
    if (id === 'nq') { clearTimeout(qt); qt = setTimeout(function () { S.q = ev.target.value; searchNotes(S.q); }, 200); }
  });
  document.addEventListener('change', function (ev) {
    var t = ev.target, id = t.id;
    if (t.dataset.done) { var d = LSget('done', {}); if (t.checked) d[t.dataset.done] = 1; else delete d[t.dataset.done]; LSset('done', d);
      var p = document.querySelector('.prog'), boxes = document.querySelectorAll('[data-done]'), c = 0;
      boxes.forEach(function (b) { if (b.checked) c++; });
      if (p) p.innerHTML = '<span class="track"><i style="width:' + Math.round(c / boxes.length * 100) + '%"></i></span>' + c + ' de ' + boxes.length + ' revisadas';
      return; }
    var map = { 'f-disc': [F, 'disc'], 'f-secao': [F, 'secao'], 'f-status': [F, 'status'], 'f-past': [F, 'past'], 'a-de': [A, 'de'], 'a-ate': [A, 'ate'], 'a-disc': [A, 'disc'], 'a-tbd': [A, 'tbd'], 'a-past': [A, 'past'] };
    if (map[id]) { map[id][0][map[id][1]] = t.type === 'checkbox' ? t.checked : t.value; render(); }
  });

  /* ---------- início ---------- */
  iniciar();
})();
