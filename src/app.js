import 'babel-polyfill';
import path from 'path';

import * as auth from './data/auth';

import GetDataRoute from './routes/get-data';
import SendDataRoute from './routes/send-data';
import SyncDataRoute from './routes/sync-data';

import LoginRoute from './routes/login';

import express from 'express';
import bodyParser from 'body-parser';

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/login', bodyParser.json(), LoginRoute);

app.get('/get-data', auth.viaToken, GetDataRoute);
app.post('/send-data', auth.viaToken, bodyParser.json(), SendDataRoute);

// Both sets and gets data in the same call
app.post(
  '/sync-data',
  auth.viaToken,
  bodyParser.json(),
  SyncDataRoute
);

app.listen(process.env.PORT || 3000);
