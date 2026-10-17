-- ============================================================
-- Apple Watch : tout ce que Raccourcis sait lire en plus, dans un
-- troisième envoi du raccourci (version 6).
--
--   temp    température au poignet pendant le sommeil (°C, ou °F)
--   vo2     VO2max estimée par la montre (forme cardio)
--   hrr     récupération cardiaque à 1 min, après une séance
--   marche  fréquence cardiaque moyenne à la marche
--   poids   pesées (balance connectée ou saisie dans Santé), avec l'unité
--   zen     séances de pleine conscience (début, fin)
--
-- Un envoi à part : si une de ces recherches manque sur un iPhone (type
-- absent, autorisation refusée), la nuit et les signaux sont déjà partis.
-- Rangé en lignes dans la même boîte de dépôt, sous le même contrôle de
-- clé et le même quota que les autres envois (deposer_mesures_montre).
-- ============================================================

create or replace function deposer_activite_montre(
  jeton text,
  temp_dates jsonb default null, temp jsonb default null,
  vo2_dates jsonb default null, vo2 jsonb default null,
  hrr_dates jsonb default null, hrr jsonb default null,
  marche_dates jsonb default null, marche jsonb default null,
  poids_dates jsonb default null, poids jsonb default null, poids_unites jsonb default null,
  zen_debuts jsonb default null, zen_fins jsonb default null)
returns "text/plain"
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quoi text[] := array[]::text[];
  x text[]; y text[]; z text[];
  k int;
  propre text := '';
  champ text;
  typ text;
  libelle text;
begin
  -- Mesures simples : « type;date;valeur »
  foreach typ in array array['temp', 'vo2', 'hrr', 'marche'] loop
    if typ = 'temp' then x := liste_montre(temp_dates); y := liste_montre(temp); libelle := 'température';
    elsif typ = 'vo2' then x := liste_montre(vo2_dates); y := liste_montre(vo2); libelle := 'VO2max';
    elsif typ = 'hrr' then x := liste_montre(hrr_dates); y := liste_montre(hrr); libelle := 'récupération cardiaque';
    else x := liste_montre(marche_dates); y := liste_montre(marche); libelle := 'FC de marche';
    end if;
    k := 0;
    for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 100) loop
      if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
      propre := propre || typ || ';' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
    end loop;
    if k > 0 then quoi := array_append(quoi, libelle); end if;
  end loop;
  -- Poids : « poids;date;valeur;unité »
  x := liste_montre(poids_dates); y := liste_montre(poids); z := liste_montre(poids_unites); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 60) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    champ := coalesce(translate(trim(z[i]), E';\n', ',,'), '');
    propre := propre || 'poids;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || ';' || champ || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'poids'); end if;
  -- Pleine conscience : « zen;début;fin »
  x := liste_montre(zen_debuts); y := liste_montre(zen_fins); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 100) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    propre := propre || 'zen;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'pleine conscience'); end if;

  if propre = '' then
    return 'Activité : rien de nouveau dans Santé.';
  end if;
  begin
    perform deposer_mesures_montre(jeton, propre);
  exception when others then
    return case
      when sqlerrm like 'clé%' then 'Renfo : clé refusée. Sur le site Renfo : Profil › Apple Watch.'
      when sqlerrm like 'trop de dépôts%' then 'Renfo : trop d’envois cette heure-ci.'
      else 'Renfo : mesures refusées (' || sqlerrm || ').'
    end;
  end;
  return 'Activité envoyée : ' || array_to_string(quoi, ', ') || '.';
end;
$$;

revoke all on function deposer_activite_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_activite_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
