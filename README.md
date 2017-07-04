# Wordhub V3 Server

[Wordhub](https://wordhub.io) is an application for storing and managing flashcards.

The data server and the clients are fully separated. This is the repository for the server code.

Only one client is currently available:

* a web client: [wordhub3-web](https://github.com/pomerantsev/wordhub3-web)

## Main files and components

* .babelrc: settings for [Babel](https://babeljs.io/) which transforms code written in future-version JavaScript to one supported by current NodeJs runtime.
* .eslintrc.yml: [ESLint](http://eslint.org/) options.
* db-config.js: used for configuring the database in the app code (at startup) and tests.
* database.json: same information, but in a format that the db-migrate utility understands.
* nodemon.json: commands that should run at certain points of server’s lifecycle.
* index.js is the server’s entry point. It does the following things:
  * It loads environment variables from a .env file.
  * It requires `babel-register` so that all subsequent `require`d files are parsed with the Babel parser. Currently, it means transforming ES6 `import`s into `require`s, and async functions to generators.
  * It runs `createServer` defined in src/app.js.
* src/app.js is responsible for creating the application itself (an express.js server) and setting up all routes.
* src/routes: the directory containing controller code for all routes.
* src/data/auth.js: authentication library.
* src/data/data.js: all communication with database is handled here.

## Running locally

Requires nodejs >= 6.

* Run `npm install`.
* Run `npm install -g db-migrate`.
* Run a local postgres server unless you’re planning to use a remote one. Here’s a short [installation tutorial](https://chartio.com/resources/tutorials/how-to-start-postgresql-server-on-mac-os-x/).
* Create a development and a test database (with arbitrary names). Here’s a [tutorial](https://www.codementor.io/devops/tutorial/getting-started-postgresql-server-mac-osx) including info on how to create databases.
* Set the following environment variables. An easy way to set them is to [create a .env file in the project’s root](https://www.npmjs.com/package/dotenv). The file is read on server startup.
  * `NODE_ENV` — automatically set by npm scripts to `development` or `test`.
  * `JWT_SECRET` — has to be assigned some value, e.g. `secret`. Doesn’t need to be a strong secret in a development environment.
  * `PGUSER_DEV`, `PGPASSWORD_DEV`, `PGHOST_DEV`, `PGPORT_DEV`, `PGDATABASE_DEV` — credentials for connecting to the postgres database. If running a postgres server locally, `PGHOST_DEV=localhost`, `PGPORT_DEV=5432`. `PGPASSWORD_DEV` can be omitted if no password is set.
  * Similarly, set the same vars with a `_TEST` suffix: `PGUSER_TEST`, `PGPASSWORD_TEST`, etc. You should use different databases for development and testing.
  * `PORT` - optional, the network port on which the application should run. Defaults to 3000.
* Run `npm run dev`.

## Deploying to production

AWS Elastic Beanstalk is currently used for api.wordhub.io (the original production data server).

Here are the main parameters of the environment:
* All work is unfortunately performed by the node server, including content gzipping. Some of it could be offloaded to a reverse proxy like nginx, but I have never used it before, and the traffic seems sufficiently low for now.
* Load balanced, auto scaling
* Only HTTPS connections permitted (no HTTP)
* Node version: 6
* The following environment variables are set: `NODE_ENV=production`, `JWT_SECRET` (can be any long secret value), and the database params: `PGHOST_PROD`, `PGPORT_PROD`, `PGDATABASE_PROD`, `PGUSER_PROD`, `PGPASSWORD_PROD`.
* AWS RDS is used as the database service.
