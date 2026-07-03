// Supabase client init — shared by auth-widget.js, earn-ticker.js, rewarded-ads.js.
// Must load after the supabase-js CDN script and before those three files.
// The anon key is meant to be public (RLS + SECURITY DEFINER RPCs enforce access).
(function() {
    const SUPABASE_URL = 'https://wznrwewwwaqhxlhvfqol.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnJ3ZXd3d2FxaHhsaHZmcW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDU3NTQsImV4cCI6MjA5ODY4MTc1NH0.AIdVWor7kFucyV-g30B_waT6ScY6iCxXEujSx5JZ1AI';

    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
