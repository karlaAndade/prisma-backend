// db/database.js
// En producción (Render) usa Neon (Postgres).
// En tu computadora (desarrollo local) sigue usando SQLite, sin tocar nada.

const isProduction = process.env.NODE_ENV === 'production';

let db;

if (isProduction) {
  // Neon (pg) ya devuelve .query() con $1,$2... y rows, tal cual lo esperan las rutas
  db = require('./neon');
} else {
  const sqliteDb = require('./database-sqlite');

  function toSqliteSql(sql) {
    return sql.replace(/\$\d+/g, '?');
  }

  function sanitizeParams(params) {
    return params.map(p => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
  }

  async function query(sql, params = []) {
    const sqliteSql = toSqliteSql(sql);
    const cleanParams = sanitizeParams(params);
    const stmt = sqliteDb.prepare(sqliteSql);

    const trimmed = sqliteSql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT');
    const hasReturning = trimmed.includes('RETURNING');

    if (isSelect || hasReturning) {
      const rows = stmt.all(...cleanParams);
      return { rows, rowCount: rows.length };
    } else {
      const info = stmt.run(...cleanParams);
      return { rows: [], rowCount: info.changes };
    }
  }

  db = { query };
}

module.exports = db;