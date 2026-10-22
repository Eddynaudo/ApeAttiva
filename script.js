(() => {
  'use strict';
  const CFG = window.APE_CONFIG || {};
  const $ = id => document.getElementById(id);

  /* ---------- Menu mobile ---------- */
  const toggle = $('menu'), links = $('links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '×' : '☰';
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = '☰';
    }));
  }

  /* ---------- Preselezione servizio nel modulo ---------- */
  const service = $('service');
  document.querySelectorAll('[data-service]').forEach(a => a.addEventListener('click', () => {
    if (service) service.value = a.dataset.service;
    else try { sessionStorage.setItem('ape_servizio', a.dataset.service); } catch (_) {}
  }));
  if (service) try { const s = sessionStorage.getItem('ape_servizio'); if (s) { service.value = s; sessionStorage.removeItem('ape_servizio'); } } catch (_) {}

  const year = $('year'); if (year) year.textContent = new Date().getFullYear();

  /* ---------- Statistiche di navigazione (anonime, senza cookie) ---------- */
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 24);
  const store = (s, k, v) => { try { if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (_) { return null; } };
  let noTrack = false; try { noTrack = localStorage.getItem('ape_no_track') === '1' || navigator.webdriver; } catch (_) {}
  const canSend = CFG.url && CFG.key && !noTrack;

  let visitor = store(localStorage, 'ape_vid'), nuovo = false;
  if (!visitor) { visitor = rid(); nuovo = true; store(localStorage, 'ape_vid', visitor); }
  let session = store(sessionStorage, 'ape_sid');
  const last = Number(store(sessionStorage, 'ape_last') || 0);
  if (!session || Date.now() - last > 30 * 60 * 1000) { session = rid(); store(sessionStorage, 'ape_sid', session); store(sessionStorage, 'ape_first', '1'); }
  store(sessionStorage, 'ape_last', String(Date.now()));

  const post = (table, body, keepalive = false) => fetch(`${CFG.url}/rest/v1/${table}`, {
    method: 'POST', keepalive,
    headers: { apikey: CFG.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body)
  });
  const path = (location.pathname.replace(/^.*\//, '/') || '/').slice(0, 300);

  function sorgente(ref, utm) {
    if (utm) return 'campagna';
    if (!ref) return 'diretto';
    let h = ''; try { h = new URL(ref).hostname.replace(/^www\./, ''); } catch (_) { return 'altri_siti'; }
    if (h === location.hostname) return 'diretto';
    if (/(^|\.)google\./.test(h)) return 'google';
    if (/(^|\.)bing\.com$/.test(h)) return 'bing';
    if (/(duckduckgo|yahoo|ecosia|qwant|yandex|baidu|startpage)\./.test(h)) return 'altri_motori';
    if (/(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)$/.test(h)) return 'facebook';
    if (/instagram\.com$/.test(h)) return 'instagram';
    if (/(whatsapp\.com|wa\.me)$/.test(h)) return 'whatsapp';
    return 'altri_siti';
  }
  function dispositivo() {
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
    return /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  }

  if (canSend) {
    const p = new URLSearchParams(location.search);
    const utm = k => (p.get('utm_' + k) || '').slice(0, 100) || null;
    // il referrer conta solo per la prima pagina della sessione
    const first = store(sessionStorage, 'ape_first') === '1';
    store(sessionStorage, 'ape_first', '0');
    const ref = first && document.referrer && !document.referrer.includes(location.hostname) ? document.referrer.slice(0, 500) : null;
    const src = first ? sorgente(ref, utm('source')) : (store(sessionStorage, 'ape_src') || 'diretto');
    if (first) store(sessionStorage, 'ape_src', src);
    post('visite', {
      session_id: session, visitor_id: visitor, nuovo, path, titolo: document.title.slice(0, 300), referrer: ref, sorgente: src,
      utm_source: utm('source'), utm_medium: utm('medium'), utm_campaign: utm('campaign'),
      dispositivo: dispositivo(), lingua: (navigator.language || '').slice(0, 20) || null
    }).catch(() => {});
  }
  const evento = (tipo, dettaglio) => { if (canSend) post('eventi', { session_id: session, tipo, path, dettaglio: dettaglio ? String(dettaglio).slice(0, 200) : null }, true).catch(() => {}); };

  document.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const h = a.getAttribute('href') || '';
    if (h.startsWith('tel:')) evento('click_telefono', h.slice(4));
    else if (h.includes('wa.me')) evento('click_whatsapp', a.textContent.trim());
    else if (h.startsWith('mailto:')) evento('click_email');
    else if (a.closest('.social')) evento('click_social', a.getAttribute('aria-label'));
    else if (a.classList.contains('detail-trigger')) evento('apri_servizio', h);
  });

  /* ---------- Modulo contatti → CRM ---------- */
  const form = $('contact-form');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form), fb = $('feedback'), btn = form.querySelector('button[type=submit]');
    const v = k => (String(d.get(k) || '').trim() || null);
    const rec = { nome: v('name'), telefono: v('phone'), email: v('email'), servizio: v('service'), localita: v('location'), messaggio: v('message'), pagina: path };
    const mailto = () => {
      const body = `Buongiorno Ape Attiva,\n\nNome: ${rec.nome}\nTelefono: ${rec.telefono}\nEmail: ${rec.email || 'Non indicata'}\nServizio: ${rec.servizio}\nLocalità: ${rec.localita || 'Non indicata'}\n\nDescrizione:\n${rec.messaggio}\n\nGrazie.`;
      location.href = `mailto:info@apeattiva.it?subject=${encodeURIComponent('Richiesta Ape Attiva: ' + rec.servizio)}&body=${encodeURIComponent(body)}`;
    };
    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Invio in corso…';
    try {
      if (!CFG.url) throw new Error('config');
      const r = await post('richieste', rec);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.reset();
      fb.textContent = 'Grazie! La tua richiesta è stata inviata: ti ricontatteremo al più presto.';
      fb.hidden = false;
      evento('invio_modulo', rec.servizio);
    } catch (_) {
      fb.textContent = 'Invio non riuscito: si apre la tua app email con il messaggio pronto, oppure scrivici su WhatsApp.';
      fb.hidden = false;
      mailto();
    } finally { btn.disabled = false; btn.textContent = label; }
  });
})();
