const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'balances.json');

let balances = new Map();

// Load balances from disk (if present)
function loadFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(FILE_PATH)) {
      // create empty file
      fs.writeFileSync(FILE_PATH, JSON.stringify({}, null, 2));
      return;
    }
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    if (!raw) return;
    const obj = JSON.parse(raw);
    balances = new Map(Object.entries(obj).map(([k, v]) => [k, Number(v)]));
  } catch (err) {
    console.error('balance.js: failed to load balances from disk', err);
    balances = new Map();
  }
}

// Save balances to disk (synchronous to keep it simple and reliable)
function saveToDisk() {
  try {
    const obj = Object.fromEntries(balances);
    fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('balance.js: failed to save balances to disk', err);
  }
}

// Public API

/**
 * Get a user's balance (number).
 * @param {string} userId
 * @returns {number}
 */
function getBalance(userId) {
  return Number(balances.get(String(userId)) ?? 0);
}

/**
 * Add (or subtract) an amount to a user's balance.
 * Writes to disk immediately.
 * @param {string} userId
 * @param {number} amount - can be negative to subtract
 * @returns {number} new balance
 */
function addBalance(userId, amount) {
  const id = String(userId);
  const cur = getBalance(id);
  const next = cur + Number(amount);
  balances.set(id, next);
  saveToDisk();
  return next;
}

/**
 * Set a user's balance to a specific value.
 * @param {string} userId
 * @param {number} amount
 * @returns {number} new balance
 */
function setBalance(userId, amount) {
  const id = String(userId);
  const next = Number(amount);
  balances.set(id, next);
  saveToDisk();
  return next;
}

/**
 * Get all balances as a plain object { userId: balance }
 * @returns {Object}
 */
function getAllBalances() {
  return Object.fromEntries(balances);
}

/**
 * Reset all balances (clears map and saves).
 * Use with caution.
 */
function resetBalances() {
  balances = new Map();
  saveToDisk();
}

// initialize on require
loadFromDisk();

module.exports = {
  getBalance,
  addBalance,
  setBalance,
  getAllBalances,
  resetBalances
};
