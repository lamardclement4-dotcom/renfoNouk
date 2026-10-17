-- ============================================================
-- Apple Watch : « Ma journée », à lire au poignet.
--
-- Le raccourci « Ma journée » (lancé depuis la montre, ou une
-- complication du cadran) demande au serveur, avec la clé de la montre,
-- le point du jour : la forme, la séance prévue, l'eau bue face à la
-- cible, l'heure du coucher. Ce sont les phrases que le site prépare
-- déjà pour les notifications (table rappels_montre, migration 0008) ;
-- rien n'est marqué envoyé, rien n'est écrit.
--
-- L'eau notée sur la montre (« J'ai bu ») et pas encore rangée par le
-- site (encore dans la boîte de dépôt) est comptée aussi.
-- Lecture seule : même contrôle de clé que les dépôts, pas de quota.
-- ============================================================

create or replace function lire_journee_montre(jeton text)
returns "text/plain"
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid;
  j date;
  r record;
  sortie text := '';
  t text;
  forme text;
  bu numeric := 0;
  en_attente numeric := 0;
  depuis timestamptz;
  ligne text;
  q text;
  n numeric;
  vu_midi boolean := false;
  litres text;
begin
  if jeton is null or char_length(jeton) < 32 or char_length(jeton) > 128 then
    return 'Renfo : clé absente. Sur l’iPhone : site Renfo › Profil › Apple Watch.';
  end if;
  select k.user_id into uid
  from jetons_montre k
  join profiles p on p.id = k.user_id and p.status = 'approved'
  where k.jeton_hash = encode(extensions.digest(jeton, 'sha256'), 'hex');
  if uid is null then
    return 'Renfo : clé refusée. Sur l’iPhone : site Renfo › Profil › Apple Watch.';
  end if;

  -- Le jour en cours, à l'heure de l'iPhone : le dernier jour préparé dont
  -- la matinée a commencé.
  select max(jour) into j from rappels_montre where user_id = uid and debut <= now();
  if j is null then
    return 'Renfo : ouvre le site une fois aujourd’hui pour préparer ta journée.';
  end if;
  select min(debut) into depuis from rappels_montre where user_id = uid and jour = j;
  select resume into forme from rappels_montre where user_id = uid and jour = j and moment = 'matin';

  for r in
    select * from rappels_montre where user_id = uid and jour = j
    order by array_position(array['matin', 'midi', 'apresmidi', 'soir'], moment)
  loop
    t := null;
    if r.moment = 'matin' then
      -- Nuit connue du site : la note exacte ; sinon celle retenue au
      -- dernier envoi de la nuit (bande), sinon on attend la nuit.
      t := case
        when r.bandes is null then r.texte
        when forme is not null then forme
        else 'Forme du jour : en attente de ta nuit (lance « Envoyer ma nuit »).'
      end;
    elsif r.moment = 'midi' then
      vu_midi := true;
      t := replace(r.texte, '{forme}', '');
    elsif r.moment = 'apresmidi' and r.cible_eau is not null then
      select coalesce(sum((e->>'ml')::numeric), 0) into bu
      from nutrition_logs nl, jsonb_array_elements(coalesce(nl.data->'hydration', '[]'::jsonb)) as e
      where nl.user_id = uid and nl.date = j and (e->>'ml') ~ '^\d+(\.\d+)?$';
      -- Eau notée au poignet, pas encore rangée par le site.
      for ligne in
        select x from depots_montre d, unnest(string_to_array(d.texte, E'\n')) as x
        where d.user_id = uid and d.recu_le >= depuis and x ~* '^\s*eau\s*;'
      loop
        q := lower(split_part(ligne, ';', 3));
        n := replace(substring(q from '(\d+(?:[.,]\d+)?)'), ',', '.')::numeric;
        if n is null then continue; end if;
        if q ~ '\d\s*cl' then n := n * 10;
        elsif q ~ '\d\s*l\M' and q !~ 'ml' then n := n * 1000;
        end if;
        if n between 50 and 3000 then en_attente := en_attente + n; end if;
      end loop;
      bu := bu + en_attente;
      litres := replace(to_char(round(bu / 1000.0, 1), 'FM990.0'), '.', ',') || ' L';
      if bu >= r.cible_eau then
        t := 'Eau : cible atteinte (' || litres || ').';
      else
        t := replace(replace(replace(r.texte, '{bu}', litres), '{reste}',
          replace(to_char(round((r.cible_eau - bu) / 1000.0, 1), 'FM990.0'), '.', ',') || ' L'),
          '{cible}', replace(to_char(round(r.cible_eau / 1000.0, 1), 'FM990.0'), '.', ',') || ' L');
      end if;
    elsif r.moment = 'soir' then
      t := r.texte;
    end if;
    if t is not null then
      if r.moment = 'apresmidi' and not vu_midi then
        sortie := sortie || 'Pas de séance prévue aujourd’hui.' || E'\n';
        vu_midi := true;
      end if;
      sortie := sortie || t || E'\n';
    end if;
  end loop;
  if not vu_midi then
    sortie := sortie || 'Pas de séance prévue aujourd’hui.' || E'\n';
  end if;
  return rtrim(sortie, E'\n');
end;
$$;

revoke all on function lire_journee_montre(text) from public;
grant execute on function lire_journee_montre(text) to anon, authenticated;

notify pgrst, 'reload schema';
