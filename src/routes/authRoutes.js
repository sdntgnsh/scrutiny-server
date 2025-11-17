// --- src/routes/authRoutes.js ---
//
// --- FIX ---
// REMOVED all 'cors' and 'corsOptions' code.
// The global middleware in server.js will handle this.
// ---

const express = require("express");
const router = express.Router();

// 3. Import controllers and middleware
const { register, getMe } = require("../controllers/authController");
const verifyToken = require("../middleware/verifyToken");

// The routes are now clean.
// The global cors() middleware from server.js
// will run BEFORE these.
router.post("/register", register);
router.get("/me", verifyToken, getMe);

module.exports = router;
