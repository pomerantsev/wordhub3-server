# Wordhub V3 Server

[Wordhub](https://wordhub.io) is an application for storing and managing flashcards.

This is the third major version of the app. The source code for the [first](https://github.com/pomerantsev/wordhub) and [second](https://github.com/pomerantsev/wordhub_on_rails) version can also be found on Github.

The data server and the clients are fully separated. This is the repository for the server code.

Architectural improvements since V2:
* Server is now client-independent. Thus multiple clients (e.g. web, mobile) can be implemented separately.
* It is now possible for the application to work offline (if the client is properly implemented). Client may request the full list of user’s flashcards and repetitions and create and maintain a local copy, synchronizing it with the server’s master copy when network is available.
* The notion of days is crucial to the app, and the time when one day ends and another one starts affects user experience. V2’s architecture only allowed date switching to happen simultaneously for all users, regardless of their timezone. The new database has separate fields for server timestamps and user-defined dates, which means that clients can refer to the latter for calculating flashcard creation / repetition dates.

Only one client is currently available:

* a web client: [wordhub3-web](https://github.com/pomerantsev/wordhub3-web)

## Main files and components

* .babelrc: settings for [Babel](https://babeljs.io/) which transforms code written in future-version JavaScript to one supported by current NodeJs runtime.
* .eslintrc.yml: [ESLint](http://eslint.org/) options.
* db-config.js: used for configuring the database in the app code (at startup) and tests.
* database.json: same information, but in a format that the db-migrate utility understands.
* nodemon.json: commands that should run at certain points of server’s lifecycle.
* migrations/: JS and SQL code for migrating the database. There’s currently no schema file which would be really nice to add: both to see what the DB looks like and to not have to go through all migrations when setting up the dev and test databases.
* scripts/: some supporting bash scripts.
* index.js is the server’s entry point. It does the following things:
  * It loads environment variables from a .env file.
  * It requires `babel-register` so that all subsequent `require`d files are parsed with the Babel parser. Currently, it means transforming ES6 `import`s into `require`s, and async functions to generators.
  * It runs `createServer` defined in src/app.js.
* src/app.js is responsible for creating the application itself (an express.js server) and setting up all routes.
* src/routes/: the directory containing controller code for all routes.
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

Application is deployed using the CLI: `eb deploy` (refer to the [Elastic Beanstalk documentation](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)).

Here are the main parameters of the environment:
* All work is unfortunately performed by the node server, including content gzipping. Some of it could be offloaded to a reverse proxy like nginx, but I have never used it before, and the traffic seems sufficiently low for now.
* Load balanced, auto scaling
* Only HTTPS connections permitted (no HTTP)
* Node version: 6
* The following environment variables are set: `NODE_ENV=production`, `JWT_SECRET` (can be any long secret value), and the database params: `PGHOST_PROD`, `PGPORT_PROD`, `PGDATABASE_PROD`, `PGUSER_PROD`, `PGPASSWORD_PROD`.
* AWS RDS is used as the database service.
