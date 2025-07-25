// models/userModel.js
const pool = require('../db');

exports.getUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0]; // Return single user or undefined
};
