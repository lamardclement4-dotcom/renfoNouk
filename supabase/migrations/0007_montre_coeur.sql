-- ============================================================
-- Montre : la fréquence cardiaque au repos et la variabilité cardiaque
-- arrivent avec la nuit, par le même raccourci.
--
-- deposer_nuit_montre() gagne quatre listes facultatives : dates et
-- valeurs de FC au repos, dates et valeurs de VFC. Elles sont remises en
-- lignes « fc;date;valeur » et « vfc;date;valeur », que l'app sait déjà
-- lire (montre.js) et qui comptent dans la forme du jour. Un raccourci de
-- la version précédente, qui n'envoie que la nuit, continue de marcher :
-- les nouvelles listes ont une valeur par défaut.
--
-- L'ancienne signature (4 paramètres) est supprimée : avec les deux,
-- PostgREST ne saurait pas laquelle choisir pour un appel à 4 champs.
-- Mêmes contrôles qu'avant, via deposer_mesures_montre() (0005).
-- ============================================================

drop function if exists deposer_nuit_montre(text, jsonb, jsonb, jsonb);
drop function if exists deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

create function deposer_nuit_montre(
  jeton text, debuts jsonb, fins jsonb, valeurs jsonb,
  fc_dates jsonb default null, fc jsonb default null,
  vfc_dates jsonb default null, vfc jsonb default null)
returns text
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
  propre text;
begin
  -- Un « ; » ou un saut de ligne dans une valeur casserait la ligne.
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

  propre := concat_ws(', ',
    case when nuit > 0 then 'ta nuit (' || nuit || ' segment' || case when nuit > 1 then 's' else '' end || ')' end,
    case when nfc > 0 then 'ta FC au repos' end,
    case when nvfc > 0 then 'ta VFC' end);
  return 'Envoyé à Renfo : ' || propre || '.'
    || case when nuit = 0 then ' Aucune nuit trouvée sur les dernières 24 h.' else ' Ouvre Renfo pour la voir.' end;
end;
$$;

revoke all on function deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_nuit_montre(text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to anon, authenticated;
