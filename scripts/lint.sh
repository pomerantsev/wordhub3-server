#!/bin/bash

./node_modules/.bin/eslint index.js src/**/*.js

if [[ $? != 0 ]];
  then ./scripts/notify.sh Eslint "Eslint error"
fi
