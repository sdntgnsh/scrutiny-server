// --- src/middleware/verifyToken.js ---
// This is the "bridge" between Supabase Auth and Firestore roles.

const supabaseAdmin = require("../config/supabase");
const db = require("../config/firebase");

const verifyToken = async (req, res, next) => {
  try {
    // --- STEP 1: Get the Token ---
    // The token is sent from Electron in the 'Authorization' header.
    // It looks like: "Bearer <the_long_jwt_token>"
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access Denied: No token provided" });
    }

    // --- STEP 2: Verify the Token with Supabase ---
    // We ask Supabase: "Is this token valid and who does it belong to?"
    // This call will fail if the token is expired, fake, or invalid.
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Access Denied: Invalid token" });
    }

    // --- STEP 3: Get User Role from Firestore ---
    // Now we have a valid Supabase user. We use their ID (a UUID)
    // as the document ID in our Firestore 'users' collection.
    const userRef = db.collection("users").doc(user.id);
    const doc = await userRef.get();

    let userData;

    if (!doc.exists) {
      // --- (Self-Heal Logic) ---
      // If the user signed up but this is their *first* API call,
      // their Firestore doc might not exist yet. Let's create it!
      console.log(`Creating profile for new user: ${user.id}`);
      const newUserProfile = {
        email: user.email,
        role: "student", // Default all new signups to 'student'
        createdAt: new Date().toISOString(),
      };
      await userRef.set(newUserProfile);
      userData = newUserProfile;
    } else {
      // User exists, get their data
      userData = doc.data();
    }

    // --- STEP 4: Attach User Info to the Request ---
    // We attach the verified user info to the 'req' object.
    // Now, any route *after* this middleware can access it.
    req.user = user; // The full Supabase user object
    req.userRole = userData.role; // The 'student' or 'teacher' role from Firestore

    // All checks passed! Call 'next()' to proceed to the
    // actual route handler (e.g., create-quiz, get-results).
    next();
  } catch (err) {
    // This catches any errors (e.g., Supabase is down, invalid token format)
    console.error("Error in auth middleware:", err);
    res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};

module.exports = verifyToken;
