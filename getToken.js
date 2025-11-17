// --- getToken.js ---
// This script logs in as a user and prints their access token.
// You MUST use your PUBLIC ANON KEY here.

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ❗️❗️ PASTE YOUR PUBLIC ANON KEY HERE (from Supabase Project > API > Project API keys)
const SUPABASE_ANON_KEY = "";

// --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- EDIT THESE TWO LINES TO LOGIN AS YOUR USER ---
const USER_EMAIL = "test-teacher-01@example.com";
const USER_PASSWORD = "SecurePassword123!";
// --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- --- --- --- --- --- --- --- --- --- --- --- ---

const supabase = createClient(process.env.SUPABASE_URL, SUPABASE_ANON_KEY);

async function signIn() {
  console.log(`Attempting to log in as: ${USER_EMAIL}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  if (error) {
    console.error("Login failed:", error.message);
    return;
  }

  console.log("\n✅ Login successful!");
  console.log("Your token is (copy everything between the lines):");
  console.log("-------------------------------------------------");
  console.log(data.session.access_token);
  console.log("-------------------------------------------------");
}

signIn();