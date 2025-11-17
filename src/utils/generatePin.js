// --- src/utils/generatePin.js ---

/**
 * Generates a random 6-digit numeric PIN.
 */
const generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
  generatePin,
};