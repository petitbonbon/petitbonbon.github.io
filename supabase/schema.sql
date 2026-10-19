-- =====================================================================
-- Petit Bonbon — schéma de la base Supabase
-- À coller tel quel dans Supabase › SQL Editor › New query › Run.
-- Peut être relancé sans risque (il ne recrée que ce qui manque).
--
-- Principe de sécurité : aucune table n'est lisible directement depuis
-- l'application. Tout passe par des fonctions (RPC) qui vérifient qui
-- appelle et ne renvoient que le strict nécessaire. Les identifiants des
-- autres utilisateurs ne quittent jamais la base.
-- =====================================================================

-- ---------- Réglages globaux --------------------------------------------
create table if not exists public.app_settings (
  id               int primary key default 1 check (id = 1),
  paywall_enabled  boolean not null default false,  -- true = accès payant pour entrer (désactivé : l'app de base est gratuite)
  daily_send_limit int     not null default 10       -- bonbons envoyés max par 24 h
);
insert into public.app_settings (id) values (1) on conflict do nothing;
-- Ajouts de sécurité (sans effet si les colonnes existent déjà)
alter table public.app_settings add column if not exists min_city_people   int not null default 2; -- « Découvrir » s'ouvre à partir de N personnes dans la ville
alter table public.app_settings add column if not exists weekly_pair_limit int not null default 2; -- bonbons max vers une même personne sur 7 jours

-- ---------- Comptes ------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  adult_confirmed_at  timestamptz,
  paid_at             timestamptz,
  receive_on          boolean not null default true,
  same_city_only      boolean not null default false,
  banned              boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ---------- Identité du jour (une seule active par compte) ---------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  pseudo        text not null check (char_length(pseudo) between 1 and 20),
  moods         text[] not null default '{}' check (cardinality(moods) <= 3),
  bio           text check (bio is null or char_length(bio) <= 160),
  current_city  text not null check (char_length(current_city) between 1 and 60),
  home_city     text not null check (char_length(home_city) between 1 and 60),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '12 hours'
);

-- Présence : une identité n'apparaît dans « Autour de toi » que si l'app est
-- ouverte en ce moment sur cet appareil (mise à jour toutes les 20 s par l'app).
-- Évite de voir ses propres anciennes identités (autre navigateur, autre appareil,
-- onglet privé fermé…) comme des inconnus de la même ville.
alter table public.sessions add column if not exists last_seen_at timestamptz not null default now();
create index if not exists sessions_seen_idx on public.sessions (last_seen_at);
alter table public.app_settings add column if not exists presence_minutes int not null default 3;

-- ---------- Options Premium v1.1 ---------------------------------------
alter table public.app_settings add column if not exists premium_daily_limit int not null default 25; -- bonbons par 24 h pour les abonnés
-- Bio : 80 caractères en gratuit, 160 en Premium (la limite fine est dans update_bio)
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'sessions_bio_check') then
    alter table public.sessions drop constraint sessions_bio_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sessions_bio_len') then
    alter table public.sessions add constraint sessions_bio_len check (bio is null or char_length(bio) <= 160);
  end if;
end $$;

-- ---------- Bonbons (compliments envoyés) --------------------------------
create table if not exists public.bonbons (
  id                   uuid primary key default gen_random_uuid(),
  sender_id            uuid not null references public.profiles(id) on delete cascade,
  recipient_id         uuid not null references public.profiles(id) on delete cascade,
  sender_pseudo        text not null,
  sender_home_city     text not null,
  sender_current_city  text not null,
  recipient_pseudo     text not null,
  compliment_id        int  not null check (compliment_id between 0 and 11),
  status               text not null default 'open' check (status in ('open', 'thanked', 'reported')),
  created_at           timestamptz not null default now()
);
create index if not exists bonbons_recipient_idx on public.bonbons (recipient_id, created_at desc);
create index if not exists bonbons_sender_idx    on public.bonbons (sender_id, created_at desc);

-- ---------- Blocages et signalements -------------------------------------
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  reported_id  uuid not null references public.profiles(id) on delete cascade,
  bonbon_id    uuid references public.bonbons(id) on delete set null,
  pseudo_seen  text,
  bio_seen     text,
  reason       text not null check (char_length(reason) <= 100),
  handled      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------- Premium (abonnement Stripe Billing) ------------------------
alter table public.profiles add column if not exists stripe_customer_id   text;
alter table public.profiles add column if not exists sub_id               text;
alter table public.profiles add column if not exists sub_status           text;          -- active, trialing, past_due, canceled…
alter table public.profiles add column if not exists sub_period_end       timestamptz;
alter table public.profiles add column if not exists sub_cancel_at_end    boolean not null default false;
alter table public.profiles add column if not exists accept_custom        boolean not null default true;  -- recevoir des mots personnalisés
-- Code Premium : permet de retrouver son abonnement sur un autre appareil, sans compte ni e-mail
alter table public.profiles add column if not exists recovery_code        text;
alter table public.profiles add column if not exists restore_fails        int not null default 0;
alter table public.profiles add column if not exists restore_fail_at      timestamptz;
create unique index if not exists profiles_recovery_code_idx on public.profiles (recovery_code) where recovery_code is not null;
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

alter table public.sessions add column if not exists avatar int not null default 0;  -- 0 = initiale ; 1 à 6 = avatars pixel Premium

-- Mots personnalisés (Premium) : un bonbon porte soit un compliment de la liste, soit un texte filtré
alter table public.bonbons add column if not exists custom_text text check (custom_text is null or char_length(custom_text) <= 140);
alter table public.bonbons alter column compliment_id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bonbons_content_chk') then
    alter table public.bonbons add constraint bonbons_content_chk check (compliment_id is not null or custom_text is not null);
  end if;
end $$;

-- ---------- Réponses et mini-conversations -----------------------------
-- Un bonbon peut être « renvoyé » en réponse à un autre (une fois par bonbon reçu)
alter table public.bonbons add column if not exists reply_to uuid references public.bonbons(id) on delete set null;
create index if not exists bonbons_reply_idx on public.bonbons (reply_to);
-- Bonbon animé (Premium) : 0 = aucun, 1 = cœurs, 2 = étoiles, 3 = confettis
alter table public.bonbons add column if not exists effect int not null default 0 check (effect between 0 and 3);
-- Note vocale (Premium) : fichier privé dans le stockage « vocaux », écoutable une seule fois
alter table public.bonbons add column if not exists voice_path      text;
alter table public.bonbons add column if not exists voice_opened_at timestamptz;   -- première écoute
alter table public.bonbons add column if not exists voice_gone      boolean not null default false; -- fichier supprimé
create index if not exists bonbons_voice_idx on public.bonbons (voice_gone) where voice_path is not null;
alter table public.profiles add column if not exists accept_voice boolean not null default true; -- recevoir des notes vocales
-- Carte de profil : photo TOUJOURS floue (seul un aperçu de 24 px est envoyé, la vraie photo
-- ne quitte jamais le téléphone) et note vocale courte (5 s, 10 s en Premium)
alter table public.profiles add column if not exists profile_photo text
  check (profile_photo is null or (profile_photo like 'data:image/jpeg;base64,%' and char_length(profile_photo) <= 6000));
