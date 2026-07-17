-- ============================================================
-- Correctif : le trigger de 0002 bloquait aussi les mises à jour
-- faites depuis le SQL Editor Supabase (ou tout accès direct à la
-- base), car auth.uid() y est NULL et is_admin() renvoie donc faux.
-- On ne bloque désormais que les requêtes qui passent par une
-- session utilisateur authentifiée (auth.uid() non NULL) et qui ne
-- sont pas déjà admin.
-- ============================================================
create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
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
