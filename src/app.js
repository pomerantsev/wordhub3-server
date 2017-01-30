import 'babel-polyfill';
import path from 'path';

import GetDataRoute from './routes/get-data';
import SendDataRoute from './routes/send-data';

import express from 'express';
import bodyParser from 'body-parser';

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/get-data', GetDataRoute);
app.post('/send-data', bodyParser.json(), SendDataRoute);

app.listen(process.env.PORT || 3000);
