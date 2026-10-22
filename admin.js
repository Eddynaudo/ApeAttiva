/* =====================================================================
   Ape Attiva · CRM
   ===================================================================== */
(() => {
'use strict';

const CFG = window.APE_CONFIG;
const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ape-crm-auth' }
});

/* ---------------- Utilità ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eurF = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const eur = n => eurF.format(Number(n) || 0);
const intF = new Intl.NumberFormat('it-IT');
const int = n => intF.format(Number(n) || 0);
const num = v => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const numIn = v => { // accetta "1.234,50" e "1234.50"
  let s = String(v ?? '').trim(); if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100;
};
const fmtD = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = d => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const nn = v => { const s = String(v ?? '').trim(); return s === '' ? null : s; };
const telHref = t => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const waHref = t => { let d = String(t || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.length <= 10) d = '39' + d; return 'https://wa.me/' + d; };

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z"/><path d="m5 5 4 4M3 7l4-4"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'
};
const ico = (n, s = 19) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const SERVIZI = { terreni: 'Terreni e palificate', esterni: 'Pavimentazioni e legno', giardini: 'Giardini', manutenzione: 'Manutenzione', altro: 'Altro' };
const STATI = { preventivo: 'Preventivo', accettato: 'Accettato', in_corso: 'In corso', completato: 'Completato', annullato: 'Annullato' };
const PAGAMENTO = { da_incassare: 'Da incassare', acconto: 'Acconto versato', saldato: 'Saldato', na: '—' };
const TIPI_CLIENTE = { privato: 'Privato', azienda: 'Azienda', ente: 'Ente pubblico' };
const FONTI = { sito: 'Sito web', whatsapp: 'WhatsApp', telefono: 'Telefono', passaparola: 'Passaparola', social: 'Social', altro: 'Altro' };
const TIPI_PAG = { acconto: 'Acconto', saldo: 'Saldo', altro: 'Altro' };
const METODI = { bonifico: 'Bonifico', contanti: 'Contanti', assegno: 'Assegno', carta: 'Carta/POS', altro: 'Altro' };
const STATI_RICH = { nuova: 'Nuova', contattata: 'Contattata', convertita: 'Convertita', scartata: 'Scartata' };
const SORGENTI = { diretto: 'Accesso diretto', google: 'Google', bing: 'Bing', altri_motori: 'Altri motori di ricerca', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', altri_siti: 'Altri siti', campagna: 'Campagne (UTM)' };
const DISPOSITIVI = { mobile: 'Smartphone', tablet: 'Tablet', desktop: 'Computer' };
const EVENTI = { click_telefono: 'Clic su “Chiama”', click_whatsapp: 'Clic su WhatsApp', click_email: 'Clic su email', invio_modulo: 'Moduli inviati', apri_servizio: 'Aperture pagine servizio', click_social: 'Clic sui social' };
const PAGINE = { '/': 'Home', '/index.html': 'Home', '/terreni.html': 'Terreni e palificate', '/esterni.html': 'Pavimentazioni e legno', '/giardini.html': 'Giardini' };

const opts = (map, sel) => Object.entries(map).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
const chip = (cls, label) => `<span class="chip ${esc(cls)}">${esc(label)}</span>`;
const statoPag = l => {
  if (l.stato === 'annullato' || Number(l.totale) <= 0) return 'na';
  if (Number(l.residuo) <= 0.004) return 'saldato';
  if (Number(l.incassato) > 0) return 'acconto';
  return 'da_incassare';
};
const pagePath = p => { const m = String(p || '').match(/\/[^/]*$/); const k = m ? m[0] : p; return PAGINE[k] || PAGINE[p] || k || p; };

/* ---------------- Stato ---------------- */
const S = { user: null, clienti: [], lavori: [], richieste: [], charts: [], view: 'dashboard', filtri: {} };

/* ---------------- UI di base ---------------- */
let toastT;
function toast(msg, err = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), err ? 5000 : 2600);
}
function errMsg(e) {
  const m = String(e?.message || e || '');
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Connessione assente: riprova tra poco.';
  if (/JWT|session/i.test(m)) return 'Sessione scaduta: accedi di nuovo.';
  return 'Errore: ' + m;
}
function openModal(title, html, size = '') {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('.modal').className = 'modal ' + size;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  const f = $('#modal-body input:not([type=hidden]), #modal-body select, #modal-body textarea');
  if (f && window.matchMedia('(min-width:861px)').matches) setTimeout(() => f.focus(), 30);
  return $('#modal-body');
}
function closeModal() { $('#modal').hidden = true; document.body.style.overflow = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

function confirmBox(title, text, okLabel = 'Elimina') {
  return new Promise(res => {
    const b = openModal(title, `<p style="margin:0 0 18px">${text}</p>
      <div class="form-actions"><button class="btn ghost" data-no>Annulla</button><button class="btn danger solid" data-yes>${esc(okLabel)}</button></div>`, 'sm');
    const done = v => { closeModal(); res(v); };
    $('[data-yes]', b).onclick = () => done(true);
    $('[data-no]', b).onclick = () => done(false);
  });
}

// Occhietto password (login e impostazioni)
function eyeIcon(btn, shown) { btn.innerHTML = ico(shown ? 'eyeOff' : 'eye', 20); btn.setAttribute('aria-label', shown ? 'Nascondi password' : 'Mostra password'); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-eye]'); if (!b) return;
  const inp = b.parentElement.querySelector('input'); const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password'; eyeIcon(b, show); inp.focus();
});
const initEyes = r => $$('[data-eye]', r).forEach(b => eyeIcon(b, false));

