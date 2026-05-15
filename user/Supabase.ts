import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fqhipiornapaqantoyax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxaGlwaW9ybmFwYXFhbnRveWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Mjk2NjksImV4cCI6MjA5MjIwNTY2OX0.d5fMVroLTYGyHTYfD--TjOpMR5KezqEsXnCXrvIEO44';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
