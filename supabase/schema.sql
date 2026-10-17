-- ════════════════════════════════════════════════════════════════════════════
--  四週年紀念卡：資料庫（Supabase / Postgres）
--
--  使用方式：Supabase Dashboard → SQL Editor → New query → 整份貼上 → Run
--  這份腳本可以重複執行，不會刪除任何資料（只會建立缺少的東西、更新函式）。
--
--  設計重點
--   1. 所有資料表放在私有的 app schema，API 完全碰不到；前端只能呼叫 public 裡的函式。
--   2. 每個函式的第一個參數都是「通行碼」，函式內驗證通過才做事（B+ 方案：不用登入）。
--   3. 餘額 = 流水帳（app.transactions）金額加總，不另外存一個會被覆寫的數字。
--   4. 流水帳只能新增，不能修改或刪除（有觸發器擋住）；更正錯誤用「沖銷」新增一筆反向紀錄。
--   5. 帳務規則（金額範圍、餘額不能為負、禮物限一次、沖銷限制…）和前端 src/shared/domain/rules.ts 一致。
--   6. 所有日期判斷一律用台北時間，由資料庫的時鐘決定，改手機日期沒有用。
-- ════════════════════════════════════════════════════════════════════════════


-- ───────────────────────────── 私有 schema ─────────────────────────────

create schema if not exists app;
revoke all on schema app from public;

-- 現在時間。測試時可以用 set app.now_override = '2026-11-16T10:00:00+08:00' 假裝是另一天；正式環境沒人設定它
create or replace function app.now() returns timestamptz
language sql stable as $$
  select coalesce(nullif(current_setting('app.now_override', true), '')::timestamptz, clock_timestamp())
$$;


-- ───────────────────────────── 設定與資料表 ─────────────────────────────

-- 全系統只有一筆設定（可以直接 update 這一列來調整金額）
create table if not exists app.settings (
  id             int  primary key default 1 check (id = 1),
  initial_credit int  not null default 14520 check (initial_credit > 0),   -- 開卡初始額度
  anniv_mmdd     text not null default '11-15'
                 check (anniv_mmdd ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),  -- 紀念日（月-日）
  anniv_topup    int  not null default 1115 check (anniv_topup > 0),       -- 每年紀念日自動加值
  topup_max      int  not null default 50000 check (topup_max > 0),        -- 後台單筆儲值上限
  tz             text not null default 'Asia/Taipei'
);
insert into app.settings (id) values (1) on conflict do nothing;

-- 可兌換的禮物（不扣額度、每項限一次）
create table if not exists app.gifts (
  key   text primary key,
  title text not null,
  sort  int  not null default 0
);
insert into app.gifts (key, title, sort) values
  ('anniv4-gift',   '四週年禮物',     1),
  ('anniv4-letter', '四週年手寫卡片', 2)
on conflict do nothing;

-- 卡片：全系統只有一筆
create table if not exists app.card (
  id               int     primary key default 1 check (id = 1),
  activated        boolean not null default false,
  locked           boolean not null default false,
  profile          jsonb,                       -- { name, firstMeet, favGift, dessert }
  activated_at     timestamptz,
  card_token_hash  text    not null,            -- 她的通行碼（只存雜湊）
  admin_token_hash text    not null              -- 後台的通行碼（只存雜湊）
);

-- 流水帳
create table if not exists app.transactions (
  id         uuid        primary key default gen_random_uuid(),
  kind       text        not null check (kind in ('initial', 'spend', 'topup', 'anniv', 'gift', 'void')),
  title      text        not null,
  amount     integer     not null,               -- 有正負：儲值為正、消費為負
  note       text,                               -- 儲值備註、沖銷原因
  ref        text,                               -- void：被沖銷的 id；anniv：年份；gift：禮物代碼
  request_id text        unique,                 -- 防止同一次操作重送而扣兩次
  created_at timestamptz not null default app.now(),
  constraint amount_matches_kind check (
       (kind in ('initial', 'topup', 'anniv') and amount > 0)
    or (kind = 'spend' and amount < 0)
    or (kind = 'gift' and amount = 0)
    or (kind = 'void' and amount <> 0)
  )
);
create index if not exists transactions_created_idx on app.transactions (created_at, id);
create unique index if not exists transactions_one_initial on app.transactions (kind) where kind = 'initial';
create unique index if not exists transactions_one_anniv   on app.transactions (ref)  where kind = 'anniv';
create unique index if not exists transactions_one_gift    on app.transactions (ref)  where kind = 'gift';
create unique index if not exists transactions_one_void    on app.transactions (ref)  where kind = 'void';

-- 沒有任何人（包含擁有者的一般操作）可以修改或刪除流水帳；要清空請用 app.reset_card()
create or replace function app.ledger_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'LEDGER_IS_APPEND_ONLY' using errcode = 'P0001';
end $$;

