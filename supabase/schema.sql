-- ============================================================
-- GamePay - Supabase Database Schema (SAFE FOR EXISTING DB)
-- ============================================================
-- Script ini AMAN dijalankan di database yang sudah ada.
-- Akan auto-add kolom yang belum ada tanpa hapus data existing.
-- Bisa di-run berkali-kali (idempotent).
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  wallet_balance INTEGER DEFAULT 0,
  gamepay_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add kolom yang mungkin belum ada (untuk tabel profiles yang sudah ada)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gamepay_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Auto-create profile saat user baru daftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT UNIQUE,
  game_name TEXT NOT NULL,
  game_emoji TEXT,
  package_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  bonus INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Processing',
  user_game_id TEXT,
  server TEXT,
  payment_method TEXT,
  payment_parent TEXT,
  is_group_order BOOLEAN DEFAULT FALSE,
  group_code TEXT,
  members INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add kolom kalau belum ada
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_id TEXT UNIQUE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS game_emoji TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS bonus INTEGER DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_game_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS server TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_parent TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_group_order BOOLEAN DEFAULT FALSE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS group_code TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS members INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

-- ============================================================
-- 3. GROUPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES auth.users(id) NOT NULL,
  host_name TEXT NOT NULL,
  game_name TEXT NOT NULL,
  game_emoji TEXT,
  package_name TEXT NOT NULL,
  package_amount INTEGER NOT NULL,
  package_bonus INTEGER DEFAULT 0,
  package_price INTEGER NOT NULL,
  target_user_id TEXT,
  target_server TEXT,
  target_members INTEGER NOT NULL CHECK (target_members BETWEEN 2 AND 5),
  current_members INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add kolom kalau belum ada
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS game_emoji TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS package_bonus INTEGER DEFAULT 0;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS target_user_id TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS target_server TEXT;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS current_members INTEGER DEFAULT 1;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_groups_status ON public.groups(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_groups_code ON public.groups(code);

-- ============================================================
-- 4. GROUP_MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Add kolom kalau belum ada
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT FALSE;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- GROUPS
DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all" ON public.groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "groups_insert_auth" ON public.groups;
CREATE POLICY "groups_insert_auth" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "groups_update_member" ON public.groups;
CREATE POLICY "groups_update_member" ON public.groups
  FOR UPDATE USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

-- GROUP_MEMBERS
DROP POLICY IF EXISTS "group_members_select_all" ON public.group_members;
CREATE POLICY "group_members_select_all" ON public.group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
CREATE POLICY "group_members_insert_self" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "group_members_update_self" ON public.group_members;
CREATE POLICY "group_members_update_self" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 6. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- 7. BACKFILL: untuk user yang sudah ada tapi belum punya profile
-- ============================================================
INSERT INTO public.profiles (id, display_name, full_name)
SELECT
  u.id,
  split_part(u.email, '@', 1),
  split_part(u.email, '@', 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id);

-- ============================================================
-- 8. VERIFY (uncomment dan jalankan untuk cek hasilnya)
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles';
-- SELECT * FROM public.profiles LIMIT 5;

-- ============================================================
-- PATCH: Group Order v2 - Setiap member punya order sendiri
-- Tambahkan kolom order ke group_members
-- ============================================================
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS game_name TEXT;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS game_emoji TEXT;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS package_name TEXT;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS package_price INTEGER DEFAULT 0;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS target_user_id TEXT;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS target_server TEXT;

-- Update policy agar member bisa update order mereka sendiri (bukan hanya payment_status)
DROP POLICY IF EXISTS "group_members_update_self" ON public.group_members;
CREATE POLICY "group_members_update_self" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);
