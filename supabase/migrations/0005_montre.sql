-- ============================================================
-- Montre : boîte de dépôt des mesures du matin (Raccourci iOS).
--
-- Un Raccourci de l'iPhone lit chaque matin dans Santé la nuit, la
-- fréquence cardiaque au repos et la variabilité cardiaque, et les envoie
-- ici. Il n'a pas de session Supabase : il présente une clé personnelle,
-- créée dans l'app, dont le serveur ne garde que l'empreinte SHA-256.
--
-- Le dépôt passe par une seule porte, deposer_mesures_montre() :
--   - clé inconnue, ou compte non approuvé : refus ;
--   - texte vide ou de plus de 60 000 caractères : refus ;
--   - plus de 12 dépôts dans l'heure pour un même compte : refus ;
--   - les dépôts de plus de 30 jours sont effacés à chaque nouveau dépôt.
-- La fonction n'écrit que dans la boîte du compte de la clé. Elle ne
-- touche pas à profiles.phys : c'est l'app qui relève la boîte et range
-- les mesures, avec sa file d'envoi et sa détection de conflits — un
-- serveur qui écrirait dans phys pendant que l'app compose la même
-- colonne ferait perdre l'une des deux écritures.
--
-- Côté client (clé de session) : chacun lit et efface ses dépôts, crée,
-- remplace ou supprime sa clé. Personne n'insère directement de dépôt.
-- Le rôle anonyme ne voit aucune des deux tables.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists jetons_montre (
  user_id uuid primary key references auth.users(id) on delete cascade,
  jeton_hash text not null unique check (jeton_hash ~ '^[0-9a-f]{64}$'),
  cree_le timestamptz not null default now(),
  dernier_depot timestamptz
);

create table if not exists depots_montre (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  recu_le timestamptz not null default now(),
  texte text not null check (char_length(texte) between 1 and 60000)
);
create index if not exists depots_montre_user_recu on depots_montre (user_id, recu_le);

alter table jetons_montre enable row level security;
alter table depots_montre enable row level security;

revoke all on jetons_montre from anon;
revoke all on depots_montre from anon;
revoke insert, update on depots_montre from authenticated;

drop policy if exists "jetons_montre_own" on jetons_montre;
create policy "jetons_montre_own" on jetons_montre
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  ) with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

drop policy if exists "depots_montre_select_own" on depots_montre;
create policy "depots_montre_select_own" on depots_montre
  for select using (auth.uid() = user_id);

drop policy if exists "depots_montre_delete_own" on depots_montre;
create policy "depots_montre_delete_own" on depots_montre
  for delete using (auth.uid() = user_id);

create or replace function deposer_mesures_montre(jeton text, texte text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
  recents int;
begin
  if jeton is null or char_length(jeton) < 32 or char_length(jeton) > 128 then
    raise exception 'clé invalide' using errcode = '28000';
  end if;
  if texte is null or char_length(texte) = 0 or char_length(texte) > 60000 then
    raise exception 'texte vide ou trop long' using errcode = '22023';
  end if;

  select j.user_id into uid
  from jetons_montre j
  join profiles p on p.id = j.user_id and p.status = 'approved'
  where j.jeton_hash = encode(extensions.digest(jeton, 'sha256'), 'hex');
  if uid is null then
    raise exception 'clé inconnue' using errcode = '28000';
  end if;

  select count(*) into recents
  from depots_montre
  where user_id = uid and recu_le > now() - interval '1 hour';
  if recents >= 12 then
    raise exception 'trop de dépôts, réessaie dans une heure' using errcode = '54000';
  end if;

  delete from depots_montre where user_id = uid and recu_le < now() - interval '30 days';
  insert into depots_montre (user_id, texte) values (uid, texte);
  update jetons_montre set dernier_depot = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'recu_le', now());
end;
$$;

revoke all on function deposer_mesures_montre(text, text) from public;
grant execute on function deposer_mesures_montre(text, text) to anon, authenticated;
