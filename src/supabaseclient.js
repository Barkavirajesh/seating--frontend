import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://orofyxqsqcvgvzarhwfj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yb2Z5eHFzcWN2Z3Z6YXJod2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDI4ODksImV4cCI6MjA3OTM3ODg4OX0.znlVb7je7ZAYT3w2nXthdBSk_aLDS1fRBGsaoE4uep4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;