alter table public.profiles add column if not exists profile_voice text;
-- Photo (Premium) : arrive floutée, se révèle nette 10 secondes une seule fois, puis est effacée
alter table public.bonbons add column if not exists photo_path      text;
alter table public.bonbons add column if not exists photo_thumb     text check (photo_thumb is null or char_length(photo_thumb) <= 6000); -- minuscule aperçu flou
alter table public.bonbons add column if not exists photo_opened_at timestamptz;
alter table public.bonbons add column if not exists photo_gone      boolean not null default false;
create index if not exists bonbons_photo_idx on public.bonbons (photo_gone) where photo_path is not null;
alter table public.profiles add column if not exists accept_photo boolean not null default true; -- recevoir des photos

-- Mini-conversation : uniquement des phrases choisies dans une liste (phrase_id)
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  phrase_id     int  not null check (phrase_id between 0 and 29),
  created_at    timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at desc);
create index if not exists messages_time_idx on public.messages (created_at);
-- Conversation libre : texte écrit (200 caractères, filtré). Gratuit avec 1 personne
-- de sa ville par identité du jour ; Premium : sans limite.
alter table public.messages add column if not exists body text;
alter table public.messages alter column phrase_id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'messages_content') then
    alter table public.messages add constraint messages_content
      check ((phrase_id is not null or body is not null) and (body is null or char_length(body) between 1 and 200));
  end if;
end $$;

-- ---------- Verrouillage : aucun accès direct aux tables -----------------
alter table public.messages     enable row level security;
revoke all on public.messages from anon, authenticated;
alter table public.app_settings enable row level security;
alter table public.profiles     enable row level security;
alter table public.sessions     enable row level security;
alter table public.bonbons      enable row level security;
alter table public.blocks       enable row level security;
alter table public.reports      enable row level security;
revoke all on public.app_settings, public.profiles, public.sessions,
              public.bonbons, public.blocks, public.reports
  from anon, authenticated;

-- ---------- Outils internes ----------------------------------------------
create or replace function public.norm_city(t text)
returns text language sql immutable as $$
  select regexp_replace(
           translate(lower(trim(coalesce(t, ''))),
                     'àâäáãéèêëíìîïóòôöõúùûüçñ-''',
                     'aaaaaeeeeiiiiooooouuuucn  '),
           '\s+', ' ', 'g')
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Renvoie NULL si l'utilisateur peut utiliser l'app, sinon un code d'erreur.
create or replace function public.access_problem(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when uid is null                         then 'AUTH'
    when p.id is null                        then 'AUTH'
    when p.banned                            then 'BANNED'
    when p.adult_confirmed_at is null        then 'ADULT'
    when s.paywall_enabled and p.paid_at is null then 'PAYWALL'
    else null end
  from public.app_settings s
  left join public.profiles p on p.id = uid
  where s.id = 1
$$;

create or replace function public.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                 where (blocker_id = a and blocked_id = b)
                    or (blocker_id = b and blocked_id = a))
$$;

-- Refuse les textes libres (pseudo, phrase, villes) qui contiennent un moyen
-- de contact, un lien ou un mot injurieux / sexuel. Renvoie true si problème.
drop function if exists public.text_problem(text);
create or replace function public.text_problem(t text, check_words boolean default true)
returns boolean language sql immutable as $$
  with n as (
    select ' ' || translate(lower(coalesce(t, '')),
                 'àâäáãéèêëíìîïóòôöõúùûüçñ013457$€',
                 'aaaaaeeeeiiiiooooouuuucnoieastse') || ' ' as x,
           lower(coalesce(t, '')) as raw
  )
  select
    -- numéro de téléphone (8 chiffres ou plus, avec ou sans séparateurs)
    raw ~ '(\d[\s.\-/]*){8,}'
    -- @pseudo, e-mail, liens
    or raw ~ '@\w'
    or raw ~ '(https?://|www\.)'
    or raw ~ '\w\.(com|fr|net|org|io|be|ch|me|ly|gg|app|co|tv|link|bio)\M'
    -- autres applis pour emmener la conversation ailleurs
    or x ~ '\m(insta|instagram|snap|snapchat|whatsapp|watsap|wa\.me|telegram|tiktok|facebook|fb|discord|onlyfans|mym|tinder|kik|wechat|messenger)\M'
    -- injures, contenus sexuels, haine (pas pour les villes : « Bitche » existe !)
    or check_words and x ~ '\m(con|connard|connasse|conne|salope|salop|pute|putain|pd|pede|encul\w*|ntm|fdp|batard|nique\w*|bite|chatte|couille\w*|sexe|sexy|nude\w*|nudes|porn\w*|cul|baise\w*|suce|suces|sucer|suceu\w*|branle\w*|bander|nazi\w*|hitler|negre\w*|negro|bougnoul\w*|youpin\w*|gouine|tapette|tarlouze|viol|viols|violer|violeur\w*|fuck\w*|shit|bitch\w*|dick|pussy|cock|slut|whore|nigg\w*|fag|fags|faggot\w*|cunt)\M'
  from n
$$;

-- La ville a-t-elle assez de monde pour ouvrir « Découvrir » ?
create or replace function public.city_ready(p_city text)
returns boolean language sql stable security definer set search_path = public as $$
  select count(distinct s.user_id) >= (select min_city_people from public.app_settings where id = 1)
  from public.sessions s join public.profiles p on p.id = s.user_id
  where s.expires_at > now() and not p.banned
    and s.last_seen_at > now() - make_interval(mins => (select presence_minutes from public.app_settings where id = 1))
    and public.norm_city(s.current_city) = public.norm_city(p_city)
$$;

create or replace function public.is_premium(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select sub_status in ('active', 'trialing') from public.profiles where id = uid), false)
$$;

