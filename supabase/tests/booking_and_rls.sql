begin;
select plan(4);

insert into tenants (id, slug, name, timezone, status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'isolation-a', 'Isolation A', 'America/New_York', 'active');
insert into staff (id, tenant_id, display_name, timezone)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Alex', 'America/New_York');

select lives_ok(
  $$insert into resource_holds (tenant_id, staff_id, span, kind, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tstzrange('2026-06-01 14:00+00', '2026-06-01 15:00+00', '[)'), 'block', 'active')$$,
  'a half-open hold can be inserted'
);

select lives_ok(
  $$insert into resource_holds (tenant_id, staff_id, span, kind, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tstzrange('2026-06-01 15:00+00', '2026-06-01 16:00+00', '[)'), 'block', 'active')$$,
  'back-to-back holds do not overlap'
);

select throws_ok(
  $$insert into resource_holds (tenant_id, staff_id, span, kind, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tstzrange('2026-06-01 14:30+00', '2026-06-01 15:15+00', '[)'), 'block', 'active')$$,
  '23P01',
  null,
  'an overlapping active hold is rejected by the exclusion constraint'
);

update resource_holds set status = 'released' where span = tstzrange('2026-06-01 14:00+00', '2026-06-01 15:00+00', '[)');
select lives_ok(
  $$insert into resource_holds (tenant_id, staff_id, span, kind, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', tstzrange('2026-06-01 14:00+00', '2026-06-01 15:00+00', '[)'), 'block', 'active')$$,
  'releasing a hold makes the same span available again'
);

select * from finish();
rollback;
