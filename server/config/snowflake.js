const snowflake = require('snowflake-sdk');

// Create Snowflake connection
const connection = snowflake.createConnection({
  account:   process.env.SNOWFLAKE_ACCOUNT,
  username:  process.env.SNOWFLAKE_USER,
  password:  process.env.SNOWFLAKE_PASSWORD,
  database:  process.env.SNOWFLAKE_DATABASE,
  schema:    process.env.SNOWFLAKE_SCHEMA,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  role:      process.env.SNOWFLAKE_ROLE,
});

// Connect and export
const connectSnowflake = () => {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        console.error('❌ Snowflake connection failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Snowflake connected — ID:', conn.getId());
        resolve(conn);
      }
    });
  });
};

// Execute a query and return rows as promise
const executeQuery = (sqlText, binds = []) => {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Snowflake query error:', err.message);
          console.error('Query:', sqlText);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    });
  });
};

module.exports = { connection, connectSnowflake, executeQuery };