drop trigger if exists transactions_append_only on app.transactions;
create trigger transactions_append_only
  before update or delete on app.transactions
  for each row execute function app.ledger_is_append_only();

-- 第一次建立時放入「沒有人知道的」隨機通行碼；真正的通行碼請執行 supabase/tokens.sql 產生
insert into app.card (id, card_token_hash, admin_token_hash)
values (1,
        encode(sha256(convert_to(gen_random_uuid()::text, 'utf8')), 'hex'),
        encode(sha256(convert_to(gen_random_uuid()::text, 'utf8')), 'hex'))
on conflict do nothing;

-- 資料表全部啟用 RLS 且不開任何 policy：除了擁有者與 security definer 函式，沒有人讀得到
alter table app.settings     enable row level security;
alter table app.gifts        enable row level security;
alter table app.card         enable row level security;
alter table app.transactions enable row level security;


-- ───────────────────────────── 內部輔助函式（app schema，API 看不到）─────────────────────────────

create or replace function app.fail(p_code text) returns void
language plpgsql as $$
begin
  raise exception '%', p_code using errcode = 'P0001';
end $$;

create or replace function app.sha(p_text text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(coalesce(p_text, ''), 'utf8')), 'hex')
$$;

-- 去掉頭尾空白（和前端 String.trim 一致）
create or replace function app.trim(p_text text) returns text
language sql immutable as $$
  select regexp_replace(coalesce(p_text, ''), '^\s+|\s+$', '', 'g')
$$;

create or replace function app.today() returns date
language sql stable as $$
  select (app.now() at time zone (select tz from app.settings where id = 1))::date
$$;

create or replace function app.balance() returns bigint
language sql stable as $$
  select coalesce(sum(amount), 0) from app.transactions
$$;

-- 驗證通行碼，並鎖住卡片這一列（讓所有操作排隊執行，餘額檢查不會被同時的請求搶先）
create or replace function app.verify(p_role text, p_token text) returns void
language plpgsql as $$
declare
  ok boolean;
begin
  select (case p_role when 'card' then c.card_token_hash else c.admin_token_hash end) = app.sha(p_token)
    into ok
    from app.card c
   where c.id = 1
     for update;
  if not coalesce(ok, false) then
    perform app.fail('INVALID_TOKEN');
  end if;
end $$;

create or replace function app.require_active() returns void
language plpgsql as $$
begin
  if not (select activated from app.card where id = 1) then
    perform app.fail('NOT_ACTIVATED');
  end if;
end $$;

-- 補發還沒發的紀念日加值：開卡之後（不含開卡當天）每一個紀念日，每年一筆；紀錄時間標在紀念日當天 00:00（台北）
create or replace function app.sync_anniv() returns void
language plpgsql as $$
declare
  c        app.card;
  s        app.settings;
  act_date date;
  today    date;
  y        int;
  d        date;