// Tooltip grafici
const tip = $('#tip');
document.addEventListener('mousemove', e => {
  const t = e.target.closest?.('[data-tip]');
  if (!t) { tip.hidden = true; return; }
  tip.innerHTML = t.getAttribute('data-tip'); tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 12;
  if (x + w > innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 16;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
});

/* ---------------- Grafici (SVG) ---------------- */
function niceMax(v) { if (v <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function barChart(el, data, { height = 220, labelEvery } = {}) {
  const draw = () => {
    const W = Math.max(el.clientWidth, 260), H = height, L = 34, B = 26, T = 8;
    const max = niceMax(Math.max(1, ...data.map(d => d.value)));
    const n = data.length || 1, slot = (W - L) / n, bw = Math.max(2, Math.min(38, slot - 2));
    const every = labelEvery || Math.ceil(n / Math.max(4, Math.floor((W - L) / 64)));
    const y = v => T + (H - T - B) * (1 - v / max);
    let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">`;
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, yy = y(v);
      s += `<line class="grid-line" x1="${L}" x2="${W}" y1="${yy}" y2="${yy}"/><text class="axis" x="${L - 7}" y="${yy + 4}" text-anchor="end">${int(v)}</text>`;
    }
    data.forEach((d, i) => {
      const x = L + i * slot + (slot - bw) / 2, yy = y(d.value), h = H - B - yy, r = Math.min(4, bw / 2, h);
      const path = h > 0 ? `M${x},${H - B}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bw - r}Q${x + bw},${yy} ${x + bw},${yy + r}V${H - B}Z` : '';
      s += `<g data-tip="${esc(d.tip)}"><rect class="hit" x="${L + i * slot}" y="${T}" width="${slot}" height="${H - T - B}"/>${path ? `<path class="bar${d.hl ? ' hl' : ''}" d="${path}"/>` : ''}</g>`;
      if (i % every === 0) s += `<text class="axis" x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
    });
    el.innerHTML = s + '</svg>';
  };
  draw(); S.charts.push(draw);
}
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => S.charts.forEach(f => f()), 150); });
function hbars(items, fmt = int) {
  if (!items.length) return '<p class="muted" style="margin:0">Nessun dato nel periodo.</p>';
  const max = Math.max(...items.map(i => i.n), 1);
  return `<div class="hbars">${items.map(i => `<div class="hbar" data-tip="${esc(`<b>${esc(fmt(i.n))}</b>${esc(i.label)}`)}"><span class="lab">${esc(i.label)}</span><span class="val">${esc(fmt(i.n))}</span><span class="track"><i style="width:${(i.n / max * 100).toFixed(1)}%"></i></span></div>`).join('')}</div>`;
}

/* ---------------- Dati ---------------- */
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
async function loadClienti() { S.clienti = await q(sb.from('clienti').select('*').order('nome')); }
async function loadLavori() { S.lavori = await q(sb.from('lavori_riepilogo').select('*').order('created_at', { ascending: false })); }
async function loadRichieste() { S.richieste = await q(sb.from('richieste').select('*').order('created_at', { ascending: false })); updateBadge(); }
async function loadAll() { await Promise.all([loadClienti(), loadLavori(), loadRichieste()]); }
function updateBadge() { const n = S.richieste.filter(r => r.stato === 'nuova').length; const b = $('#badge-richieste'); b.textContent = n; b.hidden = !n; }
const cliente = id => S.clienti.find(c => c.id === id);
const lavoriDi = id => S.lavori.filter(l => l.cliente_id === id);

/* ---------------- Auth ---------------- */
const emailDa = u => String(u || '').trim().toLowerCase() + '@' + CFG.dominioLogin;
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#boot').hidden = true; initEyes($('#login')); setTimeout(() => $('#login-form [name=username]').focus(), 50); }
async function showApp(user) {
  const adm = await sb.from('admins').select('username').eq('user_id', user.id).maybeSingle();
  if (adm.error || !adm.data) { await sb.auth.signOut(); showLogin(); const e = $('#login-error'); e.textContent = 'Questo account non è abilitato al CRM.'; e.hidden = false; return; }
  S.user = { ...user, username: adm.data.username };
  try { if (localStorage.getItem('ape_no_track') === null) localStorage.setItem('ape_no_track', '1'); } catch (_) {}
  $('#who').textContent = S.user.username;
  $('#login').hidden = true; $('#app').hidden = false; $('#boot').hidden = true;
  $$('#nav i[data-ico]').forEach(i => (i.innerHTML = ico(i.dataset.ico)));
  try { await loadAll(); } catch (e) { toast(errMsg(e), true); }
  route();
}
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget, btn = $('button[type=submit]', f), er = $('#login-error');
  const u = f.username.value.trim(), p = f.password.value;
  er.hidden = true;
  if (!u || !p) { er.textContent = 'Inserisci username e password.'; er.hidden = false; return; }
  btn.disabled = true; btn.textContent = 'Accesso in corso…';
  const { data, error } = await sb.auth.signInWithPassword({ email: emailDa(u), password: p });
  btn.disabled = false; btn.textContent = 'Entra ↗';
  if (error) { er.textContent = /invalid/i.test(error.message) ? 'Username o password non corretti.' : errMsg(error); er.hidden = false; return; }
  f.password.value = '';
  showApp(data.user);
});
$('#logout').addEventListener('click', async () => { await sb.auth.signOut(); S.user = null; location.hash = ''; showLogin(); });

/* ---------------- Router ---------------- */
const VIEWS = {
  dashboard: { t: 'Dashboard', k: 'Panoramica', r: viewDashboard },
  clienti: { t: 'Clienti', k: 'Anagrafica', r: viewClienti },
  lavori: { t: 'Lavori', k: 'Commesse e pagamenti', r: viewLavori },
  richieste: { t: 'Richieste', k: 'Contatti dal sito', r: viewRichieste },
  statistiche: { t: 'Statistiche sito', k: 'Visite e indicizzazione', r: viewStatistiche },
  impostazioni: { t: 'Impostazioni', k: 'Account', r: viewImpostazioni }
};
function route() {
  if (!S.user) return;
  const v = (location.hash || '#dashboard').slice(1).split('?')[0];
  S.view = VIEWS[v] ? v : 'dashboard';
  const V = VIEWS[S.view];
  $('#view-title').textContent = V.t; $('#view-kicker').textContent = V.k;
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.view === S.view));
  $('#top-actions').innerHTML = ''; S.charts = [];
  document.title = V.t + ' | CRM Ape Attiva';
  V.r($('#view'));
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
const rerender = () => { S.charts = []; VIEWS[S.view].r($('#view')); };
function topActions(html) { $('#top-actions').innerHTML = html; return $('#top-actions'); }

/* ================= DASHBOARD ================= */
async function viewDashboard(el) {
  const btns = topActions(`<button class="btn ghost" data-a="cliente">+ Cliente</button><button class="btn primary" data-a="lavoro">+ Nuovo lavoro</button>`);
  $('[data-a=cliente]', btns).onclick = () => formCliente();
  $('[data-a=lavoro]', btns).onclick = () => formLavoro();

  const attivi = S.lavori.filter(l => l.stato !== 'annullato');
  const daIncassare = attivi.filter(l => ['accettato', 'in_corso', 'completato'].includes(l.stato) && Number(l.residuo) > 0.004);
  const totDaInc = daIncassare.reduce((s, l) => s + Number(l.residuo), 0);
  const inCorso = S.lavori.filter(l => ['accettato', 'in_corso'].includes(l.stato));
  const preventivi = S.lavori.filter(l => l.stato === 'preventivo');
  const valPrev = preventivi.reduce((s, l) => s + Number(l.totale), 0);
  const nuove = S.richieste.filter(r => r.stato === 'nuova');
  const anno = new Date().getFullYear();

  el.innerHTML = `
    <div class="kpis">
      <div class="kpi dark"><small>Da incassare</small><strong>${eur(totDaInc)}</strong><span>${daIncassare.length} lavori con residuo</span></div>
      <div class="kpi"><small>Incassato ${anno}</small><strong id="k-inc">…</strong><span>acconti e saldi registrati</span></div>
      <div class="kpi"><small>Lavori attivi</small><strong>${inCorso.length}</strong><span>accettati o in corso</span></div>
      <div class="kpi"><small>Preventivi aperti</small><strong>${preventivi.length}</strong><span>valore ${eur(valPrev)}</span></div>
      <div class="kpi"><small>Richieste nuove</small><strong>${nuove.length}</strong><span>dal modulo del sito</span></div>
      <div class="kpi"><small>Visite 30 giorni</small><strong id="k-vis">…</strong><span id="k-vis-s">sessioni sul sito</span></div>
    </div>
    <div class="panels cols-2">
      <div class="panel"><h3>Da incassare <a class="link" href="#lavori">Tutti i lavori</a></h3>${listaLavori(daIncassare.sort((a, b) => b.residuo - a.residuo).slice(0, 6), 'residuo', 'Nessun residuo da incassare.')}</div>
      <div class="panel"><h3>Lavori attivi <a class="link" href="#lavori">Vedi</a></h3>${listaLavori(inCorso.slice(0, 6), 'stato', 'Nessun lavoro in corso.')}</div>
      <div class="panel"><h3>Ultime richieste dal sito <a class="link" href="#richieste">Vedi tutte</a></h3>${listaRichieste(S.richieste.slice(0, 5))}</div>
      <div class="panel"><h3>Visite ultimi 30 giorni <a class="link" href="#statistiche">Dettagli</a></h3><div class="chart" id="dash-chart"><p class="muted">Caricamento…</p></div></div>
    </div>`;
  bindRows(el);

  try {
    const pag = await q(sb.from('pagamenti').select('importo').gte('data', anno + '-01-01'));
    $('#k-inc', el) && ($('#k-inc', el).textContent = eur(pag.reduce((s, p) => s + Number(p.importo), 0)));
  } catch (e) { $('#k-inc', el) && ($('#k-inc', el).textContent = '—'); }
  try {
    const st = await q(sb.rpc('statistiche_sito', { giorni: 30 }));
    if (S.view !== 'dashboard') return;
    $('#k-vis').textContent = int(st.sessioni);
    $('#k-vis-s').textContent = `${int(st.visitatori)} visitatori · ${int(st.contatti)} contatti`;
    const c = $('#dash-chart'); c.innerHTML = '';
    barChart(c, st.per_giorno.map(d => ({ label: new Date(d.giorno + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }), value: d.sessioni, tip: `<b>${int(d.sessioni)} sessioni</b>${int(d.visualizzazioni)} pagine viste · ${fmtD(d.giorno)}` })), { height: 190 });
  } catch (e) { const c = $('#dash-chart'); if (c) c.innerHTML = `<p class="muted">${esc(errMsg(e))}</p>`; }
}
function listaLavori(arr, mode, vuoto) {
  if (!arr.length) return `<p class="muted" style="margin:0">${vuoto}</p>`;
  return `<div class="list">${arr.map(l => `<div class="list-row" data-lavoro="${l.id}"><div><strong>${esc(l.titolo)}</strong><span class="sub">${esc(l.cliente_nome)} · ${esc(SERVIZI[l.servizio])}</span></div>
    <div class="r">${mode === 'residuo' ? `<strong style="color:var(--bad)">${eur(l.residuo)}</strong><span class="sub">su ${eur(l.totale)}</span>` : chip(l.stato, STATI[l.stato]) + `<span class="sub">${eur(l.totale)}</span>`}</div></div>`).join('')}</div>`;
}
function listaRichieste(arr) {
  if (!arr.length) return '<p class="muted" style="margin:0">Nessuna richiesta ricevuta finora.</p>';
  return `<div class="list">${arr.map(r => `<div class="list-row" data-richiesta="${r.id}"><div><strong>${esc(r.nome)}</strong><span class="sub">${esc(r.servizio || 'Richiesta generica')} · ${fmtDT(r.created_at)}</span></div><div class="r">${chip(r.stato, STATI_RICH[r.stato])}</div></div>`).join('')}</div>`;
}
function bindRows(el) {
  $$('[data-lavoro]', el).forEach(r => r.onclick = () => formLavoro(S.lavori.find(l => l.id === r.dataset.lavoro)));
  $$('[data-cliente]', el).forEach(r => r.onclick = () => schedaCliente(r.dataset.cliente));
  $$('[data-richiesta]', el).forEach(r => r.onclick = () => schedaRichiesta(r.dataset.richiesta));
}

/* ================= CLIENTI ================= */
function viewClienti(el) {
  const b = topActions(`<button class="btn primary">+ Nuovo cliente</button>`);
  $('button', b).onclick = () => formCliente();
  const f = S.filtri.clienti ||= { q: '', tipo: '' };
  el.innerHTML = `<div class="toolbar"><input type="search" placeholder="Cerca nome, telefono, comune…" value="${esc(f.q)}" id="cq"/>
    <select id="ct"><option value="">Tutti i tipi</option>${opts(TIPI_CLIENTE, f.tipo)}</select><span class="muted" id="cn"></span></div>
    <div class="table-wrap resp" id="ctab"></div>`;
  const draw = () => {
    const qq = f.q.toLowerCase();
    const rows = S.clienti.filter(c => (!f.tipo || c.tipo === f.tipo) && (!qq || [c.nome, c.referente, c.telefono, c.email, c.comune, c.partita_iva, c.codice_fiscale].some(v => String(v || '').toLowerCase().includes(qq))));
    $('#cn').textContent = `${rows.length} ${rows.length === 1 ? 'cliente' : 'clienti'}`;
    if (!rows.length) { $('#ctab').innerHTML = S.clienti.length ? '<div class="empty"><b>Nessun risultato</b>Prova un’altra ricerca.</div>' : '<div class="empty"><b>Ancora nessun cliente</b>Aggiungi il primo con “+ Nuovo cliente”.</div>'; return; }
    const info = c => { const ls = lavoriDi(c.id).filter(l => l.stato !== 'annullato'); return { n: ls.length, tot: ls.reduce((s, l) => s + Number(l.totale), 0), res: ls.filter(l => l.stato !== 'preventivo').reduce((s, l) => s + Math.max(0, Number(l.residuo)), 0) }; };
    $('#ctab').innerHTML = `<table><thead><tr><th>Cliente</th><th>Contatti</th><th>Comune</th><th class="num">Lavori</th><th class="num">Valore lavori</th><th class="num">Da incassare</th></tr></thead><tbody>
      ${rows.map(c => { const i = info(c); return `<tr data-cliente="${c.id}"><td><strong>${esc(c.nome)}</strong><span class="sub">${esc(TIPI_CLIENTE[c.tipo])}${c.referente ? ' · ' + esc(c.referente) : ''}</span></td>
        <td>${esc(c.telefono || '—')}<span class="sub">${esc(c.email || '')}</span></td><td>${esc(c.comune || '—')}</td><td class="num">${i.n}</td><td class="num">${eur(i.tot)}</td><td class="num"${i.res > 0 ? ' style="color:var(--bad);font-weight:700"' : ''}>${eur(i.res)}</td></tr>`; }).join('')}
      </tbody></table>
      <div class="cards-m">${rows.map(c => { const i = info(c); return `<div class="mcard" data-cliente="${c.id}"><div class="row"><strong>${esc(c.nome)}</strong><span class="muted">${i.n} lavori</span></div><div class="row"><span class="sub">${esc(c.telefono || '')} ${c.comune ? '· ' + esc(c.comune) : ''}</span>${i.res > 0 ? `<b style="color:var(--bad)">${eur(i.res)}</b>` : ''}</div></div>`; }).join('')}</div>`;
    bindRows($('#ctab'));
  };
  $('#cq').oninput = e => { f.q = e.target.value; draw(); };
  $('#ct').onchange = e => { f.tipo = e.target.value; draw(); };
  draw();
}

function schedaCliente(id) {
  const c = cliente(id); if (!c) return;
  const ls = lavoriDi(id);
  const valid = ls.filter(l => l.stato !== 'annullato');
  const tot = valid.reduce((s, l) => s + Number(l.totale), 0), inc = valid.reduce((s, l) => s + Number(l.incassato), 0);
  const res = valid.filter(l => l.stato !== 'preventivo').reduce((s, l) => s + Math.max(0, Number(l.residuo)), 0);
  const fact = (k, v) => v ? `<div><small>${k}</small>${esc(v)}</div>` : '';
  const b = openModal(c.nome, `
    <div class="detail-head"><div>${chip('', TIPI_CLIENTE[c.tipo])} ${chip('', 'Fonte: ' + FONTI[c.fonte])}</div>
      <div class="quick">${c.telefono ? `<a class="btn ghost sm" href="${telHref(c.telefono)}">☎ Chiama</a><a class="btn ghost sm" href="${waHref(c.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${c.email ? `<a class="btn ghost sm" href="mailto:${esc(c.email)}">Email</a>` : ''}</div></div>
    <div class="facts">${fact('Telefono', c.telefono)}${fact('Email', c.email)}${fact('Referente', c.referente)}${fact('Indirizzo', [c.indirizzo, [c.cap, c.comune, c.provincia && '(' + c.provincia + ')'].filter(Boolean).join(' ')].filter(Boolean).join(', '))}${fact('Codice fiscale', c.codice_fiscale)}${fact('Partita IVA', c.partita_iva)}${fact('PEC', c.pec)}${fact('Codice SDI', c.codice_sdi)}${fact('Cliente dal', fmtD(c.created_at))}</div>
    ${c.note ? `<p style="background:var(--cream);padding:12px;border-radius:12px;margin:0 0 6px;white-space:pre-wrap">${esc(c.note)}</p>` : ''}
    <div class="money"><div><small>Lavori</small><b>${valid.length}</b></div><div><small>Valore totale</small><b>${eur(tot)}</b></div><div><small>Incassato</small><b>${eur(inc)}</b></div><div class="res${res <= 0 ? ' zero' : ''}"><small>Da incassare</small><b>${eur(res)}</b></div></div>
    <div class="section-t">Lavori <button class="btn primary sm" data-a="nuovo">+ Nuovo lavoro</button></div>
    ${ls.length ? `<div class="list">${ls.map(l => `<div class="list-row" data-lavoro="${l.id}"><div><strong>${esc(l.titolo)}</strong><span class="sub">${esc(SERVIZI[l.servizio])} · ${fmtD(l.data_inizio || l.data_preventivo)}</span></div><div class="r">${chip(l.stato, STATI[l.stato])}<span class="sub">${eur(l.totale)} · residuo ${eur(Math.max(0, l.residuo))}</span></div></div>`).join('')}</div>` : '<p class="muted">Nessun lavoro registrato per questo cliente.</p>'}
    <div class="form-actions" style="margin-top:22px"><button class="btn danger left" data-a="del">Elimina cliente</button><button class="btn ghost" data-a="edit">Modifica dati</button></div>`);
  bindRows(b);
  $('[data-a=nuovo]', b).onclick = () => formLavoro(null, { cliente_id: id });
  $('[data-a=edit]', b).onclick = () => formCliente(c);
  $('[data-a=del]', b).onclick = async () => {
    const ok = await confirmBox('Eliminare il cliente?', `Verrà eliminato <b>${esc(c.nome)}</b>${ls.length ? ` insieme a <b>${ls.length} lavori</b> e ai relativi pagamenti` : ''}. L’operazione non si può annullare.`);
    if (!ok) return schedaCliente(id);
    try { await q(sb.from('clienti').delete().eq('id', id)); await Promise.all([loadClienti(), loadLavori()]); toast('Cliente eliminato'); rerender(); }
    catch (e) { toast(errMsg(e), true); }
  };
}

function campiCliente(c = {}, pre = '') {
  return `<div class="grid g3">
    <label class="span2">Nome e cognome / Ragione sociale *<input name="${pre}nome" required maxlength="200" value="${esc(c.nome)}"/></label>
    <label>Tipo<select name="${pre}tipo">${opts(TIPI_CLIENTE, c.tipo || 'privato')}</select></label>
    <label>Telefono<input name="${pre}telefono" type="tel" value="${esc(c.telefono)}"/></label>
    <label>Email<input name="${pre}email" type="email" value="${esc(c.email)}"/></label>
    <label>Come ci ha conosciuto<select name="${pre}fonte">${opts(FONTI, c.fonte || 'altro')}</select></label>
  </div>`;
}
function formCliente(c = null, after) {
  const n = !c; c = c || {};
  const b = openModal(n ? 'Nuovo cliente' : 'Modifica cliente', `<form novalidate>
    ${campiCliente(c)}
    <div class="grid g3">
      <label>Referente<input name="referente" value="${esc(c.referente)}"/></label>
      <label class="span2">Indirizzo<input name="indirizzo" value="${esc(c.indirizzo)}"/></label>
      <label>Comune<input name="comune" value="${esc(c.comune)}"/></label>
      <label>Provincia<input name="provincia" maxlength="2" placeholder="GE" value="${esc(c.provincia)}" style="text-transform:uppercase"/></label>
      <label>CAP<input name="cap" inputmode="numeric" maxlength="5" value="${esc(c.cap)}"/></label>
      <label>Codice fiscale<input name="codice_fiscale" style="text-transform:uppercase" value="${esc(c.codice_fiscale)}"/></label>
      <label>Partita IVA<input name="partita_iva" inputmode="numeric" value="${esc(c.partita_iva)}"/></label>
      <label>PEC<input name="pec" type="email" value="${esc(c.pec)}"/></label>
      <label>Codice SDI<input name="codice_sdi" maxlength="7" style="text-transform:uppercase" value="${esc(c.codice_sdi)}"/></label>
      <label class="span-all">Note<textarea name="note">${esc(c.note)}</textarea></label>
    </div>
    <p class="form-error" hidden></p>
    <div class="form-actions"><button type="button" class="btn ghost" data-close>Annulla</button><button class="btn primary" type="submit">${n ? 'Crea cliente' : 'Salva modifiche'}</button></div>
  </form>`);
  $('form', b).onsubmit = async e => {
    e.preventDefault();
    const f = e.currentTarget, er = $('.form-error', f), btn = $('[type=submit]', f);
    const rec = {}; ['nome', 'tipo', 'telefono', 'email', 'fonte', 'referente', 'indirizzo', 'comune', 'provincia', 'cap', 'codice_fiscale', 'partita_iva', 'pec', 'codice_sdi', 'note'].forEach(k => rec[k] = nn(f[k].value));
    ['provincia', 'codice_fiscale', 'codice_sdi'].forEach(k => rec[k] && (rec[k] = rec[k].toUpperCase()));
    if (!rec.nome) { er.textContent = 'Il nome è obbligatorio.'; er.hidden = false; return; }
    btn.disabled = true;
    try {
      const row = n ? await q(sb.from('clienti').insert(rec).select().single()) : await q(sb.from('clienti').update(rec).eq('id', c.id).select().single());
      await loadClienti(); toast(n ? 'Cliente creato' : 'Modifiche salvate');
      if (after) after(row); else { rerender(); schedaCliente(row.id); }
    } catch (x) { er.textContent = errMsg(x); er.hidden = false; btn.disabled = false; }
  };
}

/* ================= LAVORI ================= */
function viewLavori(el) {
  const b = topActions(`<button class="btn primary">+ Nuovo lavoro</button>`);
  $('button', b).onclick = () => formLavoro();
  const f = S.filtri.lavori ||= { q: '', stato: '', servizio: '', pag: '' };
  el.innerHTML = `<div class="toolbar"><input type="search" id="lq" placeholder="Cerca lavoro, cliente, località…" value="${esc(f.q)}"/>
    <select id="ls"><option value="">Tutti gli stati</option>${opts(STATI, f.stato)}</select>
    <select id="lv"><option value="">Tutti i servizi</option>${opts(SERVIZI, f.servizio)}</select>
    <select id="lp"><option value="">Tutti i pagamenti</option>${opts({ da_incassare: 'Da incassare', acconto: 'Acconto versato', saldato: 'Saldato' }, f.pag)}</select></div>
    <div class="kpis" id="lk"></div><div class="table-wrap resp" id="ltab"></div>`;
  const draw = () => {
    const qq = f.q.toLowerCase();
    const rows = S.lavori.filter(l => (!f.stato || l.stato === f.stato) && (!f.servizio || l.servizio === f.servizio) && (!f.pag || statoPag(l) === f.pag)
      && (!qq || [l.titolo, l.cliente_nome, l.localita, l.descrizione].some(v => String(v || '').toLowerCase().includes(qq))));
    const v = rows.filter(l => l.stato !== 'annullato');
    const sum = k => v.reduce((s, l) => s + Number(l[k]), 0);
    $('#lk').innerHTML = `<div class="kpi"><small>Lavori</small><strong>${rows.length}</strong></div><div class="kpi"><small>Valore</small><strong>${eur(sum('totale'))}</strong></div><div class="kpi"><small>Incassato</small><strong>${eur(sum('incassato'))}</strong></div><div class="kpi dark"><small>Residuo</small><strong>${eur(v.filter(l => l.stato !== 'preventivo').reduce((s, l) => s + Math.max(0, Number(l.residuo)), 0))}</strong><span>esclusi preventivi</span></div>`;
    if (!rows.length) { $('#ltab').innerHTML = S.lavori.length ? '<div class="empty"><b>Nessun lavoro trovato</b>Modifica i filtri.</div>' : '<div class="empty"><b>Ancora nessun lavoro</b>Crea il primo con “+ Nuovo lavoro”.</div>'; return; }
    const pct = l => Number(l.totale) > 0 ? Math.min(100, Number(l.incassato) / Number(l.totale) * 100) : 0;
    $('#ltab').innerHTML = `<table><thead><tr><th>Lavoro</th><th>Servizio</th><th>Stato</th><th>Date</th><th class="num">Totale</th><th>Incassato</th><th class="num">Residuo</th><th>Pagamento</th></tr></thead><tbody>
      ${rows.map(l => { const sp = statoPag(l); return `<tr data-lavoro="${l.id}"><td><strong>${esc(l.titolo)}</strong><span class="sub">${esc(l.cliente_nome)}${l.localita ? ' · ' + esc(l.localita) : ''}</span></td>
        <td>${esc(SERVIZI[l.servizio])}</td><td>${chip(l.stato, STATI[l.stato])}</td><td style="white-space:nowrap">${fmtD(l.data_inizio || l.data_preventivo)}${l.data_fine ? `<span class="sub">fine ${fmtD(l.data_fine)}</span>` : ''}</td>
        <td class="num">${eur(l.totale)}</td><td><div class="prog"><i style="width:${pct(l)}%"></i></div><span class="sub">${eur(l.incassato)}</span></td>
        <td class="num"${sp === 'da_incassare' || sp === 'acconto' ? ' style="color:var(--bad);font-weight:700"' : ''}>${eur(Math.max(0, l.residuo))}</td><td>${sp === 'na' ? '<span class="muted">—</span>' : chip(sp, PAGAMENTO[sp])}</td></tr>`; }).join('')}
      </tbody></table>
      <div class="cards-m">${rows.map(l => { const sp = statoPag(l); return `<div class="mcard" data-lavoro="${l.id}"><div class="row"><strong>${esc(l.titolo)}</strong>${chip(l.stato, STATI[l.stato])}</div><span class="sub">${esc(l.cliente_nome)} · ${esc(SERVIZI[l.servizio])}</span><div class="prog"><i style="width:${pct(l)}%"></i></div><div class="row"><span class="sub">${eur(l.incassato)} di ${eur(l.totale)}</span>${sp === 'na' ? '' : chip(sp, PAGAMENTO[sp])}</div></div>`; }).join('')}</div>`;
    bindRows($('#ltab'));
  };
  $('#lq').oninput = e => { f.q = e.target.value; draw(); };
  $('#ls').onchange = e => { f.stato = e.target.value; draw(); };
  $('#lv').onchange = e => { f.servizio = e.target.value; draw(); };
  $('#lp').onchange = e => { f.pag = e.target.value; draw(); };
  draw();
}

async function formLavoro(l = null, pre = {}) {
  const n = !l; l = l || { stato: 'preventivo', servizio: 'altro', iva_percentuale: 22, data_preventivo: today(), ...pre };
  const cl = S.clienti;
  const b = openModal(n ? 'Nuovo lavoro' : l.titolo, `<form novalidate id="fl">
    <div class="grid g3">
      <label class="span2">Cliente *<select name="cliente_id" required><option value="">Seleziona un cliente…</option><option value="__new">+ Nuovo cliente…</option>${cl.map(c => `<option value="${c.id}"${c.id === l.cliente_id ? ' selected' : ''}>${esc(c.nome)}${c.comune ? ' — ' + esc(c.comune) : ''}</option>`).join('')}</select></label>
      <label>Stato<select name="stato">${opts(STATI, l.stato)}</select></label>
    </div>
    <div id="nuovo-cli" hidden style="background:var(--cream);padding:14px;border-radius:14px">${campiCliente({ nome: pre.nuovo_nome, telefono: pre.nuovo_tel, email: pre.nuovo_email, fonte: pre.nuovo_fonte }, 'nc_')}</div>
    <div class="grid g3">
      <label class="span2">Titolo del lavoro *<input name="titolo" required maxlength="200" placeholder="Es. Palificata in castagno lato strada" value="${esc(l.titolo)}"/></label>
      <label>Tipo di lavoro<select name="servizio">${opts(SERVIZI, l.servizio)}</select></label>
      <label>Località intervento<input name="localita" value="${esc(l.localita)}"/></label>
      <label>Data preventivo<input type="date" name="data_preventivo" value="${esc(l.data_preventivo || '')}"/></label>
      <label>Data inizio<input type="date" name="data_inizio" value="${esc(l.data_inizio || '')}"/></label>
      <label>Data fine<input type="date" name="data_fine" value="${esc(l.data_fine || '')}"/></label>
      <label>Prezzo (imponibile €) *<input name="imponibile" inputmode="decimal" placeholder="0,00" value="${l.imponibile != null ? esc(String(l.imponibile).replace('.', ',')) : ''}"/></label>
      <label>IVA %<select name="iva_percentuale">${[0, 4, 10, 22].map(v => `<option value="${v}"${Number(l.iva_percentuale) === v ? ' selected' : ''}>${v}%</option>`).join('')}</select></label>
      <label class="span-all">Descrizione<textarea name="descrizione" placeholder="Dettagli dell'intervento, materiali, misure…">${esc(l.descrizione)}</textarea></label>
      <label class="span-all">Note interne<textarea name="note" style="min-height:60px">${esc(l.note)}</textarea></label>
    </div>
    <div class="money" id="calc"></div>
    <p class="form-error" hidden></p>
    <div class="form-actions">${n ? '' : '<button type="button" class="btn danger left" data-a="del">Elimina lavoro</button>'}<button type="button" class="btn ghost" data-close>Chiudi</button><button class="btn primary" type="submit">${n ? 'Crea lavoro' : 'Salva modifiche'}</button></div>
  </form>
  ${n ? '<p class="hint" style="margin-top:12px">Dopo aver creato il lavoro potrai registrare acconti e saldo.</p>' : '<div id="pagamenti"></div>'}`);
  const f = $('#fl', b);
  const sel = f.cliente_id, box = $('#nuovo-cli', b);
  const toggleNew = () => { box.hidden = sel.value !== '__new'; };
  sel.onchange = toggleNew;
  if (pre.nuovo_nome) { sel.value = '__new'; toggleNew(); }
  const pag = n ? [] : await q(sb.from('pagamenti').select('*').eq('lavoro_id', l.id).order('data')).catch(e => (toast(errMsg(e), true), []));
  const calc = () => {
    const imp = numIn(f.imponibile.value), iva = Number(f.iva_percentuale.value), tot = Math.round(imp * (1 + iva / 100) * 100) / 100;
    const inc = pag.reduce((s, p) => s + Number(p.importo), 0), acc = pag.filter(p => p.tipo === 'acconto').reduce((s, p) => s + Number(p.importo), 0), res = Math.round((tot - inc) * 100) / 100;
    $('#calc', b).innerHTML = `<div><small>IVA ${iva}%</small><b>${eur(tot - imp)}</b></div><div><small>Totale</small><b>${eur(tot)}</b></div><div><small>Acconti</small><b>${eur(acc)}</b></div><div class="res${res <= 0 ? ' zero' : ''}"><small>${res < 0 ? 'Pagato in più' : 'Residuo'}</small><b>${eur(Math.abs(res))}</b></div>`;
    return { tot, res };
  };
  f.imponibile.oninput = calc; f.iva_percentuale.onchange = calc; calc();

  if (!n) renderPagamenti(l, pag, calc);

  f.onsubmit = async e => {
    e.preventDefault();
    const er = $('.form-error', f), btn = $('[type=submit]', f); er.hidden = true;
    const rec = { titolo: nn(f.titolo.value), servizio: f.servizio.value, stato: f.stato.value, localita: nn(f.localita.value), descrizione: nn(f.descrizione.value), note: nn(f.note.value),
      data_preventivo: nn(f.data_preventivo.value), data_inizio: nn(f.data_inizio.value), data_fine: nn(f.data_fine.value), imponibile: numIn(f.imponibile.value), iva_percentuale: Number(f.iva_percentuale.value) };
    const fail = m => { er.textContent = m; er.hidden = false; btn.disabled = false; };
    if (!sel.value) return fail('Seleziona il cliente.');
    if (sel.value === '__new' && !nn(f.nc_nome.value)) return fail('Inserisci il nome del nuovo cliente.');
    if (!rec.titolo) return fail('Inserisci il titolo del lavoro.');
    if (rec.data_inizio && rec.data_fine && rec.data_fine < rec.data_inizio) return fail('La data di fine è precedente all’inizio.');
    btn.disabled = true;
    try {
      let cid = sel.value;
      if (cid === '__new') {
        const nc = await q(sb.from('clienti').insert({ nome: nn(f.nc_nome.value), tipo: f.nc_tipo.value, telefono: nn(f.nc_telefono.value), email: nn(f.nc_email.value), fonte: f.nc_fonte.value }).select().single());
        cid = nc.id; await loadClienti();
      }
      rec.cliente_id = cid;
      const row = n ? await q(sb.from('lavori').insert(rec).select().single()) : await q(sb.from('lavori').update(rec).eq('id', l.id).select().single());
      if (pre.richiesta_id) await q(sb.from('richieste').update({ stato: 'convertita', cliente_id: cid }).eq('id', pre.richiesta_id)).then(loadRichieste).catch(() => {});
      await loadLavori(); toast(n ? 'Lavoro creato' : 'Modifiche salvate'); rerender();
      formLavoro(S.lavori.find(x => x.id === row.id));
    } catch (x) { fail(errMsg(x)); }
  };
  const del = $('[data-a=del]', f);
  if (del) del.onclick = async () => {
    const ok = await confirmBox('Eliminare il lavoro?', `Verrà eliminato <b>${esc(l.titolo)}</b>${pag.length ? ` con <b>${pag.length} pagamenti</b> registrati` : ''}.`);
    if (!ok) return formLavoro(l);
    try { await q(sb.from('lavori').delete().eq('id', l.id)); await loadLavori(); toast('Lavoro eliminato'); rerender(); } catch (e) { toast(errMsg(e), true); }
  };
}

function renderPagamenti(l, pag, calc) {
  const box = $('#pagamenti'); if (!box) return;
  const { res } = calc();
  box.innerHTML = `<div class="section-t">Acconti e pagamenti ${res > 0 ? `<button class="btn ghost sm" data-a="saldo">Registra saldo ${eur(res)}</button>` : ''}</div>
    ${pag.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Metodo</th><th class="num">Importo</th><th></th></tr></thead><tbody style="cursor:default">
      ${pag.map(p => `<tr style="cursor:default"><td>${fmtD(p.data)}${p.note ? `<span class="sub">${esc(p.note)}</span>` : ''}</td><td>${chip(p.tipo === 'saldo' ? 'saldato' : 'acconto', TIPI_PAG[p.tipo])}</td><td>${esc(METODI[p.metodo])}</td><td class="num"><strong>${eur(p.importo)}</strong></td><td class="num"><button class="icon-btn" data-delpag="${p.id}" aria-label="Elimina pagamento" title="Elimina">✕</button></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="muted" style="margin:0">Nessun pagamento registrato.</p>'}
    <form class="pay-form" id="fp" novalidate>
      <label>Tipo<select name="tipo">${opts(TIPI_PAG, pag.length ? 'saldo' : 'acconto')}</select></label>
      <label>Importo €<input name="importo" inputmode="decimal" placeholder="0,00" required/></label>
      <label>Data<input type="date" name="data" value="${today()}"/></label>
      <label>Metodo<select name="metodo">${opts(METODI, 'bonifico')}</select></label>
      <button class="btn primary" type="submit">+ Registra</button>
      <label style="grid-column:1/-1">Nota (facoltativa)<input name="note" maxlength="200"/></label>
    </form>`;
  const fp = $('#fp', box);
  const add = async rec => {
    try {
      await q(sb.from('pagamenti').insert({ lavoro_id: l.id, ...rec }));
      await loadLavori(); toast('Pagamento registrato'); rerender();
      formLavoro(S.lavori.find(x => x.id === l.id));
    } catch (e) { toast(errMsg(e), true); }
  };
  fp.onsubmit = e => {
    e.preventDefault();
    const imp = numIn(fp.importo.value);
    if (imp <= 0) { toast('Inserisci un importo valido.', true); fp.importo.focus(); return; }
    $('[type=submit]', fp).disabled = true;
    add({ tipo: fp.tipo.value, importo: imp, data: fp.data.value || today(), metodo: fp.metodo.value, note: nn(fp.note.value) });
  };
  const s = $('[data-a=saldo]', box);
  if (s) s.onclick = () => { fp.tipo.value = 'saldo'; fp.importo.value = String(res.toFixed(2)).replace('.', ','); fp.importo.focus(); fp.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $$('[data-delpag]', box).forEach(btn => btn.onclick = async () => {
    const p = pag.find(x => x.id === btn.dataset.delpag);
    const ok = await confirmBox('Eliminare il pagamento?', `${TIPI_PAG[p.tipo]} di <b>${eur(p.importo)}</b> del ${fmtD(p.data)}.`);
    if (ok) { try { await q(sb.from('pagamenti').delete().eq('id', p.id)); await loadLavori(); toast('Pagamento eliminato'); rerender(); } catch (e) { toast(errMsg(e), true); } }
    formLavoro(S.lavori.find(x => x.id === l.id));
  });
}

/* ================= RICHIESTE ================= */
function viewRichieste(el) {
  const b = topActions(`<button class="btn ghost">↻ Aggiorna</button>`);
  $('button', b).onclick = async () => { try { await loadRichieste(); rerender(); toast('Aggiornato'); } catch (e) { toast(errMsg(e), true); } };
  const f = S.filtri.richieste ||= { stato: 'aperte' };
  const filtri = { aperte: 'Da gestire', tutte: 'Tutte', convertita: 'Convertite', scartata: 'Scartate' };
  el.innerHTML = `<div class="toolbar"><div class="seg" id="rs">${Object.entries(filtri).map(([k, v]) => `<button data-k="${k}" class="${f.stato === k ? 'on' : ''}">${v}</button>`).join('')}</div></div><div class="table-wrap resp" id="rtab"></div>`;
  const draw = () => {
    const rows = S.richieste.filter(r => f.stato === 'tutte' || (f.stato === 'aperte' ? ['nuova', 'contattata'].includes(r.stato) : r.stato === f.stato));
    if (!rows.length) { $('#rtab').innerHTML = `<div class="empty"><b>Nessuna richiesta</b>Le richieste inviate dal modulo contatti del sito compariranno qui.</div>`; return; }
    $('#rtab').innerHTML = `<table><thead><tr><th>Ricevuta</th><th>Contatto</th><th>Servizio</th><th>Messaggio</th><th>Stato</th></tr></thead><tbody>
      ${rows.map(r => `<tr data-richiesta="${r.id}"><td style="white-space:nowrap">${fmtDT(r.created_at)}</td><td><strong>${esc(r.nome)}</strong><span class="sub">${esc(r.telefono)}${r.localita ? ' · ' + esc(r.localita) : ''}</span></td><td>${esc(r.servizio || '—')}</td><td style="max-width:320px"><span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(r.messaggio)}</span></td><td>${chip(r.stato, STATI_RICH[r.stato])}</td></tr>`).join('')}
      </tbody></table>
      <div class="cards-m">${rows.map(r => `<div class="mcard" data-richiesta="${r.id}"><div class="row"><strong>${esc(r.nome)}</strong>${chip(r.stato, STATI_RICH[r.stato])}</div><span class="sub">${esc(r.servizio || 'Richiesta generica')} · ${fmtDT(r.created_at)}</span></div>`).join('')}</div>`;
    bindRows($('#rtab'));
  };
  $$('#rs button').forEach(x => x.onclick = () => { f.stato = x.dataset.k; $$('#rs button').forEach(y => y.classList.toggle('on', y === x)); draw(); });
  draw();
}
const servizioDa = s => { s = String(s || '').toLowerCase(); return s.includes('terren') ? 'terreni' : s.includes('pavim') || s.includes('legno') ? 'esterni' : s.includes('giardin') ? 'giardini' : 'altro'; };
function schedaRichiesta(id) {
  const r = S.richieste.find(x => x.id === id); if (!r) return;
  const cli = r.cliente_id && cliente(r.cliente_id);
  const b = openModal('Richiesta di ' + r.nome, `
    <div class="detail-head"><div>${chip(r.stato, STATI_RICH[r.stato])} <span class="muted" style="font-size:.85rem">ricevuta ${fmtDT(r.created_at)}</span></div>
      <div class="quick"><a class="btn ghost sm" href="${telHref(r.telefono)}">☎ Chiama</a><a class="btn ghost sm" href="${waHref(r.telefono)}" target="_blank" rel="noopener">WhatsApp</a>${r.email ? `<a class="btn ghost sm" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Ape Attiva – la sua richiesta')}">Email</a>` : ''}</div></div>
    <div class="facts"><div><small>Telefono</small>${esc(r.telefono)}</div>${r.email ? `<div><small>Email</small>${esc(r.email)}</div>` : ''}<div><small>Servizio</small>${esc(r.servizio || '—')}</div><div><small>Località</small>${esc(r.localita || '—')}</div>${r.pagina ? `<div><small>Inviata dalla pagina</small>${esc(pagePath(r.pagina))}</div>` : ''}${cli ? `<div><small>Cliente collegato</small><button class="link" data-cliente="${cli.id}">${esc(cli.nome)}</button></div>` : ''}</div>
    <p style="background:var(--cream);padding:14px;border-radius:12px;white-space:pre-wrap;margin:0">${esc(r.messaggio)}</p>
    <div class="form-actions" style="margin-top:20px">
      <button class="btn danger left" data-a="del">Elimina</button>
      ${r.stato !== 'scartata' && r.stato !== 'convertita' ? '<button class="btn ghost" data-a="scarta">Scarta</button>' : ''}
      ${r.stato === 'nuova' ? '<button class="btn ghost" data-a="contattata">Segna come contattata</button>' : ''}
      ${r.stato !== 'convertita' ? '<button class="btn primary" data-a="converti">Crea cliente e lavoro →</button>' : ''}
    </div>`);
  bindRows(b);
  const set = async stato => { try { await q(sb.from('richieste').update({ stato }).eq('id', id)); await loadRichieste(); toast('Richiesta aggiornata'); rerender(); schedaRichiesta(id); } catch (e) { toast(errMsg(e), true); } };
  $('[data-a=contattata]', b)?.addEventListener('click', () => set('contattata'));
  $('[data-a=scarta]', b)?.addEventListener('click', () => set('scartata'));
  $('[data-a=del]', b).onclick = async () => {
    if (!(await confirmBox('Eliminare la richiesta?', `La richiesta di <b>${esc(r.nome)}</b> verrà eliminata definitivamente.`))) return schedaRichiesta(id);
    try { await q(sb.from('richieste').delete().eq('id', id)); await loadRichieste(); toast('Richiesta eliminata'); rerender(); } catch (e) { toast(errMsg(e), true); }
  };
  $('[data-a=converti]', b)?.addEventListener('click', () => {
    const tel = String(r.telefono).replace(/\D/g, '').slice(-9);
    const esiste = S.clienti.find(c => tel.length >= 6 && String(c.telefono || '').replace(/\D/g, '').endsWith(tel));
    formLavoro(null, { richiesta_id: id, servizio: servizioDa(r.servizio), localita: r.localita, descrizione: r.messaggio, titolo: (r.servizio || 'Intervento') + (r.localita ? ' – ' + r.localita : ''),
      ...(esiste ? { cliente_id: esiste.id } : { nuovo_nome: r.nome, nuovo_tel: r.telefono, nuovo_email: r.email, nuovo_fonte: 'sito' }) });
  });
}

/* ================= STATISTICHE ================= */
async function viewStatistiche(el) {
  const f = S.filtri.stat ||= { giorni: 30 };
  const b = topActions(`<div class="seg" id="sp">${[[7, '7 giorni'], [30, '30 giorni'], [90, '3 mesi'], [365, '12 mesi']].map(([g, t]) => `<button data-g="${g}" class="${f.giorni === g ? 'on' : ''}">${t}</button>`).join('')}</div>`);
  $$('button', b).forEach(x => x.onclick = () => { f.giorni = Number(x.dataset.g); rerender(); });
  el.innerHTML = '<div class="empty"><span class="spinner" style="display:inline-block"></span></div>';
  let st;
  try { st = await q(sb.rpc('statistiche_sito', { giorni: f.giorni })); } catch (e) { el.innerHTML = `<div class="empty"><b>Statistiche non disponibili</b>${esc(errMsg(e))}</div>`; return; }
  if (S.view !== 'statistiche') return;
  const delta = (a, b) => { if (!b) return a ? '<span class="delta up">nuovo</span>' : ''; const p = Math.round((a - b) / b * 100); return `<span class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}%</span> vs periodo prec.`; };
  const conv = st.sessioni ? (st.sessioni_con_contatto / st.sessioni * 100) : 0;
  const pct = (a, t) => t ? Math.round(a / t * 100) + '%' : '0%';
  el.innerHTML = `
    <div class="kpis">
      <div class="kpi dark"><small>Sessioni</small><strong>${int(st.sessioni)}</strong><span>${delta(st.sessioni, st.sessioni_prec)}</span></div>
      <div class="kpi"><small>Visitatori unici</small><strong>${int(st.visitatori)}</strong><span>${int(st.nuovi)} nuovi</span></div>
      <div class="kpi"><small>Pagine viste</small><strong>${int(st.visualizzazioni)}</strong><span>${st.sessioni ? (st.visualizzazioni / st.sessioni).toFixed(1).replace('.', ',') : '0'} per sessione</span></div>
      <div class="kpi"><small>Da motori di ricerca</small><strong>${int(st.da_motori)}</strong><span>${pct(st.da_motori, st.sessioni)} delle sessioni</span></div>
      <div class="kpi"><small>Contatti generati</small><strong>${int(st.contatti)}</strong><span>conversione ${conv.toFixed(1).replace('.', ',')}%</span></div>
    </div>
    <div class="panel" style="margin-bottom:16px"><h3>Andamento visite</h3><div class="chart" id="sc"></div></div>
    <div class="panels cols-3">
      <div class="panel"><h3>Da dove arrivano</h3>${hbars(st.sorgenti.map(s => ({ label: SORGENTI[s.nome] || s.nome, n: s.n })))}</div>
      <div class="panel"><h3>Pagine più viste</h3>${hbars(st.pagine.map(p => ({ label: pagePath(p.nome), n: p.n })))}</div>
      <div class="panel"><h3>Cosa fanno i visitatori</h3>${hbars(st.eventi.map(e => ({ label: EVENTI[e.nome] || e.nome, n: e.n })))}</div>
      <div class="panel"><h3>Dispositivi</h3>${hbars(st.dispositivi.map(d => ({ label: DISPOSITIVI[d.nome] || d.nome, n: d.n })))}</div>
      <div class="panel"><h3>Siti di provenienza</h3>${hbars(st.siti_provenienza.map(s => ({ label: s.nome, n: s.n })))}</div>
      <div class="panel"><h3>Orari di visita</h3><div class="chart" id="so"></div></div>
    </div>
    ${st.campagne.length ? `<div class="panel" style="margin-top:16px"><h3>Campagne (UTM)</h3>${hbars(st.campagne.map(c => ({ label: c.nome, n: c.n })))}</div>` : ''}
    <div class="panels cols-2" style="margin-top:16px">
      <div class="panel"><h3>Ultime visite in tempo reale <button class="link" id="sr">↻ Aggiorna</button></h3>
        ${st.ultime.length ? `<div class="list">${st.ultime.map(u => `<div class="list-row" style="cursor:default"><div><strong style="text-decoration:none">${esc(pagePath(u.path))}</strong><span class="sub">${esc(SORGENTI[u.sorgente] || u.sorgente)} · ${esc(DISPOSITIVI[u.dispositivo] || '')}</span></div><div class="r sub">${fmtDT(u.quando)}</div></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Ancora nessuna visita registrata.</p>'}
      </div>
      ${pannelloSEO()}
    </div>`;
  $('#sr').onclick = rerender;

  let serie = st.per_giorno.map(d => ({ d: d.giorno, s: d.sessioni, v: d.visualizzazioni }));
  let label = x => new Date(x + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  let tipT = x => fmtD(x);
  if (f.giorni > 90) { // aggrega per mese
    const m = new Map(); serie.forEach(x => { const k = x.d.slice(0, 7); const o = m.get(k) || { d: k, s: 0, v: 0 }; o.s += x.s; o.v += x.v; m.set(k, o); });
    serie = [...m.values()]; label = k => new Date(k + '-15T12:00').toLocaleDateString('it-IT', { month: 'short' }); tipT = k => new Date(k + '-15T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }
  barChart($('#sc'), serie.map(x => ({ label: label(x.d), value: x.s, tip: `<b>${int(x.s)} sessioni</b>${int(x.v)} pagine viste · ${tipT(x.d)}` })), { height: 240 });
  const ore = Array.from({ length: 24 }, (_, h) => (st.ore.find(o => o.ora === h) || { n: 0 }).n);
  barChart($('#so'), ore.map((n, h) => ({ label: String(h), value: n, tip: `<b>${int(n)} sessioni</b>dalle ${h}:00 alle ${h}:59` })), { height: 170, labelEvery: 6 });
}
function pannelloSEO() {
  const site = CFG.sito, host = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `<div class="panel"><h3>Indicizzazione su Google</h3>
    <div class="checks">
      <div><span class="ok">✓</span><span>Titoli e descrizioni (meta description) presenti su tutte le pagine</span></div>
      <div><span class="ok">✓</span><span>Mappa del sito <a class="link" href="sitemap.xml" target="_blank">sitemap.xml</a> pubblicata (da inviare in Search Console)</span></div>
      <div><span class="ok">✓</span><span>Sito ottimizzato per smartphone e servito in HTTPS</span></div>
      <div><span class="ok">✓</span><span>Area riservata esclusa dai motori di ricerca</span></div>
      <div><span class="todo">!</span><span>Per vedere posizioni, parole cercate e pagine indicizzate collega <b>Google Search Console</b> e invia la sitemap</span></div>
    </div>
    <div class="links-grid">
      <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Google Search Console ↗<span>Posizioni, clic e copertura indice</span></a>
      <a href="https://www.google.com/search?q=site%3A${encodeURIComponent(host)}" target="_blank" rel="noopener">Pagine trovate su Google ↗<span>Ricerca “site:” del dominio</span></a>
      <a href="https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site)}" target="_blank" rel="noopener">Velocità del sito ↗<span>PageSpeed Insights</span></a>
      <a href="https://business.google.com/" target="_blank" rel="noopener">Google Business Profile ↗<span>Scheda su Maps e ricerche locali</span></a>
    </div></div>`;
}

/* ================= IMPOSTAZIONI ================= */
function viewImpostazioni(el) {
  let noTrack = true; try { noTrack = localStorage.getItem('ape_no_track') === '1'; } catch (_) {}
  el.innerHTML = `<div class="panels cols-2">
    <div class="panel"><h3>Cambia password</h3>
      <form id="fpw" novalidate style="display:grid;gap:14px">
        <label>Password attuale<span class="pw"><input type="password" name="old" autocomplete="current-password" required/><button type="button" class="eye" data-eye></button></span></label>
        <label>Nuova password<span class="pw"><input type="password" name="new1" autocomplete="new-password" minlength="8" required/><button type="button" class="eye" data-eye></button></span><span class="hint">Almeno 8 caratteri, meglio se con numeri e lettere maiuscole.</span></label>
        <label>Ripeti nuova password<span class="pw"><input type="password" name="new2" autocomplete="new-password" required/><button type="button" class="eye" data-eye></button></span></label>
        <p class="form-error" hidden></p>
        <div class="form-actions"><button class="btn primary" type="submit">Aggiorna password</button></div>
      </form></div>
    <div class="panels">
      <div class="panel"><h3>Account</h3>
        <div class="facts" style="margin:0"><div><small>Username</small>${esc(S.user.username)}</div><div><small>Ultimo accesso</small>${fmtDT(S.user.last_sign_in_at)}</div></div>
        <div class="form-actions" style="justify-content:flex-start;margin-top:14px"><button class="btn ghost" id="out2">Esci dal CRM</button></div></div>
      <div class="panel"><h3>Statistiche</h3>
        <label style="flex-direction:row;align-items:center;gap:10px;font-weight:600;color:var(--ink)"><input type="checkbox" id="nt" style="width:18px;height:18px"${noTrack ? ' checked' : ''}/> Non conteggiare le mie visite da questo dispositivo</label>
        <p class="hint" style="margin:8px 0 0">Così le tue aperture del sito non falsano i numeri.</p></div>
      <div class="panel"><h3>Esporta dati</h3><p class="hint" style="margin:0 0 12px">File CSV apribili con Excel.</p>
        <div class="quick"><button class="btn ghost sm" data-x="clienti">Clienti</button><button class="btn ghost sm" data-x="lavori">Lavori</button><button class="btn ghost sm" data-x="pagamenti">Pagamenti</button><button class="btn ghost sm" data-x="richieste">Richieste</button></div></div>
    </div></div>`;
  initEyes(el);
  $('#out2').onclick = () => $('#logout').click();
  $('#nt').onchange = e => { try { localStorage.setItem('ape_no_track', e.target.checked ? '1' : '0'); } catch (_) {} toast(e.target.checked ? 'Le tue visite non verranno conteggiate' : 'Le tue visite verranno conteggiate'); };
  $$('[data-x]', el).forEach(btn => btn.onclick = () => esporta(btn.dataset.x));
  $('#fpw').onsubmit = async e => {
    e.preventDefault();
    const f = e.currentTarget, er = $('.form-error', f), btn = $('[type=submit]', f);
    const fail = m => { er.textContent = m; er.hidden = false; btn.disabled = false; btn.textContent = 'Aggiorna password'; };
    er.hidden = true;
    if (!f.old.value) return fail('Inserisci la password attuale.');
    if (f.new1.value.length < 8) return fail('La nuova password deve avere almeno 8 caratteri.');
    if (f.new1.value !== f.new2.value) return fail('Le due nuove password non coincidono.');
    if (f.new1.value === f.old.value) return fail('La nuova password è uguale a quella attuale.');
    btn.disabled = true; btn.textContent = 'Verifica…';
    const chk = await sb.auth.signInWithPassword({ email: S.user.email, password: f.old.value });
    if (chk.error) return fail('La password attuale non è corretta.');
    const { error } = await sb.auth.updateUser({ password: f.new1.value });
    if (error) return fail(/weak|short|least/i.test(error.message) ? 'Password troppo debole: usa almeno 8 caratteri con lettere e numeri.' : errMsg(error));
    f.reset(); btn.disabled = false; btn.textContent = 'Aggiorna password'; initEyes(f);
    toast('Password aggiornata ✓');
  };
}
async function esporta(tipo) {
  try {
    const cols = {
      clienti: ['nome', 'tipo', 'referente', 'telefono', 'email', 'indirizzo', 'comune', 'provincia', 'cap', 'codice_fiscale', 'partita_iva', 'pec', 'codice_sdi', 'fonte', 'note', 'created_at'],
      lavori: ['titolo', 'cliente_nome', 'servizio', 'stato', 'localita', 'data_preventivo', 'data_inizio', 'data_fine', 'imponibile', 'iva_percentuale', 'totale', 'acconti', 'incassato', 'residuo', 'descrizione', 'note'],
      pagamenti: ['data', 'lavoro', 'cliente', 'tipo', 'importo', 'metodo', 'note'],
      richieste: ['created_at', 'nome', 'telefono', 'email', 'servizio', 'localita', 'messaggio', 'stato']
    }[tipo];
    let rows;
    if (tipo === 'clienti') rows = S.clienti;
    else if (tipo === 'lavori') rows = S.lavori;
    else if (tipo === 'richieste') rows = S.richieste;
    else rows = (await q(sb.from('pagamenti').select('*').order('data'))).map(p => { const l = S.lavori.find(x => x.id === p.lavoro_id) || {}; return { ...p, lavoro: l.titolo, cliente: l.cliente_nome }; });
    const cell = v => { let s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); if (/^-?\d+(\.\d+)?$/.test(s) && typeof v === 'string' && v.includes('.')) s = s.replace('.', ','); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => cell(r[c])).join(';'))].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `apeattiva-${tipo}-${today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
    toast(`Esportati ${rows.length} record`);
  } catch (e) { toast(errMsg(e), true); }
}

/* ---------------- Avvio ---------------- */
(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session?.user) showApp(data.session.user); else showLogin();
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' && S.user) { S.user = null; showLogin(); } });
})();
})();