-- Nombre de bonbons par 24 h : plus élevé pour les abonnés Premium
create or replace function public.daily_limit_for(uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.is_premium(uid) then st.premium_daily_limit else st.daily_send_limit end
  from public.app_settings st where st.id = 1
$$;

-- Vérifie un mot personnalisé. Renvoie le texte nettoyé, ou lève une erreur.
create or replace function public.check_custom(uid uuid, p_custom text, recipient uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare t text := nullif(trim(coalesce(p_custom, '')), '');
begin
  if t is null then return null; end if;
  if not public.is_premium(uid) then raise exception 'PREMIUM'; end if;
  if char_length(t) > 140 or public.text_problem(t) then raise exception 'BAD_TEXT'; end if;
  if not (select accept_custom from public.profiles where id = recipient) then raise exception 'NO_CUSTOM'; end if;
  return t;
end $$;

-- Note vocale jointe à un bonbon : 8 s en gratuit, 15 s en Premium ; destinataire d'accord, fichier déposé par l'expéditeur
create or replace function public.check_voice(uid uuid, p_voice text, recipient uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_voice is null or p_voice = '' then return; end if;
  -- Gratuit : 8 s maximum (≈ 50 Ko à 48 kbit/s ; marge pour l'en-tête du fichier)
  if not public.is_premium(uid) and coalesce((select (o.metadata->>'size')::bigint from storage.objects o
       where o.bucket_id = 'vocaux' and o.name = p_voice), 0) > 90000 then raise exception 'VOICE_LONG'; end if;
  if not coalesce((select accept_voice from public.profiles where id = recipient), true) then raise exception 'NO_VOICE'; end if;
  if split_part(p_voice, '/', 1) <> uid::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'vocaux' and o.name = p_voice)
     or exists (select 1 from public.bonbons b where b.voice_path = p_voice)
  then raise exception 'GONE'; end if;
end $$;

-- Photo jointe à un bonbon : Premium, destinataire d'accord, fichier déposé par l'expéditeur, aperçu flou minuscule
create or replace function public.check_photo(uid uuid, p_photo text, p_thumb text, recipient uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_photo is null or p_photo = '' then return; end if;
  if not public.is_premium(uid) then raise exception 'PREMIUM'; end if;
  if not coalesce((select accept_photo from public.profiles where id = recipient), true) then raise exception 'NO_PHOTO'; end if;
  if p_thumb is null or p_thumb not like 'data:image/jpeg;base64,%' or char_length(p_thumb) > 6000 then raise exception 'GONE'; end if;
  if split_part(p_photo, '/', 1) <> uid::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'photos' and o.name = p_photo)
     or exists (select 1 from public.bonbons b where b.photo_path = p_photo)
  then raise exception 'GONE'; end if;
end $$;

-- =====================================================================
-- Fonctions appelées par l'application
-- =====================================================================

-- État du compte et identité du jour en cours
create or replace function public.my_status()
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); res json;
begin
  if uid is null then raise exception 'AUTH'; end if;
  insert into public.profiles (id) values (uid) on conflict do nothing;
  update public.sessions set last_seen_at = now() where user_id = uid and expires_at > now();
  select json_build_object(
    'adult',          p.adult_confirmed_at is not null,
    'paid',           p.paid_at is not null,
    'paywall',        st.paywall_enabled,
    'banned',         p.banned,
    'receive_on',     p.receive_on,
    'same_city_only', p.same_city_only,
    'accept_custom',  p.accept_custom,
    'accept_voice',   p.accept_voice,
    'accept_photo',   p.accept_photo,
    'profile_photo',  p.profile_photo,
    'profile_voice',  p.profile_voice is not null,
    'premium',        coalesce(p.sub_status in ('active', 'trialing'), false),
    'sub_status',     p.sub_status,
    'sub_period_end', p.sub_period_end,
    'sub_cancel_at_end', p.sub_cancel_at_end,
    'daily_limit',    public.daily_limit_for(uid),
    'sent_today',     (select count(*) from public.bonbons
                        where sender_id = uid and created_at > now() - interval '24 hours'),
    'city_ready', coalesce((select public.city_ready(current_city) from public.sessions
                            where user_id = uid and expires_at > now()), false),
    'session', (select row_to_json(x) from (
                  select id, pseudo, moods, bio, current_city, home_city, expires_at, avatar
                  from public.sessions
                  where user_id = uid and expires_at > now()) x)
  ) into res
  from public.profiles p cross join public.app_settings st
  where p.id = uid and st.id = 1;
  return res;
end $$;

create or replace function public.confirm_adult()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH'; end if;
  update public.profiles set adult_confirmed_at = now()
  where id = auth.uid() and adult_confirmed_at is null;
end $$;

create or replace function public.start_session(
  p_pseudo text, p_moods text[], p_bio text, p_current_city text, p_home_city text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); problem text;
  allowed text[] := array['Joyeux·se','Rêveur·se','Curieux·se','Calme','De passage','Fatigué·e mais là',
                          'Bavard·e','Timide','En balade','Triste','Pas dans mon assiette'];
  -- Humeurs en plus pour Premium (doit correspondre à MOODS_PREMIUM dans app.js)
  premium_moods text[] := array['Inspiré·e','Nostalgique','Zen','Gourmand·e','Fêtard·e','Aventurier·ère'];
begin
  problem := public.access_problem(uid);
  if problem is not null then raise exception '%', problem; end if;
  if not (coalesce(p_moods, '{}') <@ (allowed || premium_moods)) then raise exception 'BAD_MOOD'; end if;
  -- Gratuit : 1 humeur de la liste de base. Premium : jusqu'à 2, dont les humeurs en plus.
  if not public.is_premium(uid)
     and (cardinality(coalesce(p_moods, '{}')) > 1 or coalesce(p_moods, '{}') && premium_moods)
  then raise exception 'PREMIUM'; end if;
  if cardinality(coalesce(p_moods, '{}')) > 2 then raise exception 'BAD_MOOD'; end if;
  if public.text_problem(p_pseudo) or public.text_problem(p_bio)
     or public.text_problem(p_current_city, false) or public.text_problem(p_home_city, false)
  then raise exception 'BAD_TEXT'; end if;

  delete from public.sessions where user_id = uid;
  insert into public.sessions (user_id, pseudo, moods, bio, current_city, home_city)
  values (uid,
          coalesce(nullif(trim(p_pseudo), ''), 'Quelqu''un de passage'),
          coalesce(p_moods, '{}'),
          nullif(trim(p_bio), ''),
          trim(p_current_city),
          coalesce(nullif(trim(p_home_city), ''), trim(p_current_city)));
  return public.my_status();
end $$;

create or replace function public.end_session()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.sessions where user_id = auth.uid();
end $$;

-- Personnes présentes dans la même ville que moi
drop function if exists public.discover();
create or replace function public.discover()
returns table (session_id uuid, pseudo text, moods text[], bio text,
               home_city text, local boolean, already_sent boolean, avatar int, accepts_custom boolean, accepts_voice boolean, accepts_photo boolean,
               profile_photo text, profile_voice text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me public.sessions%rowtype;
begin
  if public.access_problem(uid) is not null then return; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  if not found then return; end if;
  update public.sessions set last_seen_at = now() where id = me.id;
  if not public.city_ready(me.current_city) then return; end if;

  return query
  select s.id, s.pseudo, s.moods, s.bio, s.home_city,
         public.norm_city(s.home_city) = public.norm_city(me.current_city),
         exists (select 1 from public.bonbons b
                 where b.sender_id = uid and b.recipient_id = s.user_id
                   and b.created_at > now() - interval '24 hours'),
         case when public.is_premium(s.user_id) then s.avatar else 0 end,
         p.accept_custom, p.accept_voice, p.accept_photo,
         p.profile_photo, p.profile_voice
  from public.sessions s
  join public.profiles p on p.id = s.user_id
  where s.user_id <> uid
    and s.expires_at > now()
    and s.last_seen_at > now() - make_interval(mins => (select presence_minutes from public.app_settings where id = 1))
    and public.norm_city(s.current_city) = public.norm_city(me.current_city)
    and not p.banned
    and p.receive_on
    and (not p.same_city_only or public.norm_city(me.home_city) = public.norm_city(s.current_city))
    and not public.blocked_between(uid, s.user_id)
  order by s.created_at desc
  limit 60;
end $$;

drop function if exists public.send_bonbon(uuid, int);
drop function if exists public.send_bonbon(uuid, int, text);
drop function if exists public.send_bonbon(uuid, int, text, int);
drop function if exists public.send_bonbon(uuid, int, text, int, text);
create or replace function public.send_bonbon(p_session_id uuid, p_compliment int, p_custom text default null, p_effect int default 0,
                                              p_voice text default null, p_photo text default null, p_photo_thumb text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); problem text;
  me public.sessions%rowtype; them public.sessions%rowtype; tp public.profiles%rowtype;
  lim int; txt text;
begin
  problem := public.access_problem(uid);
  if problem is not null then raise exception '%', problem; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  if not found then raise exception 'NO_SESSION'; end if;
  select * into them from public.sessions where id = p_session_id and expires_at > now();
  if not found or them.user_id = uid then raise exception 'GONE'; end if;
  if not public.city_ready(me.current_city) then raise exception 'GONE'; end if;
  select * into tp from public.profiles where id = them.user_id;
  if tp.banned or not tp.receive_on
     or public.norm_city(them.current_city) <> public.norm_city(me.current_city)
     or (tp.same_city_only and public.norm_city(me.home_city) <> public.norm_city(them.current_city))
     or public.blocked_between(uid, them.user_id)
  then raise exception 'GONE'; end if;

  lim := public.daily_limit_for(uid);
  if (select count(*) from public.bonbons
      where sender_id = uid and created_at > now() - interval '24 hours') >= lim
  then raise exception 'LIMIT'; end if;
  if exists (select 1 from public.bonbons
             where sender_id = uid and recipient_id = them.user_id
               and created_at > now() - interval '24 hours')
  then raise exception 'ALREADY'; end if;
  if (select count(*) from public.bonbons
      where sender_id = uid and recipient_id = them.user_id
        and created_at > now() - interval '7 days')
     >= (select weekly_pair_limit from public.app_settings where id = 1)
  then raise exception 'WEEKLY'; end if;

  txt := public.check_custom(uid, p_custom, them.user_id);
  perform public.check_voice(uid, p_voice, them.user_id);
  perform public.check_photo(uid, p_photo, p_photo_thumb, them.user_id);
  if txt is null and (p_compliment is null or p_compliment not between 0 and 11) then raise exception 'GONE'; end if;
  insert into public.bonbons (sender_id, recipient_id, sender_pseudo, sender_home_city,
                              sender_current_city, recipient_pseudo, compliment_id, custom_text, effect, voice_path,
                              photo_path, photo_thumb)
  values (uid, them.user_id, me.pseudo, me.home_city, me.current_city, them.pseudo,
          case when txt is null then p_compliment end, txt,
          case when public.is_premium(uid) and p_effect between 0 and 3 then p_effect else 0 end,
          nullif(p_voice, ''), nullif(p_photo, ''), case when nullif(p_photo, '') is not null then p_photo_thumb end);
end $$;

-- Bonbons reçus (30 derniers jours)
drop function if exists public.inbox();
create or replace function public.inbox()
returns table (id uuid, sender_pseudo text, sender_home_city text, local boolean,
               compliment_id int, status text, created_at timestamptz,
               is_reply boolean, replied boolean, can_reply boolean, custom_text text, effect int,
               has_voice boolean, voice_heard boolean,
               has_photo boolean, photo_seen boolean, photo_thumb text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  return query
  select b.id, b.sender_pseudo, b.sender_home_city,
         public.norm_city(b.sender_home_city) = public.norm_city(b.sender_current_city),
         b.compliment_id, b.status, b.created_at,
         b.reply_to is not null,
         exists (select 1 from public.bonbons r where r.reply_to = b.id),
         (b.status <> 'reported'
          and b.created_at > now() - interval '24 hours'
          and not exists (select 1 from public.bonbons r where r.reply_to = b.id)
          and not public.blocked_between(uid, b.sender_id)),
         b.custom_text, b.effect,
         b.voice_path is not null,
         b.voice_gone or b.voice_opened_at is not null or b.created_at < now() - interval '24 hours',
         b.photo_path is not null,
         b.photo_gone or b.photo_opened_at is not null or b.created_at < now() - interval '24 hours',
         case when b.photo_path is not null and not b.photo_gone and b.photo_opened_at is null
                   and b.status <> 'reported' and b.created_at > now() - interval '24 hours'
              then b.photo_thumb end
  from public.bonbons b
  where b.recipient_id = uid
    and b.created_at > now() - interval '30 days'
    and (b.status = 'reported'
         or not exists (select 1 from public.blocks k
                        where k.blocker_id = uid and k.blocked_id = b.sender_id))
  order by b.created_at desc
  limit 100;
end $$;

-- Renvoyer un bonbon en réponse à un bonbon reçu (une seule fois, dans les 24 h)
drop function if exists public.reply_bonbon(uuid, int);
drop function if exists public.reply_bonbon(uuid, int, text);
drop function if exists public.reply_bonbon(uuid, int, text, int);
drop function if exists public.reply_bonbon(uuid, int, text, int, text);
create or replace function public.reply_bonbon(p_bonbon_id uuid, p_compliment int, p_custom text default null, p_effect int default 0,
                                               p_voice text default null, p_photo text default null, p_photo_thumb text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); problem text; me public.sessions%rowtype;
  orig public.bonbons%rowtype; tp public.profiles%rowtype; lim int; txt text;
begin
  problem := public.access_problem(uid);
  if problem is not null then raise exception '%', problem; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  if not found then raise exception 'NO_SESSION'; end if;
  select * into orig from public.bonbons where id = p_bonbon_id and recipient_id = uid;
  if not found or orig.status = 'reported' or orig.created_at < now() - interval '24 hours'
  then raise exception 'GONE'; end if;
  select * into tp from public.profiles where id = orig.sender_id;
  if tp.banned or not tp.receive_on or public.blocked_between(uid, orig.sender_id) then raise exception 'GONE'; end if;
  if exists (select 1 from public.bonbons where reply_to = orig.id) then raise exception 'ALREADY'; end if;
  lim := public.daily_limit_for(uid);
  if (select count(*) from public.bonbons
      where sender_id = uid and created_at > now() - interval '24 hours') >= lim
  then raise exception 'LIMIT'; end if;
  txt := public.check_custom(uid, p_custom, orig.sender_id);
  perform public.check_voice(uid, p_voice, orig.sender_id);
  perform public.check_photo(uid, p_photo, p_photo_thumb, orig.sender_id);
  if txt is null and (p_compliment is null or p_compliment not between 0 and 11) then raise exception 'GONE'; end if;
  insert into public.bonbons (sender_id, recipient_id, sender_pseudo, sender_home_city,
                              sender_current_city, recipient_pseudo, compliment_id, custom_text, reply_to, effect, voice_path,
                              photo_path, photo_thumb)
  values (uid, orig.sender_id, me.pseudo, me.home_city, me.current_city, orig.sender_pseudo,
          case when txt is null then p_compliment end, txt, orig.id,
          case when public.is_premium(uid) and p_effect between 0 and 3 then p_effect else 0 end,
          nullif(p_voice, ''), nullif(p_photo, ''), case when nullif(p_photo, '') is not null then p_photo_thumb end);
end $$;

-- Une mini-conversation est ouverte entre deux personnes quand :
-- leurs deux identités du jour sont actives, elles se sont envoyé chacune un bonbon
-- depuis le début de ces identités, et aucune n'a bloqué l'autre.
create or replace function public.chat_open(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.sessions sa
    join public.sessions sb on sb.user_id = b and sb.expires_at > now()
    join public.profiles pa on pa.id = a
    join public.profiles pb on pb.id = b
    where sa.user_id = a and sa.expires_at > now()
      and not pa.banned and not pb.banned
      and not public.blocked_between(a, b)
      and exists (select 1 from public.bonbons x where x.sender_id = a and x.recipient_id = b
                  and x.created_at >= greatest(sa.created_at, sb.created_at))
      and exists (select 1 from public.bonbons y where y.sender_id = b and y.recipient_id = a
                  and y.created_at >= greatest(sa.created_at, sb.created_at))
  )
$$;

-- Mes échanges ouverts (on désigne l'autre par l'identifiant de son identité du jour)
drop function if exists public.conversations();
create or replace function public.conversations()
returns table (session_id uuid, pseudo text, moods text[], last_phrase int, last_from_me boolean, last_at timestamptz, last_body text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me public.sessions%rowtype;
begin
  if public.access_problem(uid) is not null then return; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  if not found then return; end if;
  return query
  select s.id, s.pseudo, s.moods, m.phrase_id, m.sender_id = uid, m.created_at, m.body
  from public.sessions s
  left join lateral (
    select mm.phrase_id, mm.sender_id, mm.created_at, mm.body from public.messages mm
    where ((mm.sender_id = uid and mm.recipient_id = s.user_id) or (mm.sender_id = s.user_id and mm.recipient_id = uid))
      and mm.created_at >= greatest(me.created_at, s.created_at)
    order by mm.created_at desc limit 1) m on true
  where s.expires_at > now() and s.user_id <> uid
    and s.user_id in (select bb.sender_id from public.bonbons bb where bb.recipient_id = uid and bb.created_at > now() - interval '24 hours')
    and public.chat_open(uid, s.user_id)
  order by coalesce(m.created_at, s.created_at) desc;
end $$;

-- Les messages d'un échange
drop function if exists public.thread(uuid);
create or replace function public.thread(p_session_id uuid)
returns table (mine boolean, phrase_id int, created_at timestamptz, body text)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me public.sessions%rowtype; them public.sessions%rowtype;
begin
  if public.access_problem(uid) is not null then raise exception 'AUTH'; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  select * into them from public.sessions where id = p_session_id and expires_at > now();
  if me.id is null or them.id is null or not public.chat_open(uid, them.user_id) then raise exception 'GONE'; end if;
  return query
  select m.sender_id = uid, m.phrase_id, m.created_at, m.body
  from public.messages m
  where ((m.sender_id = uid and m.recipient_id = them.user_id) or (m.sender_id = them.user_id and m.recipient_id = uid))
    and m.created_at >= greatest(me.created_at, them.created_at)
  order by m.created_at asc
  limit 200;
end $$;

-- Envoyer une phrase toute faite
create or replace function public.send_phrase(p_session_id uuid, p_phrase int)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); problem text; them public.sessions%rowtype;
begin
  problem := public.access_problem(uid);
  if problem is not null then raise exception '%', problem; end if;
  if p_phrase is null or p_phrase not between 0 and 29 then raise exception 'GONE'; end if;
  if p_phrase >= 12 and not public.is_premium(uid) then raise exception 'PREMIUM'; end if;
  select * into them from public.sessions where id = p_session_id and expires_at > now();
  if not found or them.user_id = uid or not public.chat_open(uid, them.user_id) then raise exception 'GONE'; end if;
  if exists (select 1 from public.messages where sender_id = uid and recipient_id = them.user_id
             and created_at > now() - interval '2 seconds') then raise exception 'SLOW'; end if;
  if (select count(*) from public.messages where sender_id = uid and recipient_id = them.user_id
      and created_at > now() - interval '24 hours') >= 60 then raise exception 'LIMIT_CHAT'; end if;
  insert into public.messages (sender_id, recipient_id, phrase_id) values (uid, them.user_id, p_phrase);
  delete from public.messages where created_at < now() - interval '2 days';  -- rien n'est gardé longtemps
end $$;

-- Écrire un message libre (200 caractères, filtré comme les pseudos)
create or replace function public.send_text(p_session_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); problem text; me public.sessions%rowtype; them public.sessions%rowtype;
        t text := nullif(trim(coalesce(p_body, '')), '');
begin
  problem := public.access_problem(uid);
  if problem is not null then raise exception '%', problem; end if;
  if t is null then return; end if;
  if char_length(t) > 200 or public.text_problem(t) then raise exception 'BAD_TEXT'; end if;
  select * into me from public.sessions where user_id = uid and expires_at > now();
  select * into them from public.sessions where id = p_session_id and expires_at > now();
  if me.id is null or them.id is null or them.user_id = uid or not public.chat_open(uid, them.user_id) then raise exception 'GONE'; end if;
  if not public.is_premium(uid) then
    -- Gratuit : une personne de sa ville, une seule par identité du jour
    if public.norm_city(me.current_city) <> public.norm_city(them.current_city) then raise exception 'SAME_CITY'; end if;
    if exists (select 1 from public.messages m where m.sender_id = uid and m.body is not null
               and m.created_at >= me.created_at and m.recipient_id <> them.user_id) then raise exception 'ONE_CHAT'; end if;
  end if;
  if exists (select 1 from public.messages where sender_id = uid and recipient_id = them.user_id
             and created_at > now() - interval '2 seconds') then raise exception 'SLOW'; end if;
  if (select count(*) from public.messages where sender_id = uid and recipient_id = them.user_id
      and created_at > now() - interval '24 hours') >= 60 then raise exception 'LIMIT_CHAT'; end if;
  insert into public.messages (sender_id, recipient_id, body) values (uid, them.user_id, t);
  delete from public.messages where created_at < now() - interval '2 days';  -- rien n'est gardé longtemps
end $$;

-- Bonbons envoyés (pour voir les « merci »)
drop function if exists public.sent();
create or replace function public.sent()
returns table (id uuid, recipient_pseudo text, compliment_id int, thanked boolean, created_at timestamptz, custom_text text,
               has_voice boolean, voice_heard boolean, has_photo boolean, photo_seen boolean)
language sql security definer set search_path = public as $$
  select b.id, b.recipient_pseudo, b.compliment_id, b.status = 'thanked', b.created_at, b.custom_text,
         b.voice_path is not null, b.voice_opened_at is not null,
         b.photo_path is not null, b.photo_opened_at is not null
  from public.bonbons b
  where b.sender_id = auth.uid() and b.created_at > now() - interval '30 days'
  order by b.created_at desc
  limit 100
$$;

create or replace function public.thank_bonbon(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bonbons set status = 'thanked'
  where id = p_id and recipient_id = auth.uid() and status = 'open';
end $$;

-- Signaler = bloquer définitivement. 3 signalements distincts en 30 jours = compte suspendu.
create or replace function public.report(p_reason text, p_bonbon_id uuid default null, p_session_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target uuid; seen_pseudo text; seen_bio text;
begin
  if uid is null then raise exception 'AUTH'; end if;
  if p_bonbon_id is not null then
    select sender_id, sender_pseudo into target, seen_pseudo
    from public.bonbons where id = p_bonbon_id and recipient_id = uid;
  elsif p_session_id is not null then
    select user_id, pseudo, bio into target, seen_pseudo, seen_bio
    from public.sessions where id = p_session_id;
  end if;
  if target is null or target = uid then raise exception 'GONE'; end if;

  insert into public.reports (reporter_id, reported_id, bonbon_id, pseudo_seen, bio_seen, reason)
  values (uid, target, p_bonbon_id, seen_pseudo, seen_bio, left(coalesce(p_reason, 'Autre'), 100));
  insert into public.blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
  if p_bonbon_id is not null then
    update public.bonbons set status = 'reported' where id = p_bonbon_id;
  end if;

  if (select count(distinct reporter_id) from public.reports
      where reported_id = target and created_at > now() - interval '30 days') >= 3 then
    update public.profiles set banned = true where id = target;
    delete from public.sessions where user_id = target;
  end if;
end $$;

-- Ajouter ou modifier ses « quelques mots » (facultatif) sur l'identité du jour
create or replace function public.update_bio(p_bio text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b text := nullif(trim(coalesce(p_bio, '')), '');
begin
  if uid is null then raise exception 'AUTH'; end if;
  if b is not null and char_length(b) > (case when public.is_premium(uid) then 160 else 80 end) then raise exception 'BAD_TEXT'; end if;
  if public.text_problem(b) then raise exception 'BAD_TEXT'; end if;
  update public.sessions set bio = b where user_id = uid and expires_at > now();
  if not found then raise exception 'NO_SESSION'; end if;
  return public.my_status();
end $$;

-- Bloquer sans signaler : on ne se voit plus, on ne peut plus s'écrire, sans accusation.
create or replace function public.block_only(p_bonbon_id uuid default null, p_session_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target uuid;
begin
  if uid is null then raise exception 'AUTH'; end if;
  if p_bonbon_id is not null then
    select sender_id into target from public.bonbons where id = p_bonbon_id and recipient_id = uid;
  elsif p_session_id is not null then
    select user_id into target from public.sessions where id = p_session_id;
  end if;
  if target is null or target = uid then raise exception 'GONE'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, target) on conflict do nothing;
end $$;

drop function if exists public.update_settings(boolean, boolean);
drop function if exists public.update_settings(boolean, boolean, boolean);
drop function if exists public.update_settings(boolean, boolean, boolean, boolean);
create or replace function public.update_settings(p_receive_on boolean default null, p_same_city_only boolean default null,
                                                  p_accept_custom boolean default null, p_accept_voice boolean default null,
                                                  p_accept_photo boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set receive_on = coalesce(p_receive_on, receive_on),
      same_city_only = coalesce(p_same_city_only, same_city_only),
      accept_custom = coalesce(p_accept_custom, accept_custom),
      accept_voice = coalesce(p_accept_voice, accept_voice),
      accept_photo = coalesce(p_accept_photo, accept_photo)
  where id = auth.uid();
end $$;

-- Code Premium au format BONBON-XXXX-XXXX-XXXX (60 bits d'aléa, sans caractères ambigus)
create or replace function public.new_recovery_code()
returns text language plpgsql volatile as $$
declare alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; b bytea := uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid());
  c text := ''; i int;
begin
  for i in 0..11 loop
    c := c || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
    if i in (3, 7) then c := c || '-'; end if;
  end loop;
  return 'BONBON-' || c;
end $$;

-- Mon code Premium (créé au premier appel, seulement si Premium est actif)
create or replace function public.my_premium_code()
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); code text; tries int := 0;
begin
  if uid is null or not public.is_premium(uid) then return null; end if;
  select recovery_code into code from public.profiles where id = uid;
  while code is null and tries < 5 loop
    begin
      update public.profiles set recovery_code = public.new_recovery_code() where id = uid returning recovery_code into code;
    exception when unique_violation then tries := tries + 1;
    end;
  end loop;
  return code;
end $$;

-- Récupérer Premium sur cet appareil grâce au code (5 essais ratés max par heure)
create or replace function public.restore_premium(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me public.profiles%rowtype; src public.profiles%rowtype; c text;
begin
  if uid is null then raise exception 'AUTH'; end if;
  select * into me from public.profiles where id = uid;
  if me.restore_fails >= 5 and me.restore_fail_at > now() - interval '1 hour' then raise exception 'TOO_MANY'; end if;
  c := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if c like 'BONBON%' then c := substr(c, 7); end if;
  if length(c) = 12 then c := 'BONBON-' || substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4); end if;
  select * into src from public.profiles where recovery_code = c and id <> uid;
  if not found then
    update public.profiles
    set restore_fails = case when restore_fail_at > now() - interval '1 hour' then restore_fails + 1 else 1 end,
        restore_fail_at = now()
    where id = uid;
    raise exception 'BAD_CODE';
  end if;
  if not coalesce(src.sub_status in ('active', 'trialing', 'past_due'), false) then raise exception 'NOT_ACTIVE'; end if;
  -- On déplace l'abonnement de l'ancien appareil vers celui-ci
  update public.profiles set stripe_customer_id = null, sub_id = null, sub_status = null, sub_period_end = null,
         sub_cancel_at_end = false, recovery_code = null where id = src.id;
  update public.profiles set stripe_customer_id = src.stripe_customer_id, sub_id = src.sub_id, sub_status = src.sub_status,
         sub_period_end = src.sub_period_end, sub_cancel_at_end = src.sub_cancel_at_end, recovery_code = src.recovery_code,
         restore_fails = 0
  where id = uid;
  return public.my_status();
end $$;

-- Avatar pixel de l'identité du jour (Premium)
create or replace function public.set_avatar(p_avatar int)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH'; end if;
  if p_avatar is null or p_avatar not between 0 and 6 then raise exception 'GONE'; end if;
  if p_avatar > 0 and not public.is_premium(uid) then raise exception 'PREMIUM'; end if;
  update public.sessions set avatar = p_avatar where user_id = uid and expires_at > now();
  if not found then raise exception 'NO_SESSION'; end if;
  return public.my_status();
end $$;

-- Droit à l'effacement (RGPD) : supprime le compte et toutes ses données
create or replace function public.delete_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'AUTH'; end if;
  -- Un abonnement encore actif doit d'abord être résilié, sinon il continuerait d'être prélevé
  if exists (select 1 from public.profiles where id = auth.uid()
             and sub_status in ('active', 'trialing', 'past_due') and not sub_cancel_at_end)
  then raise exception 'CANCEL_FIRST'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Notes vocales : stockage privé ------------------------------
-- Espace « vocaux » : privé, 400 Ko max par fichier (15 s de voix), audio uniquement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vocaux', 'vocaux', false, 400000,
        array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- Déposer : chacun dans son propre dossier (la durée est vérifiée à l'envoi du bonbon)
create or replace function public.voice_upload_ok(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text
$$;
-- Lire : seulement le destinataire, pendant les 2 minutes qui suivent l'ouverture
create or replace function public.voice_read_ok(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bonbons b
                 where b.voice_path = p_name and b.recipient_id = auth.uid() and not b.voice_gone
                   and b.status <> 'reported'
                   and b.voice_opened_at > now() - interval '2 minutes')
  or exists (select 1 from public.profiles p
             join public.sessions them on them.user_id = p.id and them.expires_at > now()
             join public.sessions me on me.user_id = auth.uid() and me.expires_at > now()
             where p.profile_voice = p_name and p.id <> auth.uid() and not p.banned
               and public.norm_city(them.current_city) = public.norm_city(me.current_city)
               and not public.blocked_between(auth.uid(), p.id))
  or (split_part(p_name, '/', 1) = auth.uid()::text)  -- réécouter son propre vocal
$$;
-- Effacer : son propre fichier (ex. envoi annulé)
create or replace function public.voice_delete_ok(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and split_part(p_name, '/', 1) = auth.uid()::text
$$;

drop policy if exists vocaux_insert on storage.objects;
create policy vocaux_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vocaux' and public.voice_upload_ok(name));
drop policy if exists vocaux_select on storage.objects;
create policy vocaux_select on storage.objects for select to authenticated
  using (bucket_id = 'vocaux' and public.voice_read_ok(name));
drop policy if exists vocaux_delete on storage.objects;
create policy vocaux_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vocaux' and public.voice_delete_ok(name));

-- Écouter une note vocale : ouvre une fenêtre de 2 minutes, une seule fois
create or replace function public.open_voice(p_bonbon_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b public.bonbons%rowtype;
begin
  if uid is null then raise exception 'AUTH'; end if;
  select * into b from public.bonbons where id = p_bonbon_id and recipient_id = uid;
  if not found or b.voice_path is null or b.voice_gone or b.status = 'reported'
     or b.created_at < now() - interval '24 hours'
     or (b.voice_opened_at is not null and b.voice_opened_at < now() - interval '2 minutes')
  then raise exception 'HEARD'; end if;
  update public.bonbons set voice_opened_at = coalesce(voice_opened_at, now()) where id = b.id;
  return b.voice_path;
end $$;

-- ---------- Photos : stockage privé ------------------------------------
-- Espace « photos » : privé, 1,5 Mo max, JPEG/WebP (l'app réduit la photo et retire ses métadonnées)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 1500000, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
                               allowed_mime_types = excluded.allowed_mime_types;

-- Lire : seulement le destinataire, pendant les 2 minutes qui suivent la révélation
create or replace function public.photo_read_ok(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bonbons b
                 where b.photo_path = p_name and b.recipient_id = auth.uid() and not b.photo_gone
                   and b.status <> 'reported'
                   and b.photo_opened_at > now() - interval '2 minutes')
$$;
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.voice_upload_ok(name));   -- même règle : Premium, son dossier
drop policy if exists photos_select on storage.objects;
create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.photo_read_ok(name));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.voice_delete_ok(name));

-- Révéler une photo : une seule fois
create or replace function public.open_photo(p_bonbon_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); b public.bonbons%rowtype;
begin
  if uid is null then raise exception 'AUTH'; end if;
  select * into b from public.bonbons where id = p_bonbon_id and recipient_id = uid;
  if not found or b.photo_path is null or b.photo_gone or b.status = 'reported'
     or b.created_at < now() - interval '24 hours'
     or b.photo_opened_at < now() - interval '30 seconds'   -- 30 s de tolérance si le chargement a échoué
  then raise exception 'SEEN'; end if;
  update public.bonbons set photo_opened_at = coalesce(photo_opened_at, now()) where id = b.id;
  return b.photo_path;
end $$;

-- Nettoyage commun (vocaux et photos), appelé par la fonction « nettoyage-vocaux » avec la clé service
create or replace function public.media_to_delete()
returns table (bucket text, path text) language sql stable security definer set search_path = public as $$
  select 'vocaux', v.path from public.voices_to_delete() v
  union all
  select 'photos', b.photo_path from public.bonbons b
  where b.photo_path is not null and not b.photo_gone
    and (b.photo_opened_at < now() - interval '3 minutes'
         or b.status = 'reported'
         or b.created_at < now() - interval '24 hours')
  union all
  select 'photos', o.name from storage.objects o
  where o.bucket_id = 'photos' and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.bonbons b where b.photo_path = o.name and not b.photo_gone
                    and b.created_at > now() - interval '24 hours' and b.status <> 'reported'
                    and (b.photo_opened_at is null or b.photo_opened_at > now() - interval '3 minutes'))
  limit 1000
$$;
create or replace function public.media_deleted(p_bucket text, p_paths text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_bucket = 'vocaux' then update public.bonbons set voice_gone = true where voice_path = any(p_paths);
  elsif p_bucket = 'photos' then update public.bonbons set photo_gone = true where photo_path = any(p_paths);
  end if;
end $$;

-- Nettoyage (appelé par la fonction « nettoyage-vocaux », avec la clé service) :
-- vocaux écoutés depuis plus de 5 min, signalés, de plus de 24 h, ou fichiers orphelins.
-- ---------- Carte de profil -------------------------------------------
create or replace function public.set_profile_photo(p_thumb text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); t text := nullif(p_thumb, '');
begin
  if uid is null then raise exception 'AUTH'; end if;
  if t is not null and (t not like 'data:image/jpeg;base64,%' or char_length(t) > 6000) then raise exception 'GONE'; end if;
  update public.profiles set profile_photo = t where id = uid;
  return public.my_status();
end $$;

create or replace function public.set_profile_voice(p_path text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v text := nullif(p_path, ''); sz bigint;
begin
  if uid is null then raise exception 'AUTH'; end if;
  if v is not null then
    select (o.metadata->>'size')::bigint into sz from storage.objects o where o.bucket_id = 'vocaux' and o.name = v;
    if split_part(v, '/', 1) <> uid::text or sz is null then raise exception 'GONE'; end if;
    -- 5 s en gratuit, 10 s en Premium (à 48 kbit/s, avec une marge pour l'en-tête du fichier)
    if sz > (case when public.is_premium(uid) then 75000 else 45000 end) then raise exception 'VOICE_LONG'; end if;
  end if;
  update public.profiles set profile_voice = v where id = uid;   -- l'ancien fichier part au prochain nettoyage
  return public.my_status();
end $$;

create or replace function public.voices_to_delete()
returns table (path text) language sql stable security definer set search_path = public as $$
  select b.voice_path from public.bonbons b
  where b.voice_path is not null and not b.voice_gone
    and (b.voice_opened_at < now() - interval '5 minutes'
         or b.status = 'reported'
         or b.created_at < now() - interval '24 hours')
  union
  select o.name from storage.objects o
  where o.bucket_id = 'vocaux' and o.created_at < now() - interval '1 hour'
    and not exists (select 1 from public.bonbons b where b.voice_path = o.name and not b.voice_gone
                    and b.created_at > now() - interval '24 hours' and b.status <> 'reported'
                    and (b.voice_opened_at is null or b.voice_opened_at > now() - interval '5 minutes'))
    and not exists (select 1 from public.profiles p where p.profile_voice = o.name)
  limit 500
$$;
create or replace function public.voices_deleted(p_paths text[])
returns void language sql security definer set search_path = public as $$
  update public.bonbons set voice_gone = true where voice_path = any(p_paths)
$$;

-- ---------- Droits d'exécution -------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_status(), public.confirm_adult(),
  public.start_session(text, text[], text, text, text), public.end_session(),
  public.discover(), public.send_bonbon(uuid, int, text, int, text, text, text), public.open_voice(uuid), public.open_photo(uuid), public.photo_read_ok(text),
  public.voice_upload_ok(text), public.voice_read_ok(text), public.voice_delete_ok(text),
  public.inbox(), public.sent(), public.thank_bonbon(uuid),
  public.report(text, uuid, uuid), public.block_only(uuid, uuid), public.update_bio(text), public.update_settings(boolean, boolean, boolean, boolean, boolean),
  public.set_avatar(int), public.my_premium_code(), public.restore_premium(text), public.reply_bonbon(uuid, int, text, int, text, text, text), public.conversations(), public.thread(uuid), public.send_phrase(uuid, int), public.send_text(uuid, text), public.set_profile_photo(text), public.set_profile_voice(text),
  public.delete_account()
to authenticated;
revoke execute on function public.text_problem(text, boolean), public.city_ready(text), public.chat_open(uuid, uuid), public.daily_limit_for(uuid), public.check_voice(uuid, text, uuid), public.check_photo(uuid, text, text, uuid),
  public.is_premium(uuid), public.check_custom(uuid, text, uuid), public.new_recovery_code() from authenticated;
revoke execute on function public.voices_to_delete(), public.voices_deleted(text[]), public.media_to_delete(), public.media_deleted(text, text[]) from authenticated;
grant execute on function public.voices_to_delete(), public.voices_deleted(text[]), public.media_to_delete(), public.media_deleted(text, text[]) to service_role;
revoke execute on function public.handle_new_user(), public.access_problem(uuid),
  public.blocked_between(uuid, uuid) from authenticated;
