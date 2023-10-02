import { createClient } from "@supabase/supabase-js";

//HACK: This is pure client side code so for now to this but later apply nextjs framework or webpack to bundle and minify
const supabaseUrl = "https://xrxqgzrdxkvoszkhvnzg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHFnenJkeGt2b3N6a2h2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTYxMDY2NDgsImV4cCI6MjAxMTY4MjY0OH0.7wQAVyg2lK41GxRae6B-lmEYR1ahWCHBDWoS09aiOnw";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
