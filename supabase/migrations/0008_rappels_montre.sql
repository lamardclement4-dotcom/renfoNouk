-- ============================================================
-- Rappels dans les notifications du raccourci « Envoyer ma nuit ».
--
-- Le raccourci tourne à heures fixes (réveil, 13 h, 20 h) et affiche la
-- réponse du serveur. Cette réponse porte désormais, en plus de l'accusé
-- d'envoi, le rappel du moment :
--   - matin (4 h – 11 h)      : la forme du jour ;
--   - midi (11 h – 15 h)      : la séance prévue, avec la forme ;
--   - après-midi (13 h – 18 h): l'eau bue face à la cible ;
--   - soir (18 h – minuit)    : l'heure du coucher conseillée.
--
-- Le site prépare ces rappels à chaque ouverture (preparer_rappels_montre)
-- avec ses propres calculs : la forme du jour, la séance, la cible d'eau,
-- le coucher. Deux choses ne sont connues qu'au moment de l'envoi :
--   - la nuit qui vient de finir : le site fournit la forme pour chaque
--     durée de nuit possible (« bandes »), et le serveur prend celle de la
--     nuit reçue, mesurée ici sur les segments de sommeil ;
--   - l'eau bue : lue en direct dans nutrition_logs du jour.
-- Chaque rappel n'est envoyé qu'une fois.
--
-- Corrige aussi la réponse en texte simple (domaine « text/plain », voir
-- plus bas) : sans lui, le raccourci recevait une erreur 406. Les heures sont celles de
-- l'iPhone : le site les écrit avec leur décalage horaire.
-- ============================================================

create table if not exists rappels_montre (
  user_id uuid not null references auth.users(id) on delete cascade,
  jour date not null,
  moment text not null check (moment in ('matin', 'midi', 'apresmidi', 'soir')),
  debut timestamptz not null,
  fin timestamptz not null,
  texte text not null check (char_length(texte) between 1 and 600),
  bandes jsonb,
  cible_eau int check (cible_eau is null or cible_eau between 500 and 8000),
  resume text,
  envoye_le timestamptz,
  maj_le timestamptz not null default now(),
  primary key (user_id, jour, moment)
);

alter table rappels_montre enable row level security;
revoke all on rappels_montre from anon;

drop policy if exists "rappels_montre_own" on rappels_montre;
create policy "rappels_montre_own" on rappels_montre
  for all using (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  ) with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and status = 'approved')
  );

