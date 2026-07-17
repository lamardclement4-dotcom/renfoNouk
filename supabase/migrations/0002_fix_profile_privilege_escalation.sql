-- ============================================================
-- Correctif sécurité : la policy "profiles_update_own" autorisait
-- un utilisateur à modifier n'importe quelle colonne de son propre
-- profil, y compris role/status -> auto-approbation et
-- auto-promotion admin possibles. Ce trigger bloque tout changement
-- de role/status venant d'un utilisateur non-admin.
-- ============================================================
create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not is_admin() then
    raise exception 'Seul un administrateur peut modifier role ou status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_privilege_escalation on profiles;
create trigger trg_prevent_self_privilege_escalation
  before update on profiles
  for each row execute function prevent_self_privilege_escalation();
