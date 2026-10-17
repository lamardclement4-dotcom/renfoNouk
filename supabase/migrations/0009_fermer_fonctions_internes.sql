-- ============================================================
-- Correctif sécurité : fonctions internes de la montre fermées.
--
-- Sur Supabase, toute fonction créée dans « public » reçoit d'office le
-- droit d'exécution pour les rôles anon et authenticated (privilèges par
-- défaut du projet). « revoke all … from public » ne retire pas ces
-- droits nominatifs. Vérifié sur le serveur : un appel anonyme à
-- rappels_du_moment(uid, …) répondait — avec l'identifiant d'un compte,
-- il aurait rendu ses rappels du moment (forme, séance, eau, coucher) et
-- les aurait marqués envoyés.
--
-- Seules restent ouvertes les portes prévues : deposer_mesures_montre,
-- deposer_nuit_montre, deposer_signaux_montre (contrôlées par la clé) et
-- preparer_rappels_montre (session requise). Les autres ne servent qu'à
-- l'intérieur de ces fonctions, qui s'exécutent avec les droits de leur
-- propriétaire et n'ont pas besoin que l'appelant puisse les appeler.
-- ============================================================

revoke execute on function rappels_du_moment(uuid, int) from anon, authenticated, public;
revoke execute on function instant_montre(text) from anon, authenticated, public;
revoke execute on function minutes_sommeil_montre(text[], text[], text[]) from anon, authenticated, public;
revoke execute on function liste_montre(jsonb) from anon, authenticated, public;
revoke execute on function preparer_rappels_montre(jsonb) from anon, public;
grant execute on function preparer_rappels_montre(jsonb) to authenticated;
