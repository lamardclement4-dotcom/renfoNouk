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

create or replace function deposer_nuit_montre(jeton text, debuts jsonb, fins jsonb, valeurs jsonb)
returns jsonb
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
  if n = 0 then
    raise exception 'aucun échantillon de sommeil' using errcode = '22023';
  end if;
  for i in 1..n loop
    -- Un « ; » ou un saut de ligne dans une valeur casserait la ligne.
    lignes := lignes || 'sommeil;'
      || translate(trim(a[i]), E';\n', ',,') || ';'
      || translate(trim(b[i]), E';\n', ',,') || ';'
      || translate(trim(v[i]), E';\n', ',,') || E'\n';
  end loop;
  return deposer_mesures_montre(jeton, lignes);
end;
$$;

revoke all on function liste_montre(jsonb) from public;
revoke all on function deposer_nuit_montre(text, jsonb, jsonb, jsonb) from public;
grant execute on function deposer_nuit_montre(text, jsonb, jsonb, jsonb) to anon, authenticated;
