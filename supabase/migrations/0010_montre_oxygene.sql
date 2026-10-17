-- ============================================================
-- Apple Watch : l'oxygène sanguin de la nuit, avec les autres signaux.
--
-- deposer_signaux_montre reçoit deux listes de plus, spo2_dates et spo2
-- (saturation en oxygène, telle que Santé la donne : 97 ou 0,97), et les
-- range en lignes « spo2;date;valeur » dans la boîte de dépôt, comme la
-- FC au repos ou la respiration. Le site en tire la moyenne de la nuit,
-- la plus basse mesure et les mesures sous 90 %.
--
-- L'ancienne version (dix paramètres) est retirée : deux versions côte à
-- côte rendraient l'appel ambigu. Le raccourci version 4, qui n'envoie pas
-- l'oxygène, continue de marcher (les deux listes valent null par défaut).
-- Comme pour 0009 : droits d'exécution posés explicitement, à anon et
-- authenticated seulement (la clé fait le contrôle).
-- ============================================================

drop function if exists deposer_signaux_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

create or replace function deposer_signaux_montre(
  jeton text,
  fc_dates jsonb default null, fc jsonb default null,
  vfc_dates jsonb default null, vfc jsonb default null,
  resp_dates jsonb default null, resp jsonb default null,
  exo_debuts jsonb default null, exo_fins jsonb default null, exo jsonb default null,
  spo2_dates jsonb default null, spo2 jsonb default null)
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
  -- fc, vfc, resp, spo2 : « type;date;valeur »
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
  -- Oxygène : une mesure toutes les 30 à 60 minutes la nuit, 300 suffisent.
  x := liste_montre(spo2_dates); y := liste_montre(spo2); k := 0;
  for i in 1..least(coalesce(array_length(x, 1), 0), coalesce(array_length(y, 1), 0), 300) loop
    if coalesce(trim(x[i]), '') = '' or coalesce(trim(y[i]), '') = '' then continue; end if;
    propre := propre || 'spo2;' || translate(trim(x[i]), E';\n', ',,') || ';' || translate(trim(y[i]), E';\n', ',,') || E'\n'; k := k + 1;
  end loop;
  if k > 0 then quoi := array_append(quoi, 'oxygène'); end if;
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

revoke all on function deposer_signaux_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_signaux_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;

-- PostgREST relit la liste des fonctions : sans ça, l'ancienne signature
-- resterait en cache jusqu'au prochain redémarrage.
notify pgrst, 'reload schema';
