import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zvryupncfyobqkxibejx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cnl1cG5jZnlvYnFreGliZWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTQwOTYsImV4cCI6MjA5MTMzMDA5Nn0.7n0HLRglGSDxTijZ0nEiwrhKXe6mOBP5xHgChHOmhrg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define our App's Task type adapted for Supabase
export interface SupabaseTask {
  id: string; // uuid
  telegram_id: number; // bigint
  phone: string;
  country: string;
  account_type: 'Personal' | 'Business';
  verification_code?: string;
  image_url?: string;
  status: 'waiting' | 'success' | 'error';
  success_message?: string;
  created_at: string;
  updated_at: string;
}
