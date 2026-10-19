-- Test helpers (run after the migrations, only in the throwaway test database).
create schema test;
grant usage on schema test to public;

-- Switch to a given user the same way PostgREST does: role + JWT claims.
create function test.login(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create function test.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end $$;
create function test.superuser() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', false);
end $$;

create function test.ok(p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FAIL: %', p_name; end if;
  raise notice 'ok - %', p_name;
end $$;

-- Runs p_sql as the current role and checks that it fails with a message containing p_expected.
create function test.throws(p_sql text, p_expected text, p_name text) returns void language plpgsql as $$
declare
  failed boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    failed := true;
    if position(p_expected in sqlerrm) = 0 then
      raise exception 'FAIL: % (expected error containing "%", got "%")', p_name, p_expected, sqlerrm;
    end if;
  end;
  if not failed then raise exception 'FAIL: % (expected an error, statement succeeded)', p_name; end if;
  raise notice 'ok - %', p_name;
end $$;

create function test.count_of(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin execute 'select count(*) from (' || p_sql || ') q' into n; return n; end $$;
