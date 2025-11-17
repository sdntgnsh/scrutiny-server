// --- src/middleware/checkRole.js ---

// This is a "higher-order function". It's a function that
// returns ANOTHER function (the actual middleware).
// This lets us pass in the allowed roles (e.g., ['teacher']).

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    // We assume 'verifyToken' has already run and attached 'userRole'
    if (!req.userRole) {
      return res.status(403).json({ error: "Forbidden: No role attached" });
    }

    // Check if the user's role is in the list of allowed roles
    if (allowedRoles.includes(req.userRole)) {
      // User has the right role! Proceed.
      next();
    } else {
      // User is logged in, but not allowed to be here.
      return res.status(403).json({
        error: `Forbidden: This action requires one of these roles: ${allowedRoles.join(
          ", "
        )}`,
      });
    }
  };
};

module.exports = checkRole;