begin
  select * into c from app.card where id = 1;
  if not c.activated then
    return;
  end if;
  select * into s from app.settings where id = 1;
  act_date := (c.activated_at at time zone s.tz)::date;
  today    := app.today();
  for y in extract(year from act_date)::int .. extract(year from today)::int loop
    d := make_date(y, substr(s.anniv_mmdd, 1, 2)::int, substr(s.anniv_mmdd, 4, 2)::int);
    if d > act_date and d <= today then
      insert into app.transactions (kind, title, amount, ref, created_at)
      values ('anniv', y || ' 紀念日加值', s.anniv_topup, y::text, d::timestamp at time zone s.tz)
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- 回傳給前端的完整狀態（格式與前端的 CardState 相同）
create or replace function app.state() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'activated',    c.activated,
    'locked',       c.locked,
    'profile',      c.profile,
    'activatedAt',  case when c.activated_at is null then null
                         else to_char(c.activated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'transactions', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id',        t.id,
                 'kind',      t.kind,
                 'title',     t.title,
                 'amount',    t.amount,
                 'note',      t.note,
                 'createdAt', to_char(t.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                 'ref',       t.ref
               ) order by t.created_at, t.id)
          from app.transactions t), '[]'::jsonb),
    'serverTime',   to_char(app.now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
  from app.card c
  where c.id = 1
$$;


-- ───────────────────────────── 她可以呼叫的函式 ─────────────────────────────

create or replace function public.card_state(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app.verify('card', p_token);
  perform app.sync_anniv();
  return app.state();
end $$;

-- 開卡：只能一次；寫入個人資料與初始額度
create or replace function public.card_activate(p_token text, p_profile jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  k     text;
  v     text;
  lim   int;
  clean jsonb := '{}'::jsonb;
  s     app.settings;
begin
  perform app.verify('card', p_token);
  if (select activated from app.card where id = 1) then
    perform app.fail('ALREADY_ACTIVATED');
  end if;

  foreach k in array array['name', 'firstMeet', 'favGift', 'dessert'] loop
    v   := app.trim(p_profile ->> k);
    lim := case k when 'name' then 14 when 'dessert' then 20 else 30 end;
    if v = '' or char_length(v) > lim then
      perform app.fail('INVALID_INPUT');
    end if;
    clean := clean || jsonb_build_object(k, v);
  end loop;

  select * into s from app.settings where id = 1;
  update app.card set activated = true, locked = false, profile = clean, activated_at = app.now() where id = 1;
  insert into app.transactions (kind, title, amount) values ('initial', '初始額度', s.initial_credit);
  return app.state();
end $$;

-- 消費：金額 1～9,999,999、項目 1～20 字、卡片沒鎖、不能超過餘額；同一個 request_id 重送只會扣一次
create or replace function public.card_spend(p_token text, p_title text, p_amount bigint, p_request_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t text := app.trim(p_title);
begin
  perform app.verify('card', p_token);
  perform app.sync_anniv();
  perform app.require_active();

  if p_request_id is null or p_request_id = '' or char_length(p_request_id) > 64 then
    perform app.fail('INVALID_INPUT');
  end if;
  if exists (select 1 from app.transactions where request_id = p_request_id) then
    return app.state(); -- 重送：已經處理過了
  end if;

  if t = '' or char_length(t) > 20 or p_amount is null or p_amount < 1 or p_amount > 9999999 then
    perform app.fail('INVALID_INPUT');
  end if;
  if (select locked from app.card where id = 1) then
    perform app.fail('LOCKED');
  end if;
  if p_amount > app.balance() then
    perform app.fail('INSUFFICIENT');
  end if;

  insert into app.transactions (kind, title, amount, request_id) values ('spend', t, -p_amount, p_request_id);
  return app.state();
end $$;

-- 兌換禮物：不扣額度，每項限一次
create or replace function public.card_claim_gift(p_token text, p_gift_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  g app.gifts;
begin
  perform app.verify('card', p_token);
  perform app.sync_anniv();
  perform app.require_active();

  select * into g from app.gifts where key = p_gift_key;
  if not found then
    perform app.fail('INVALID_INPUT');
  end if;
  if exists (select 1 from app.transactions where kind = 'gift' and ref = g.key) then
    perform app.fail('ALREADY_CLAIMED');
  end if;
  if (select locked from app.card where id = 1) then
    perform app.fail('LOCKED');
  end if;

  insert into app.transactions (kind, title, amount, ref) values ('gift', g.title, 0, g.key);
  return app.state();
end $$;

create or replace function public.card_set_lock(p_token text, p_locked boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app.verify('card', p_token);
  perform app.sync_anniv();
  perform app.require_active();
  update app.card set locked = coalesce(p_locked, false) where id = 1;
  return app.state();
end $$;

-- 修改個人資料（只能改 name、firstMeet、favGift、dessert；其他欄位會被忽略）
create or replace function public.card_update_profile(p_token text, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  k    text;
  v    text;
  lim  int;
  next jsonb;
begin
  perform app.verify('card', p_token);
  perform app.sync_anniv();
  perform app.require_active();

  next := (select profile from app.card where id = 1);
  foreach k in array array['name', 'firstMeet', 'favGift', 'dessert'] loop
    if p_patch ? k then
      v   := app.trim(p_patch ->> k);
      lim := case k when 'name' then 14 when 'dessert' then 20 else 30 end;
      if v = '' or char_length(v) > lim then
        perform app.fail('INVALID_INPUT');
      end if;
      next := next || jsonb_build_object(k, v);
    end if;
  end loop;
  update app.card set profile = next where id = 1;
  return app.state();
end $$;


-- ───────────────────────────── 後台可以呼叫的函式 ─────────────────────────────

create or replace function public.admin_state(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app.verify('admin', p_token);
  perform app.sync_anniv();
  return app.state();
end $$;

-- 儲值：金額 1～topup_max、備註必填（1～40 字）
create or replace function public.admin_topup(p_token text, p_amount bigint, p_note text, p_request_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n text := app.trim(p_note);
  s app.settings;
begin
  perform app.verify('admin', p_token);
  perform app.sync_anniv();
  perform app.require_active();

  if p_request_id is null or p_request_id = '' or char_length(p_request_id) > 64 then
    perform app.fail('INVALID_INPUT');
  end if;
  if exists (select 1 from app.transactions where request_id = p_request_id) then
    return app.state();
  end if;

  select * into s from app.settings where id = 1;
  if p_amount is null or p_amount < 1 or p_amount > s.topup_max or n = '' or char_length(n) > 40 then
    perform app.fail('INVALID_INPUT');
  end if;

  insert into app.transactions (kind, title, amount, note, request_id) values ('topup', '儲值', p_amount, n, p_request_id);
  return app.state();
end $$;

-- 沖銷：新增一筆反向紀錄，原紀錄保留。只有消費、儲值、紀念日加值可以沖銷；沖銷後餘額不能小於 0
create or replace function public.admin_void(p_token text, p_tx_id text, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  tx app.transactions;
  r  text := app.trim(p_reason);
begin
  perform app.verify('admin', p_token);
  perform app.sync_anniv();
  perform app.require_active();

  select * into tx from app.transactions where id::text = p_tx_id;
  if not found then
    perform app.fail('NOT_FOUND');
  end if;
  if tx.kind not in ('spend', 'topup', 'anniv') then
    perform app.fail('INVALID_INPUT');
  end if;
  if exists (select 1 from app.transactions where kind = 'void' and ref = tx.id::text) then
    perform app.fail('ALREADY_VOIDED');
  end if;
  if r = '' or char_length(r) > 40 then
    perform app.fail('INVALID_INPUT');
  end if;
  if app.balance() - tx.amount < 0 then
    perform app.fail('INSUFFICIENT');
  end if;

  insert into app.transactions (kind, title, amount, note, ref)
  values ('void', '沖銷：' || tx.title, -tx.amount, r, tx.id::text);
  return app.state();
end $$;

create or replace function public.admin_unlock(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app.verify('admin', p_token);
  perform app.sync_anniv();
  perform app.require_active();
  update app.card set locked = false where id = 1;
  return app.state();
end $$;


-- ───────────────────────────── 擁有者專用工具（只能在 SQL Editor 執行，API 呼叫不到）─────────────────────────────

create or replace function app.new_token() returns text
language sql as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')   -- 64 個字元的隨機碼
$$;

-- 產生全新的兩組通行碼並回傳（只會顯示這一次，資料庫只留雜湊）
create or replace function app.rotate_tokens() returns table (card_token text, admin_token text)
language plpgsql as $$
declare
  c text := app.new_token();
  a text := app.new_token();
begin
  update app.card set card_token_hash = app.sha(c), admin_token_hash = app.sha(a) where id = 1;
  return query select c, a;
end $$;

-- 只換她的通行碼（連結外流、或測試完要交給她時使用）
create or replace function app.rotate_card_token() returns text
language plpgsql as $$
declare
  c text := app.new_token();
begin
  update app.card set card_token_hash = app.sha(c) where id = 1;
  return c;
end $$;

-- 清空全部流水帳，卡片還原成「尚未開卡」，並產生她的新通行碼（舊連結立刻失效）。後台通行碼不變
create or replace function app.reset_card() returns text
language plpgsql as $$
begin
  truncate app.transactions;
  update app.card set activated = false, locked = false, profile = null, activated_at = null where id = 1;
  return app.rotate_card_token();
end $$;


-- ───────────────────────────── 權限 ─────────────────────────────

-- app schema 與裡面的東西：anon / authenticated 完全碰不到
revoke all on all tables    in schema app from public;
revoke all on all functions in schema app from public;

-- public 裡只有這幾個函式對外開放，其他人（PUBLIC）預設的執行權限先收回，再只給 anon / authenticated
revoke all on function public.card_state(text)                          from public;
revoke all on function public.card_activate(text, jsonb)                from public;
revoke all on function public.card_spend(text, text, bigint, text)      from public;
revoke all on function public.card_claim_gift(text, text)               from public;
revoke all on function public.card_set_lock(text, boolean)              from public;
revoke all on function public.card_update_profile(text, jsonb)          from public;
revoke all on function public.admin_state(text)                         from public;
revoke all on function public.admin_topup(text, bigint, text, text)     from public;
revoke all on function public.admin_void(text, text, text)              from public;
revoke all on function public.admin_unlock(text)                        from public;

grant execute on function public.card_state(text)                       to anon, authenticated;
grant execute on function public.card_activate(text, jsonb)             to anon, authenticated;
grant execute on function public.card_spend(text, text, bigint, text)   to anon, authenticated;
grant execute on function public.card_claim_gift(text, text)            to anon, authenticated;
grant execute on function public.card_set_lock(text, boolean)           to anon, authenticated;
grant execute on function public.card_update_profile(text, jsonb)       to anon, authenticated;
grant execute on function public.admin_state(text)                      to anon, authenticated;
grant execute on function public.admin_topup(text, bigint, text, text)  to anon, authenticated;
grant execute on function public.admin_void(text, text, text)           to anon, authenticated;
grant execute on function public.admin_unlock(text)                     to anon, authenticated;
