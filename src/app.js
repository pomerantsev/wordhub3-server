import 'babel-polyfill';

import * as auth from './data/auth';

import GetDataRoute from './routes/get-data';
import SendDataRoute from './routes/send-data';
import SyncDataRoute from './routes/sync-data';
import GetUserRoute from './routes/get-user';
import CreateUserRoute from './routes/create-user';
import UpdateUserRoute from './routes/update-user';
import LoginRoute from './routes/login';

import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';

export default function createServer (port) {
  const app = express();

  /*
   * Make sure all outgoing data is gzipped.
   */
  app.use(compression());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/ping', (req, res) => {
    res.sendStatus(200);
  });

  app.post('/v1/login', bodyParser.json(), LoginRoute);

  app.get('/v1/get-data', auth.viaToken, GetDataRoute);
  app.post('/v1/send-data', auth.viaToken, bodyParser.json(), SendDataRoute);

  // Both sets and gets data in the same call
  app.post(
    '/v1/sync-data',
    auth.viaToken,
    bodyParser.json(),
    SyncDataRoute
  );

  app.get('/v1/user', auth.viaToken, GetUserRoute);
  app.post('/v1/user', bodyParser.json(), CreateUserRoute);
  app.post('/v1/update-user', auth.viaToken, bodyParser.json(), UpdateUserRoute);

  return app.listen(port);
}