-- Le site remplace d'un coup les rappels pas encore envoyés : ceux déjà
-- partis ne sont jamais réécrits (un rappel ne part qu'une fois).
create or replace function preparer_rappels_montre(lignes jsonb)
returns int
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then
    raise exception 'session requise' using errcode = '28000';
  end if;
  if jsonb_typeof(lignes) <> 'array' or jsonb_array_length(lignes) > 16 then
    raise exception 'rappels invalides' using errcode = '22023';
  end if;
  delete from rappels_montre where user_id = uid and (jour < current_date - 2 or envoye_le is null);
  insert into rappels_montre (user_id, jour, moment, debut, fin, texte, bandes, cible_eau)
  select uid, (l->>'jour')::date, l->>'moment', (l->>'debut')::timestamptz, (l->>'fin')::timestamptz,
         l->>'texte', l->'bandes', (l->>'cible_eau')::int
  from jsonb_array_elements(lignes) as l
  where not exists (
    select 1 from rappels_montre r
    where r.user_id = uid and r.jour = (l->>'jour')::date and r.moment = l->>'moment'
  );
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function preparer_rappels_montre(jsonb) from public;
grant execute on function preparer_rappels_montre(jsonb) to authenticated;

-- Une date telle que l'iPhone l'écrit (ISO 8601, « 14 oct. 2026 à 23:14 »,
-- « 14/10/2026 23:14 », « Oct 14, 2026 at 11:14 PM ») → horodatage sans
-- fuseau. Seules les différences servent (durée d'une nuit) ; null si
-- illisible.
create or replace function instant_montre(t text)
returns timestamp
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  s text := translate(lower(trim(coalesce(t, ''))), 'éèêëàâäîïôöûüç', 'eeeeaaaiioouuc');
  m text[];
  mo int;
  h int;
  noms text[] := array['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aou', 'sep', 'oct', 'nov', 'dec'];
  noms_en text[] := array['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
begin
  m := regexp_match(s, '^(\d{4})-(\d{2})-(\d{2})[ t](\d{2}):(\d{2})');
  if m is not null then
    return make_timestamp(m[1]::int, m[2]::int, m[3]::int, m[4]::int, m[5]::int, 0);
  end if;
  m := regexp_match(s, '^(\d{1,2})[ /.-]+([a-z]+\.?|\d{1,2})[ /.-]+(\d{4})(?:\s*(?:a|,|at))?\s+(\d{1,2})[:h](\d{2})(?::\d{2})?(?:\s*(am|pm))?');
  if m is null then
    m := regexp_match(s, '^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s*(?:at|,))?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?');
    if m is null then return null; end if;
    m := array[m[2], m[1], m[3], m[4], m[5], m[6]];
  end if;
  if m[2] ~ '^\d' then
    mo := m[2]::int;
  else
    -- « juin » et « juil » avant « jui… » ; trois lettres sinon.
    mo := coalesce(
      array_position(noms, case when left(m[2], 4) in ('juin', 'juil') then left(m[2], 4) else left(m[2], 3) end),
      array_position(noms_en, left(m[2], 3)));
  end if;
  if mo is null then return null; end if;
  h := m[4]::int;
  if m[6] = 'pm' and h < 12 then h := h + 12; end if;
  if m[6] = 'am' and h = 12 then h := 0; end if;
  return make_timestamp(m[3]::int, mo, m[1]::int, h, m[5]::int, 0);
exception when others then
  return null;
end;
$$;

-- Minutes de sommeil d'une liste de segments (débuts, fins, valeurs) :
-- segments endormis seulement (ni « au lit » ni « éveillé »), fusionnés
-- quand ils se chevauchent.
create or replace function minutes_sommeil_montre(a text[], b text[], v text[])
returns int
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  r record;
  fin_courante timestamp;
  total double precision := 0;
begin
  for r in
    select instant_montre(a[i]) as d, instant_montre(b[i]) as f
    from generate_subscripts(a, 1) as i
    where i <= coalesce(array_length(b, 1), 0) and i <= coalesce(array_length(v, 1), 0)
      and translate(lower(coalesce(v[i], '')), 'éè', 'ee') !~ '(lit|bed|eveill|awake|^\s*[02]\s*$)'
    order by 1
  loop
    if r.d is null or r.f is null or r.f <= r.d then continue; end if;
    if fin_courante is null or r.d > fin_courante then
      total := total + extract(epoch from (r.f - r.d)) / 60;
      fin_courante := r.f;
    elsif r.f > fin_courante then
      total := total + extract(epoch from (r.f - fin_courante)) / 60;
      fin_courante := r.f;
    end if;
  end loop;
  return round(total)::int;
end;
$$;

-- Les rappels dus maintenant, une ligne chacun, marqués envoyés.
create or replace function rappels_du_moment(uid uuid, minutes_nuit int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  sortie text := '';
  t text;
  bande jsonb;
  bu numeric;
  forme text;
  litres text;
begin
  for r in
    select * from rappels_montre
    where user_id = uid and envoye_le is null and now() >= debut and now() < fin
    order by debut, array_position(array['matin', 'midi', 'apresmidi', 'soir'], moment)
  loop
    t := r.texte;
    if r.moment = 'matin' and r.bandes is not null then
      -- La forme de la nuit reçue : la bande la plus longue qui ne dépasse
      -- pas la durée mesurée. Sans nuit, le rappel attend le prochain envoi.
      if coalesce(minutes_nuit, 0) < 60 then continue; end if;
      select b into bande from jsonb_array_elements(r.bandes) as b
        where (b->>'min')::int <= minutes_nuit order by (b->>'min')::int desc limit 1;
      if bande is null then
        select b into bande from jsonb_array_elements(r.bandes) as b order by (b->>'min')::int limit 1;
      end if;
      if bande is null then continue; end if;
      t := bande->>'texte';
      update rappels_montre set resume = bande->>'court' where user_id = uid and jour = r.jour and moment = 'matin';
    end if;
    if r.moment = 'midi' then
      select resume into forme from rappels_montre where user_id = uid and jour = r.jour and moment = 'matin';
      t := replace(t, '{forme}', coalesce(' ' || forme, ''));
    end if;
    if r.moment = 'apresmidi' and r.cible_eau is not null then
      select coalesce(sum((e->>'ml')::numeric), 0) into bu
      from nutrition_logs n, jsonb_array_elements(coalesce(n.data->'hydration', '[]'::jsonb)) as e
      where n.user_id = uid and n.date = r.jour and (e->>'ml') ~ '^\d+(\.\d+)?$';
      litres := replace(to_char(round(bu / 1000.0, 1), 'FM990.0'), '.', ',') || ' L';
      if bu >= r.cible_eau then
        t := 'Eau : cible atteinte (' || litres || '). Continue selon ta soif.';
      else
        t := replace(replace(replace(t, '{bu}', litres), '{reste}',
          replace(to_char(round((r.cible_eau - bu) / 1000.0, 1), 'FM990.0'), '.', ',') || ' L'),
          '{cible}', replace(to_char(round(r.cible_eau / 1000.0, 1), 'FM990.0'), '.', ',') || ' L');
      end if;
    end if;
    sortie := sortie || t || E'\n';
    update rappels_montre set envoye_le = now() where user_id = uid and jour = r.jour and moment = r.moment;
  end loop;
  return sortie;
end;
$$;

revoke all on function instant_montre(text) from public;
revoke all on function minutes_sommeil_montre(text[], text[], text[]) from public;
revoke all on function rappels_du_moment(uuid, int) from public;

-- Réponse en texte simple. Le raccourci demande « Accept: text/plain » pour
-- afficher la réponse telle quelle dans sa notification. Depuis sa
-- version 12, PostgREST ne sert ce type que pour une fonction qui renvoie
-- un domaine nommé « text/plain » (« media type handler ») : avec un
-- simple « text », il répond 406 avant même d'exécuter la fonction — et
-- rien n'était déposé.
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'text/plain' and n.nspname = 'public') then
    create domain public."text/plain" as text;
  end if;
end;
$$;

-- deposer_nuit_montre (0007) : même envoi, réponse augmentée des rappels
-- du moment, placés en tête ; l'accusé d'envoi devient une ligne courte.
drop function if exists deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);
create function deposer_nuit_montre(
  jeton text, debuts jsonb, fins jsonb, valeurs jsonb,
  fc_dates jsonb default null, fc jsonb default null,
  vfc_dates jsonb default null, vfc jsonb default null)
returns "text/plain"
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a text[] := liste_montre(debuts);
  b text[] := liste_montre(fins);
  v text[] := liste_montre(valeurs);
  n int := least(coalesce(array_length(a, 1), 0), coalesce(array_length(b, 1), 0), coalesce(array_length(v, 1), 0), 500);
  fd text[] := liste_montre(fc_dates);
  fv text[] := liste_montre(fc);
  nf int := least(coalesce(array_length(fd, 1), 0), coalesce(array_length(fv, 1), 0), 100);
  hd text[] := liste_montre(vfc_dates);
  hv text[] := liste_montre(vfc);
  nh int := least(coalesce(array_length(hd, 1), 0), coalesce(array_length(hv, 1), 0), 200);
  lignes text := '';
  nuit int := 0; nfc int := 0; nvfc int := 0;
  uid uuid;
  rappels text := '';
  quoi text;
begin
  for i in 1..n loop
    if coalesce(trim(a[i]), '') = '' then continue; end if;
    lignes := lignes || 'sommeil;' || translate(trim(a[i]), E';\n', ',,') || ';'
      || translate(trim(b[i]), E';\n', ',,') || ';' || translate(trim(v[i]), E';\n', ',,') || E'\n';
    nuit := nuit + 1;
  end loop;
  for i in 1..nf loop
    if coalesce(trim(fd[i]), '') = '' or coalesce(trim(fv[i]), '') = '' then continue; end if;
    lignes := lignes || 'fc;' || translate(trim(fd[i]), E';\n', ',,') || ';' || translate(trim(fv[i]), E';\n', ',,') || E'\n';
    nfc := nfc + 1;
  end loop;
  for i in 1..nh loop
    if coalesce(trim(hd[i]), '') = '' or coalesce(trim(hv[i]), '') = '' then continue; end if;
    lignes := lignes || 'vfc;' || translate(trim(hd[i]), E';\n', ',,') || ';' || translate(trim(hv[i]), E';\n', ',,') || E'\n';
    nvfc := nvfc + 1;
  end loop;

  if lignes = '' then
    return 'Renfo : aucune donnée trouvée dans Santé sur les dernières 24 h. Vérifie que ta montre a enregistré ton sommeil (app Santé › Sommeil) et que le raccourci a accès à Santé.';
  end if;

  begin
    perform deposer_mesures_montre(jeton, lignes);
  exception when others then
    return case
      when sqlerrm like 'clé inconnue%' then 'Renfo : clé refusée. Sur le site Renfo : Profil › Apple Watch › Remplacer ma clé, puis réinstalle le raccourci et colle la nouvelle clé.'
      when sqlerrm like 'clé invalide%' then 'Renfo : clé absente ou incomplète. Réinstalle le raccourci et colle la clé en entier.'
      when sqlerrm like 'trop de dépôts%' then 'Renfo : trop d’envois cette heure-ci. Réessaie dans une heure.'
      else 'Renfo : envoi refusé (' || sqlerrm || ').'
    end;
  end;

  -- Clé acceptée : le compte est connu, ses rappels du moment aussi.
  select user_id into uid from jetons_montre where jeton_hash = encode(extensions.digest(jeton, 'sha256'), 'hex');
  begin
    rappels := rappels_du_moment(uid, case when nuit > 0 then minutes_sommeil_montre(a[1:n], b[1:n], v[1:n]) end);
  exception when others then
    rappels := '';
  end;

  quoi := concat_ws(', ',
    case when nuit > 0 then 'nuit' end,
    case when nfc > 0 then 'FC au repos' end,
    case when nvfc > 0 then 'VFC' end);
  return rappels || 'Données envoyées : ' || quoi || '.';
end;
$$;

revoke all on function deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

-- ─── Signaux de la montre, envoyés après la nuit ───
-- Le raccourci envoie d'abord la nuit (et reçoit les rappels), puis, dans
-- un second envoi, les signaux du jour : FC au repos, VFC, fréquence
-- respiratoire de la nuit, minutes d'exercice. Si une recherche Santé
-- échoue, la nuit est déjà partie. Mêmes contrôles de clé et de quota.
create or replace function deposer_signaux_montre(
  jeton text,
  fc_dates jsonb default null, fc jsonb default null,
  vfc_dates jsonb default null, vfc jsonb default null,
  resp_dates jsonb default null, resp jsonb default null,
  exo_debuts jsonb default null, exo_fins jsonb default null, exo jsonb default null)
returns "text/plain"
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lignes text := '';
  quoi text[] := array[]::text[];
  x text[]; y text[]; z text[];
  k int;
  propre text := '';
begin
  -- fc, vfc, resp : « type;date;valeur »
  x := liste_montre(fc_dates); y := liste_montre(fc); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 100) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    propre := propre || 'fc;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'FC au repos'); end if;
  x := liste_montre(vfc_dates); y := liste_montre(vfc); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 200) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    propre := propre || 'vfc;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'VFC'); end if;
  x := liste_montre(resp_dates); y := liste_montre(resp); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 300) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    propre := propre || 'resp;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'respiration'); end if;
  -- exercice : « exo;début;fin;minutes »
  x := liste_montre(exo_debuts); y := liste_montre(exo_fins); z := liste_montre(exo); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), coalesce(array_length(z, 1), 0), 1500) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(z[i]), '') = '' then continue; end if;
    propre := propre || 'exo;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || ';' || translate(trim(z[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'exercice'); end if;
  lignes := propre;

  if lignes = '' then
    return 'Signaux : rien de nouveau dans Santé.';
  end if;
  begin
    perform deposer_mesures_montre(jeton, lignes);
  exception when others then
    return case
      when sqlerrm like 'clé%' then 'Renfo : clé refusée pour les signaux. Sur le site Renfo : Profil › Apple Watch.'
      when sqlerrm like 'trop de dépôts%' then 'Renfo : trop d’envois cette heure-ci.'
      else 'Renfo : signaux refusés (' || sqlerrm || ').'
    end;
  end;
  return 'Signaux envoyés : ' || array_to_string(quoi, ', ') || '.';
end;
$$;

revoke all on function deposer_signaux_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_signaux_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
