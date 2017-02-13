const configs = {
  development: {
    user: process.env.PGUSER_DEV,
    database: process.env.PGDATABASE_DEV,
    password: process.env.PGPASSWORD_DEV,
    host: process.env.PGHOST_DEV,
    port: process.env.PGPORT_DEV,
    max: 10,
    idleTimeoutMillis: 30000
  },
  test: {
    user: process.env.PGUSER_TEST,
    database: process.env.PGDATABASE_TEST,
    password: process.env.PGPASSWORD_TEST,
    host: process.env.PGHOST_TEST,
    port: process.env.PGPORT_TEST,
    max: 10,
    idleTimeoutMillis: 30000
  },
  production: {
    user: process.env.PGUSER_PROD,
    database: process.env.PGDATABASE_PROD,
    password: process.env.PGPASSWORD_PROD,
    host: process.env.PGHOST_PROD,
    port: process.env.PGPORT_PROD,
    max: 10,
    idleTimeoutMillis: 30000
  }
};

export default configs;
