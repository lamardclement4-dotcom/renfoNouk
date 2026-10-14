-- ============================================================
-- Montre : dépôt direct des échantillons de sommeil (raccourci tout prêt).
--
-- Le premier format demandait au raccourci de composer une ligne par
-- échantillon (boucle, texte, assemblage) : une quinzaine d'actions à
-- monter à la main. Le raccourci fourni par Renfo n'a plus que trois
-- actions : la clé, la recherche « Sommeil » dans Santé, et l'envoi. Il
-- envoie trois listes parallèles — dates de début, dates de fin, valeurs —
-- telles que l'iPhone les écrit : une liste JSON, ou un texte avec un
-- élément par ligne. Cette fonction les remet en lignes
-- « sommeil;début;fin;valeur » et passe par deposer_mesures_montre()
-- (0005) : mêmes contrôles de clé, de compte, de taille et de quota, même
-- boîte. Rien d'autre ne change côté app.
-- ============================================================

create or replace function liste_montre(v jsonb)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select case jsonb_typeof(v)
    when 'array' then array(select x from jsonb_array_elements_text(v) as t(x))
    when 'string' then string_to_array(replace(v #>> '{}', E'\r', ''), E'\n')
    else array[]::text[]
  end
$$;

-- Réponse en clair (texte), affichée par le raccourci dans une
-- notification : une phrase de confirmation, ou ce qui ne va pas et quoi
-- faire. Les refus de deposer_mesures_montre() sont rattrapés ici pour
-- devenir lisibles sur l'iPhone, plutôt qu'un message JSON technique.
drop function if exists deposer_nuit_montre(text, jsonb, jsonb, jsonb);
create function deposer_nuit_montre(jeton text, debuts jsonb, fins jsonb, valeurs jsonb)
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
  lignes text := '';
begin
  if n = 0 or (n = 1 and coalesce(trim(a[1]), '') = '') then
    return 'Renfo : aucune nuit trouvée dans Santé sur les dernières 24 h. Vérifie que ta montre a enregistré ton sommeil (app Santé › Sommeil).';
  end if;
  for i in 1..n loop
    -- Un « ; » ou un saut de ligne dans une valeur casserait la ligne.
    lignes := lignes || 'sommeil;'
      || translate(trim(a[i]), E';\n', ',,') || ';'
      || translate(trim(b[i]), E';\n', ',,') || ';'
      || translate(trim(v[i]), E';\n', ',,') || E'\n';
  end loop;
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
  return 'Nuit envoyée à Renfo (' || n || ' segment' || case when n > 1 then 's' else '' end || ' de sommeil). Ouvre Renfo pour la voir.';
end;
$$;

revoke all on function liste_montre(jsonb) from public;
revoke all on function deposer_nuit_montre(text, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_nuit_montre(text, jsonb, jsonb, jsonb) to anon, authenticated;
