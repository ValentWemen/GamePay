-- ============================================================
-- ENABLE REALTIME untuk Notifikasi Live Group Order
-- ============================================================
-- Jalankan di Supabase SQL Editor SETELAH schema utama.
-- Akan enable real-time subscription untuk table groups & group_members.
-- ============================================================

-- Enable Realtime untuk table group_members
-- Supaya host dapat notif saat ada member baru join / bayar
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;

-- Enable Realtime untuk table groups
-- Supaya member dapat notif saat group penuh / completed
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;

-- ============================================================
-- DONE!
-- ============================================================
-- Verify dengan:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Harus muncul row untuk 'group_members' dan 'groups'.
