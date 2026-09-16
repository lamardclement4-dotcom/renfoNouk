-- ============================================================
-- Correctif sécurité : figer le search_path des fonctions security definer.
--
-- Une fonction `security definer` s'exécute avec les droits de son
-- propriétaire, pas de l'appelant. Sans search_path figé, elle résout les
-- noms de tables non qualifiés selon le search_path de la session qui
-- l'appelle. Un schéma contenant une fausse table `profiles`, placé devant
-- `public`, ferait donc lire is_admin() dans cette table-là : la fonction
-- répondrait « admin » à qui le demande, et tout le contrôle
-- d'administration s'effondrerait — is_admin() commande les policies
-- profiles_select_own_or_admin, profiles_update_admin, app_config_update_admin
-- ainsi que le garde-fou anti-escalade de la migration 0003.
--
-- C'est l'avertissement « Function Search Path Mutable » du linter Supabase.
--
-- pg_temp est placé en dernier : le schéma temporaire est modifiable par la
-- session appelante, il ne doit jamais être consulté avant public.
--
-- Les corps sont repris à l'identique de 0001 (is_admin, handle_new_user)
-- et de 0003 (prevent_self_privilege_escalation) : seule la clause
-- `set search_path` est ajoutée.
-- ============================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  mode text;
begin
  select signup_mode into mode from app_config where id = 1;
  insert into profiles (id, status)
  values (new.id, case when mode = 'open' then 'approved' else 'pending' end);
  return new;
end;
$$;

create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Seul un administrateur peut modifier role ou status';
  end if;
  return new;
end;
$$;
