/* Ape Attiva · campo località con ricerca tra i comuni italiani (ISTAT, 7.896 comuni)
   Uso: <input data-comuni ...>  — il testo libero resta sempre ammesso. */
(() => {
  'use strict';
  const LIGURIA = ['GE', 'SP', 'SV', 'IM'];
  const MAX = 8;
  let dati = null, carico = null, uid = 0;
  const BASE = (document.currentScript && document.currentScript.src) || location.href;

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`\-\/.]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function carica() {
    if (dati) return Promise.resolve(dati);
    if (!carico) {
      carico = fetch(new URL('comuni.txt?v=2024', BASE))
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(t => (dati = t.trim().split('\n').map(r => { const [nome, pr] = r.split('|'); return { nome, pr, n: norm(nome), parole: norm(nome).split(' ') }; })))
        .catch(e => { carico = null; throw e; });
    }
    return carico;
  }

  function cerca(q) {
    const nq = norm(q.replace(/\s*\([A-Za-z]{2}\)\s*$/, ''));
    if (!nq) return [];
    const res = [];
    for (const c of dati) {
      let score = -1;
      if (c.n === nq) score = 0;
      else if (c.n.startsWith(nq)) score = 1;
      else if (c.parole.some(p => p.startsWith(nq))) score = 2;
      else if (nq.length >= 3 && c.n.includes(nq)) score = 3;
      if (score < 0) continue;
      res.push({ c, s: score * 2 + (LIGURIA.includes(c.pr) ? 0 : 1) });
    }
    res.sort((a, b) => a.s - b.s || a.c.nome.localeCompare(b.c.nome, 'it'));
    return res.slice(0, MAX).map(r => r.c);
  }

  function evidenzia(nome, q) {
    const nq = norm(q), nn = norm(nome);
    let i = nn.startsWith(nq) ? 0 : nn.indexOf(' ' + nq) + 1 || nn.indexOf(nq);
    if (!nq || i < 0) return esc(nome);
    // normalize preserva la lunghezza per lettere accentate singole: mappa diretta
    return esc(nome.slice(0, i)) + '<b>' + esc(nome.slice(i, i + nq.length)) + '</b>' + esc(nome.slice(i + nq.length));
  }

  const CSS = `.cb{position:relative;display:block}.cb-list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);margin:0;padding:6px;list-style:none;background:#fff;border:1px solid #d9e2d7;border-radius:12px;box-shadow:0 14px 34px #16382124;max-height:300px;overflow:auto}
.cb-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;cursor:pointer;font-size:.92rem;font-weight:400;color:#233127}
.cb-list li b{font-weight:800;color:#183b2b}.cb-list li small{font-size:.72rem;font-weight:800;letter-spacing:.06em;color:#718f61;background:#eef3ea;padding:2px 7px;border-radius:6px}
.cb-list li[aria-selected=true],.cb-list li:hover{background:#eef3ea}.cb-list .cb-note{cursor:default;color:#66716a;font-size:.82rem}.cb-list .cb-note:hover{background:none}`;

  function setup(input) {
    if (input.dataset.cbReady) return;
    input.dataset.cbReady = '1';
    if (!document.getElementById('cb-css')) { const st = document.createElement('style'); st.id = 'cb-css'; st.textContent = CSS; document.head.appendChild(st); }
    const wrap = document.createElement('span'); wrap.className = 'cb';
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    const list = document.createElement('ul'); const id = 'cb-list-' + (++uid);
    list.id = id; list.className = 'cb-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    wrap.appendChild(list);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', id);
    input.setAttribute('autocomplete', 'off');
    if (!input.placeholder) input.placeholder = 'Inizia a scrivere il comune…';

    let items = [], active = -1;
    const chiudi = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
    const scegli = c => { input.value = `${c.nome} (${c.pr})`; chiudi(); input.dispatchEvent(new Event('change', { bubbles: true })); };
    const attiva = i => {
      active = i;
      [...list.querySelectorAll('[role=option]')].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
      const li = list.querySelector(`#${id}-${i}`);
      if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    };
    const disegna = () => {
      const q = input.value;
      if (!norm(q) || !dati) return chiudi();
      items = cerca(q);
      if (items.length === 1 && `${items[0].nome} (${items[0].pr})` === q) return chiudi();
      list.innerHTML = items.length
        ? items.map((c, i) => `<li role="option" id="${id}-${i}" aria-selected="false" data-i="${i}"><span>${evidenzia(c.nome, q)}</span><small>${c.pr}</small></li>`).join('')
        : '<li class="cb-note">Nessun comune trovato: puoi scrivere la località liberamente.</li>';
      list.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
    };
    const avvia = () => carica().then(disegna).catch(() => {});
    input.addEventListener('focus', avvia, { once: false });
    input.addEventListener('input', () => (dati ? disegna() : avvia()));
    input.addEventListener('keydown', e => {
      if (list.hidden) { if (e.key === 'ArrowDown' && dati) { disegna(); e.preventDefault(); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) attiva((active + 1) % items.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) attiva((active - 1 + items.length) % items.length); }
      else if (e.key === 'Enter') { if (active >= 0 && items[active]) { e.preventDefault(); scegli(items[active]); } else chiudi(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); chiudi(); }
      else if (e.key === 'Tab') chiudi();
    });
    list.addEventListener('mousedown', e => { e.preventDefault(); const li = e.target.closest('[data-i]'); if (li) scegli(items[+li.dataset.i]); });
    input.addEventListener('blur', () => setTimeout(chiudi, 120));
  }

  const scan = (root = document) => root.querySelectorAll('input[data-comuni]').forEach(setup);
  window.ApeComuni = { scan, setup };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan()); else scan();
})();
