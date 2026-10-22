-- Ape Attiva · notifiche push (già applicato sul progetto Supabase)
-- I segreti sono nel Vault di Supabase e NON sono salvati in questo repository:
--   push_hook_secret (generato nel database), vapid_public, vapid_private
create extension if not exists pg_net with schema extensions;

create table public.push_iscrizioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  dispositivo text check (dispositivo is null or char_length(dispositivo) <= 200),
  notifica_richieste boolean not null default true,
  notifica_contatti boolean not null default false,
  created_at timestamptz not null default now(),
  ultimo_invio timestamptz
);
alter table public.push_iscrizioni enable row level security;
create policy push_admin on public.push_iscrizioni for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()))
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
revoke all on public.push_iscrizioni from anon;
grant select, insert, update, delete on public.push_iscrizioni to authenticated;

-- select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'push_hook_secret');
-- select vault.create_secret('<VAPID_PUBLIC>', 'vapid_public');
-- select vault.create_secret('<VAPID_PRIVATE>', 'vapid_private');

create or replace function public.config_push() returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
      where name in ('push_hook_secret','vapid_public','vapid_private') $$;
revoke execute on function public.config_push() from public, anon, authenticated;
grant execute on function public.config_push() to service_role;

create or replace function public.notifica_push() returns trigger language plpgsql security definer set search_path = ''
as $$
declare sec text;
begin
  select decrypted_secret into sec from vault.decrypted_secrets where name = 'push_hook_secret';
  perform net.http_post(
    url := 'https://tyeqggijpreeoysfcfws.supabase.co/functions/v1/notifica',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',sec),
    body := jsonb_build_object('tipo', tg_table_name, 'record', to_jsonb(new)),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $$;
revoke execute on function public.notifica_push() from public, anon, authenticated;

create trigger richieste_notifica after insert on public.richieste for each row execute function public.notifica_push();
create trigger eventi_notifica after insert on public.eventi for each row
  when (new.tipo in ('click_telefono','click_whatsapp')) execute function public.notifica_push();
