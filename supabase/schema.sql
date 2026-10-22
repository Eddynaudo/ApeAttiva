-- =====================================================================
-- Ape Attiva · CRM — schema database (Supabase / Postgres)
-- Accesso ai dati: solo utenti presenti in public.admins.
-- Il sito pubblico (anon) può soltanto INSERIRE visite, eventi e richieste.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Amministratori ----------
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy admins_self_read on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- updated_at automatico ----------
create or replace function public.tocca_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

-- ---------- Clienti ----------
create table public.clienti (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null default 'privato' check (tipo in ('privato','azienda','ente')),
  nome           text not null check (char_length(nome) between 1 and 200),
  referente      text,
  telefono       text,
  email          text,
  indirizzo      text,
  comune         text,
  provincia      text,
  cap            text,
  codice_fiscale text,
  partita_iva    text,
  pec            text,
  codice_sdi     text,
  fonte          text not null default 'altro'
                 check (fonte in ('sito','whatsapp','telefono','passaparola','social','altro')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger clienti_updated before update on public.clienti
  for each row execute function public.tocca_updated_at();

-- ---------- Lavori ----------
create table public.lavori (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clienti(id) on delete cascade,
  titolo           text not null check (char_length(titolo) between 1 and 200),
  servizio         text not null default 'altro'
                   check (servizio in ('terreni','esterni','giardini','manutenzione','altro')),
  descrizione      text,
  localita         text,
  stato            text not null default 'preventivo'
                   check (stato in ('preventivo','accettato','in_corso','completato','annullato')),
  data_preventivo  date default current_date,
  data_inizio      date,
  data_fine        date,
  imponibile       numeric(12,2) not null default 0 check (imponibile >= 0),
  iva_percentuale  numeric(5,2)  not null default 22 check (iva_percentuale between 0 and 100),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lavori_cliente_idx on public.lavori(cliente_id);
create trigger lavori_updated before update on public.lavori
  for each row execute function public.tocca_updated_at();

-- ---------- Pagamenti (acconti / saldo) ----------
create table public.pagamenti (
  id         uuid primary key default gen_random_uuid(),
  lavoro_id  uuid not null references public.lavori(id) on delete cascade,
  tipo       text not null default 'acconto' check (tipo in ('acconto','saldo','altro')),
  importo    numeric(12,2) not null check (importo > 0),
  data       date not null default current_date,
  metodo     text not null default 'bonifico'
             check (metodo in ('bonifico','contanti','assegno','carta','altro')),
  note       text,
  created_at timestamptz not null default now()
);
create index pagamenti_lavoro_idx on public.pagamenti(lavoro_id);

-- Riepilogo economico per lavoro (rispetta la RLS di chi interroga)
create view public.lavori_riepilogo with (security_invoker = true) as
select l.*,
       c.nome as cliente_nome,
       round(l.imponibile * (1 + l.iva_percentuale / 100), 2)                         as totale,
       coalesce(p.incassato, 0)                                                       as incassato,
       coalesce(p.acconti, 0)                                                         as acconti,
       round(l.imponibile * (1 + l.iva_percentuale / 100), 2) - coalesce(p.incassato,0) as residuo,
       p.ultimo_pagamento
from public.lavori l
join public.clienti c on c.id = l.cliente_id
left join (
  select lavoro_id,
         sum(importo)                                  as incassato,
         sum(importo) filter (where tipo = 'acconto')  as acconti,
         max(data)                                     as ultimo_pagamento
  from public.pagamenti group by lavoro_id
) p on p.lavoro_id = l.id;

-- ---------- Richieste dal modulo del sito ----------
create table public.richieste (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 150),
  telefono   text not null check (char_length(telefono) between 3 and 40),
  email      text check (email is null or char_length(email) <= 200),
  servizio   text check (servizio is null or char_length(servizio) <= 150),
  localita   text check (localita is null or char_length(localita) <= 150),
  messaggio  text not null check (char_length(messaggio) between 1 and 4000),
  pagina     text check (pagina is null or char_length(pagina) <= 300),
  stato      text not null default 'nuova' check (stato in ('nuova','contattata','convertita','scartata')),
  cliente_id uuid references public.clienti(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Statistiche di navigazione ----------
create table public.visite (
  id           bigint generated always as identity primary key,
  session_id   text not null check (char_length(session_id) between 8 and 64),
  visitor_id   text not null check (char_length(visitor_id) between 8 and 64),
  nuovo        boolean not null default false,
  path         text not null check (char_length(path) <= 300),
  titolo       text check (titolo is null or char_length(titolo) <= 300),
  referrer     text check (referrer is null or char_length(referrer) <= 500),
  sorgente     text not null default 'diretto'
               check (sorgente in ('diretto','google','bing','altri_motori','facebook','instagram','whatsapp','altri_siti','campagna')),
  utm_source   text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium   text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 100),
  dispositivo  text not null default 'desktop' check (dispositivo in ('mobile','tablet','desktop')),
  lingua       text check (lingua is null or char_length(lingua) <= 20),
  created_at   timestamptz not null default now()
);
create index visite_created_idx on public.visite(created_at);

create table public.eventi (
  id         bigint generated always as identity primary key,
  session_id text not null check (char_length(session_id) between 8 and 64),
  tipo       text not null check (tipo in ('click_telefono','click_whatsapp','click_email','invio_modulo','apri_servizio','click_social')),
  path       text check (path is null or char_length(path) <= 300),
  dettaglio  text check (dettaglio is null or char_length(dettaglio) <= 200),
  created_at timestamptz not null default now()
);
create index eventi_created_idx on public.eventi(created_at);

-- ---------- Sicurezza (RLS) ----------
alter table public.clienti   enable row level security;
alter table public.lavori    enable row level security;
alter table public.pagamenti enable row level security;
alter table public.richieste enable row level security;
alter table public.visite    enable row level security;
alter table public.eventi    enable row level security;

create policy clienti_admin   on public.clienti   for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy lavori_admin    on public.lavori    for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy pagamenti_admin on public.pagamenti for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy richieste_admin on public.richieste for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy visite_admin    on public.visite    for select to authenticated using ((select public.is_admin()));
create policy eventi_admin    on public.eventi    for select to authenticated using ((select public.is_admin()));
create policy visite_delete   on public.visite    for delete to authenticated using ((select public.is_admin()));
create policy eventi_delete   on public.eventi    for delete to authenticated using ((select public.is_admin()));

-- Il sito pubblico può solo scrivere (mai leggere)
create policy richieste_pubbliche on public.richieste for insert to anon
  with check (stato = 'nuova' and cliente_id is null);
create policy visite_pubbliche on public.visite for insert to anon with check (true);
create policy eventi_pubblici  on public.eventi for insert to anon with check (true);

revoke all on public.clienti, public.lavori, public.pagamenti, public.richieste,
              public.visite, public.eventi, public.lavori_riepilogo, public.admins from anon;
grant insert on public.richieste, public.visite, public.eventi to anon;
grant select, insert, update, delete on public.clienti, public.lavori, public.pagamenti, public.richieste to authenticated;
grant select, delete on public.visite, public.eventi to authenticated;
grant select on public.lavori_riepilogo, public.admins to authenticated;

-- ---------- Statistiche aggregate per il pannello ----------
create or replace function public.statistiche_sito(giorni int default 30)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare
  dal timestamptz := date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome'
                     - make_interval(days => greatest(giorni, 1) - 1);
  dal_prec timestamptz := dal - make_interval(days => greatest(giorni, 1));
  res jsonb;
begin
  if not public.is_admin() then raise exception 'non autorizzato'; end if;

  with v as (select * from public.visite where created_at >= dal),
       vp as (select * from public.visite where created_at >= dal_prec and created_at < dal),
       e as (select * from public.eventi where created_at >= dal)
  select jsonb_build_object(
    'dal', dal,
    'visualizzazioni', (select count(*) from v),
    'sessioni',        (select count(distinct session_id) from v),
    'visitatori',      (select count(distinct visitor_id) from v),
    'nuovi',           (select count(distinct visitor_id) from v where nuovo),
    'sessioni_prec',   (select count(distinct session_id) from vp),
    'visualizzazioni_prec', (select count(*) from vp),
    'da_motori',       (select count(distinct session_id) from v where sorgente in ('google','bing','altri_motori')),
    'contatti',        (select count(*) from e where tipo in ('click_telefono','click_whatsapp','click_email','invio_modulo')),
    'sessioni_con_contatto', (select count(distinct session_id) from e where tipo in ('click_telefono','click_whatsapp','click_email','invio_modulo')),
    'per_giorno', coalesce((
        select jsonb_agg(jsonb_build_object('giorno', g.giorno, 'sessioni', g.sessioni, 'visualizzazioni', g.viste) order by g.giorno)
        from (
          select d::date as giorno,
                 (select count(distinct session_id) from v where (v.created_at at time zone 'Europe/Rome')::date = d::date) as sessioni,
                 (select count(*) from v where (v.created_at at time zone 'Europe/Rome')::date = d::date) as viste
          from generate_series((dal at time zone 'Europe/Rome')::date, (now() at time zone 'Europe/Rome')::date, interval '1 day') d
        ) g), '[]'::jsonb),
    'sorgenti', coalesce((select jsonb_agg(jsonb_build_object('nome', sorgente, 'n', n) order by n desc)
        from (select sorgente, count(distinct session_id) n from v group by sorgente) s), '[]'::jsonb),
    'pagine', coalesce((select jsonb_agg(jsonb_build_object('nome', path, 'titolo', titolo, 'n', n) order by n desc)
        from (select path, max(titolo) titolo, count(*) n from v group by path order by n desc limit 10) s), '[]'::jsonb),
    'dispositivi', coalesce((select jsonb_agg(jsonb_build_object('nome', dispositivo, 'n', n) order by n desc)
        from (select dispositivo, count(distinct session_id) n from v group by dispositivo) s), '[]'::jsonb),
    'siti_provenienza', coalesce((select jsonb_agg(jsonb_build_object('nome', host, 'n', n) order by n desc)
        from (select substring(referrer from '^https?://([^/:?#]+)') host, count(distinct session_id) n
              from v where referrer is not null and referrer <> '' group by 1 order by n desc limit 8) s
        where host is not null), '[]'::jsonb),
    'campagne', coalesce((select jsonb_agg(jsonb_build_object('nome', c, 'n', n) order by n desc)
        from (select concat_ws(' / ', utm_source, utm_medium, utm_campaign) c, count(distinct session_id) n
              from v where utm_source is not null group by 1 order by n desc limit 8) s), '[]'::jsonb),
    'eventi', coalesce((select jsonb_agg(jsonb_build_object('nome', tipo, 'n', n) order by n desc)
        from (select tipo, count(*) n from e group by tipo) s), '[]'::jsonb),
    'ore', coalesce((select jsonb_agg(jsonb_build_object('ora', h, 'n', n) order by h)
        from (select extract(hour from created_at at time zone 'Europe/Rome')::int h, count(distinct session_id) n
              from v group by 1) s), '[]'::jsonb),
    'ultime', coalesce((select jsonb_agg(x order by x->>'quando' desc)
        from (select jsonb_build_object('quando', created_at, 'path', path, 'sorgente', sorgente, 'dispositivo', dispositivo) x
              from public.visite order by created_at desc limit 15) s), '[]'::jsonb)
  ) into res;
  return res;
end $$;
revoke execute on function public.statistiche_sito(int) from public, anon;
grant execute on function public.statistiche_sito(int) to authenticated;
