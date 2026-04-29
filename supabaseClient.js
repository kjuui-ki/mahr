const SUPABASE_URL = "https://xdralutzorsucgtdfgqm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkcmFsdXR6b3JzdWNndGRmZ3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzY3MzYsImV4cCI6MjA4ODA1MjczNn0.nHYQKGb9eVY1TtSEq1dUmYGF6F5y-O_jIgJO6tbMNaY";

// var (not const) so it becomes a true global accessible across all script tags
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);