// 服务端：pg 连接池（单例）
// 仅在 Node 运行时使用，不会被打进浏览器 bundle
import { Pool } from 'pg'

let _pool = null

export function getPool() {
  if (_pool) return _pool
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置')
  }
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
  })
  return _pool
}

// 首次调用时保证表存在
let _inited = false
export async function ensureSchema() {
  if (_inited) return
  const sql = `
  create table if not exists diet_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    meal text,
    name text,
    calories int,
    date date,
    created_at timestamptz default now(),
    unique (user_id, local_id)
  );
  create table if not exists weight_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    weight numeric,
    date date,
    note text,
    created_at timestamptz default now(),
    unique (user_id, local_id)
  );
  create table if not exists health_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    type text,
    value text,
    date date,
    note text,
    created_at timestamptz default now(),
    unique (user_id, local_id)
  );
  create table if not exists users (
    id bigserial primary key,
    username text unique not null,
    password_hash text not null,
    nickname text,
    avatar text,
    target_weight numeric,
    daily_target_calorie int default 1800,
    gender text,
    height int,
    age int,
    activity_level text,
    skin_type int default 0,
    created_at timestamptz default now()
  );
  alter table users add column if not exists nickname text;
  alter table users add column if not exists avatar text;
  alter table users add column if not exists target_weight numeric;
  alter table users add column if not exists daily_target_calorie int default 1800;
  alter table users add column if not exists gender text;
  alter table users add column if not exists height int;
  alter table users add column if not exists age int;
  alter table users add column if not exists activity_level text;
  alter table users add column if not exists skin_type int default 0;
  create table if not exists profile_data (
    id bigserial primary key,
    user_id text unique not null,
    data jsonb not null default '{}',
    updated_at timestamptz default now()
  );
  create table if not exists favorites (
    id bigserial primary key,
    user_id text not null,
    name text not null,
    calories int,
    created_at timestamptz default now(),
    unique (user_id, name)
  );
  create table if not exists user_settings (
    id bigserial primary key,
    user_id text unique not null,
    breakfast_remind boolean default true,
    breakfast_time text default '07:30',
    lunch_remind boolean default true,
    lunch_time text default '12:00',
    dinner_remind boolean default true,
    dinner_time text default '18:30',
    water_remind boolean default true,
    water_interval int default 2,
    weight_remind boolean default false,
    weight_time text default '20:00',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  create table if not exists app_update_record (
    id bigserial primary key,
    version text unique not null,
    update_time date not null,
    update_type text not null,
    update_detail text not null,
    is_latest boolean default false,
    created_at timestamptz default now()
  );
  create table if not exists user_goals (
    id bigserial primary key,
    user_id text unique not null,
    calorie_target int default 1800,
    water_target int default 2000,
    steps_target int default 8000,
    sleep_target numeric default 8,
    exercise_target int default 300,
    updated_at timestamptz default now()
  );
  create table if not exists exercise_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    name text,
    calories int,
    duration int,
    date date,
    note text,
    created_at timestamptz default now(),
    unique(user_id, local_id)
  );
  create table if not exists body_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    waist numeric,
    hip numeric,
    thigh numeric,
    date date,
    note text,
    created_at timestamptz default now(),
    unique(user_id, local_id)
  );
  create table if not exists cycle_records (
    id bigserial primary key,
    user_id text not null,
    local_id text,
    start_date date,
    end_date date,
    symptom text,
    note text,
    created_at timestamptz default now(),
    unique(user_id, local_id)
  );
  create table if not exists badges (
    id bigserial primary key,
    user_id text not null,
    badge_key text not null,
    badge_name text not null,
    earned_at timestamptz default now(),
    unique(user_id, badge_key)
  );
  create table if not exists share_reports (
    id bigserial primary key,
    user_id text not null,
    report_type text not null,
    period_start date,
    period_end date,
    share_code text unique not null,
    summary jsonb not null default '{}',
    created_at timestamptz default now()
  );
  create table if not exists friends (
    id bigserial primary key,
    user_id text not null,
    friend_user_id text not null,
    status text default 'pending',
    visibility text default 'private',
    group_name text default '朋友',
    remark text,
    blocked boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, friend_user_id)
  );
  alter table friends add column if not exists group_name text default '朋友';
  alter table friends add column if not exists remark text;
  alter table friends add column if not exists blocked boolean default false;
  alter table friends add column if not exists updated_at timestamptz default now();
  create table if not exists social_posts (
    id bigserial primary key,
    user_id text not null,
    target_type text default 'friends',
    group_id bigint,
    record_type text default 'daily',
    record_id text,
    content text,
    detail_hidden boolean default false,
    payload jsonb not null default '{}',
    created_at timestamptz default now()
  );
  create table if not exists post_likes (
    id bigserial primary key,
    post_id bigint not null,
    user_id text not null,
    created_at timestamptz default now(),
    unique(post_id, user_id)
  );
  create table if not exists post_comments (
    id bigserial primary key,
    post_id bigint not null,
    user_id text not null,
    content text not null,
    mentions text[] default '{}',
    created_at timestamptz default now()
  );
  create table if not exists private_messages (
    id bigserial primary key,
    sender_id text not null,
    receiver_id text not null,
    content text not null,
    is_read boolean default false,
    created_at timestamptz default now()
  );
  create table if not exists social_notifications (
    id bigserial primary key,
    user_id text not null,
    type text not null,
    content text not null,
    is_read boolean default false,
    created_at timestamptz default now()
  );
  create table if not exists user_levels (
    id bigserial primary key,
    user_id text unique not null,
    level int default 1,
    exp int default 0,
    updated_at timestamptz default now()
  );
  create table if not exists achievements (
    id bigserial primary key,
    user_id text not null,
    achievement_key text not null,
    achievement_name text not null,
    progress int default 0,
    target int default 1,
    is_unlocked boolean default false,
    unlocked_at timestamptz,
    unique(user_id, achievement_key)
  );
  create table if not exists point_accounts (
    id bigserial primary key,
    user_id text unique not null,
    points int default 0,
    updated_at timestamptz default now()
  );
  create table if not exists point_logs (
    id bigserial primary key,
    user_id text not null,
    points_change int not null,
    source text not null,
    detail text,
    created_at timestamptz default now()
  );
  create table if not exists supervision_groups (
    id bigserial primary key,
    name text not null,
    owner_id text not null,
    invite_code text unique not null,
    max_members int default 5,
    created_at timestamptz default now()
  );
  create table if not exists group_members (
    id bigserial primary key,
    group_id bigint not null,
    user_id text not null,
    role text default 'member',
    status text default 'active',
    joined_at timestamptz default now(),
    unique(group_id, user_id)
  );
  create table if not exists group_goals (
    id bigserial primary key,
    group_id bigint not null,
    goal_type text default 'checkin',
    target_value numeric default 7,
    start_date date default current_date,
    end_date date default (current_date + 7),
    remind_enabled boolean default true,
    created_at timestamptz default now()
  );
  create table if not exists challenge_records (
    id bigserial primary key,
    creator_id text not null,
    title text not null,
    challenge_type text default 'checkin',
    duration_days int default 7,
    reward_points int default 30,
    invite_code text unique not null,
    status text default 'active',
    start_date date default current_date,
    end_date date default (current_date + 7),
    created_at timestamptz default now()
  );
  create table if not exists challenge_members (
    id bigserial primary key,
    challenge_id bigint not null,
    user_id text not null,
    progress int default 0,
    status text default 'active',
    joined_at timestamptz default now(),
    unique(challenge_id, user_id)
  );
  create table if not exists food_guess_games (
    id bigserial primary key,
    creator_id text not null,
    post_id bigint,
    food_name text not null,
    answer_calories int not null,
    reward_points int default 5,
    status text default 'open',
    created_at timestamptz default now()
  );
  create table if not exists food_guess_answers (
    id bigserial primary key,
    game_id bigint not null,
    user_id text not null,
    guessed_calories int not null,
    is_correct boolean default false,
    created_at timestamptz default now(),
    unique(game_id, user_id)
  );
  create table if not exists admin_users (
    id bigserial primary key,
    username text unique not null,
    password_hash text not null,
    role text default 'admin',
    status text default 'active',
    created_at timestamptz default now(),
    last_login_at timestamptz
  );
  create table if not exists admin_operation_logs (
    id bigserial primary key,
    admin_id text,
    operation_type text,
    operation_content text,
    ip_address text,
    operation_time timestamptz default now()
  );
  create index if not exists diet_uid_date on diet_records(user_id, date);
  create index if not exists weight_uid_date on weight_records(user_id, date);
  create index if not exists health_uid_date on health_records(user_id, date);
  create index if not exists favorites_uid on favorites(user_id);
  create index if not exists user_settings_uid on user_settings(user_id);
  create index if not exists app_update_record_version on app_update_record(version);
  create index if not exists goals_uid on user_goals(user_id);
  create index if not exists exercise_uid_date on exercise_records(user_id, date);
  create index if not exists body_uid_date on body_records(user_id, date);
  create index if not exists cycle_uid_start on cycle_records(user_id, start_date);
  create index if not exists badges_uid on badges(user_id);
  create index if not exists share_reports_uid on share_reports(user_id);
  create index if not exists friends_uid on friends(user_id);
  create index if not exists friends_friend_uid on friends(friend_user_id);
  create index if not exists social_posts_uid_time on social_posts(user_id, created_at);
  create index if not exists social_posts_target_time on social_posts(target_type, created_at);
  create index if not exists post_likes_post on post_likes(post_id);
  create index if not exists post_comments_post on post_comments(post_id);
  create index if not exists private_messages_pair on private_messages(sender_id, receiver_id, created_at);
  create index if not exists notifications_uid_read on social_notifications(user_id, is_read);
  create index if not exists achievements_uid on achievements(user_id);
  create index if not exists point_logs_uid_time on point_logs(user_id, created_at);
  create index if not exists group_members_uid on group_members(user_id);
  create index if not exists group_members_gid on group_members(group_id);
  create index if not exists group_goals_gid on group_goals(group_id);
  create index if not exists challenge_members_uid on challenge_members(user_id);
  create index if not exists food_guess_answers_uid on food_guess_answers(user_id);
  create index if not exists admin_logs_admin_time on admin_operation_logs(admin_id, operation_time);
  create table if not exists foods (
    id bigserial primary key,
    name text not null unique,
    calories int not null,
    category text not null,
    created_at timestamptz default now()
  );
  create index if not exists foods_category on foods(category);
  insert into app_update_record(version, update_time, update_type, update_detail, is_latest)
  values
    ('v4.0.0', '2026-04-26', '新增功能', '1. 新增好友搜索/添加/分组/拉黑；2. 新增社交动态、点赞、评论、私信与消息提醒表；3. 新增等级、成就、积分与挑战赛；4. 新增2-5人监督小组、共同目标与排行榜', true),
    ('v3.0.0', '2026-04-25', '新增功能', '1. 新增智能健康分析；2. 新增目标精细化与达成率；3. 新增运动/体围/生理期扩展表；4. 新增报告分享、徽章、好友与Admin后台骨架', false),
    ('v2.0.3', '2026-04-25', '功能优化', '1. 根据版本计划补齐用户设置表；2. 更新记录改为PostgreSQL持久化；3. Docker数据库端口改为内网访问', false),
    ('v2.0.2', '2026-04-25', '新增功能', '1. 新增优化版个人中心；2. 新增更新记录页面；3. 强化Q版皮肤切换', false),
    ('v2.0.1', '2026-04-25', '功能优化', '1. 新增独立食物库页面；2. 新增独立饮食和体重添加页面；3. 优化页面跳转结构', false),
    ('v2.0.0', '2026-04-10', '新增功能', '1. 新增饮食记录、体重记录功能；2. 新增首页数据概览；3. 完成个人中心基础功能', false)
  on conflict(version) do update set
    update_time = excluded.update_time,
    update_type = excluded.update_type,
    update_detail = excluded.update_detail,
    is_latest = excluded.is_latest;
  `
  await getPool().query(sql)
  _inited = true
}

// 首次运行时将静态食物库写入 PG（幂等）
let _foodsSeeded = false
export async function seedFoods(foods) {
  if (_foodsSeeded) return
  const pool = getPool()
  const { rows } = await pool.query('select count(*)::int as n from foods')
  if (rows[0].n > 0) { _foodsSeeded = true; return }
  // 批量插入，冲突忽略
  const vals = foods.map((f, i) => `($${i * 3 + 1},$${i * 3 + 2},$${i * 3 + 3})`).join(',')
  const flat = foods.flatMap((f) => [f.name, f.calories, f.category])
  await pool.query(
    `insert into foods(name,calories,category) values ${vals} on conflict(name) do nothing`,
    flat
  )
  _foodsSeeded = true
}
