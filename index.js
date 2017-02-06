require('dotenv').config({silent: true});

require('babel-register')();

const createServer = require('./src/app').default;

createServer(process.env.PORT || 3000);
