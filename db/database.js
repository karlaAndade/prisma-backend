require('dotenv').config();

const pool = require('./neon');

module.exports = {
  query: (text, params) => pool.query(text, params)
};