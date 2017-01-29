import 'babel-polyfill';
import path from 'path';

import RootRoute from './routes/root';
import CreateFlashcardRoute from './routes/create-flashcard';
import UpdateFlashcardRoute from './routes/update-flashcard';
import PatchRepetitionRoute from './routes/patch-repetition-route';
import GetDataRoute from './routes/get-data';
import SendDataRoute from './routes/send-data';

import express from 'express';
import bodyParser from 'body-parser';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', RootRoute);

app.post('/flashcards', bodyParser.urlencoded({extended: false}), CreateFlashcardRoute);
app.post('/update-flashcard', bodyParser.urlencoded({extended: false}), UpdateFlashcardRoute);
app.post('/repetitions/:uuid', bodyParser.urlencoded({extended: false}), PatchRepetitionRoute);
app.get('/get-data', GetDataRoute);
app.post('/send-data', bodyParser.json(), SendDataRoute);

app.listen(process.env.PORT || 3000);
