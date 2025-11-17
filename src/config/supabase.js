// --- src/config/supabase.js ---
// This file initializes the Supabase Admin Client.

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// WHY WE USE THE SERVICE_ROLE_KEY:
// The 'ANON_KEY' (anon key) is public, for your frontend.
// The 'SERVICE_ROLE_KEY' is a secret admin key for your backend.
// We MUST use the service key here because it's the only one
// with permission to verify JWTs from *any* user.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      // This tells the Supabase client to act as a "service"
      // and not try to manage user sessions on its own.
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabaseAdmin;
