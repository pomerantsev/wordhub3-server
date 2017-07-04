#!/bin/bash

# TODO: due to my local bash version being old, ** globbing doesn’t work for me.
# Installing a newer version of bash, as suggested in https://gist.github.com/reggi/475793ea1846affbcfe8
# and https://apple.stackexchange.com/questions/193411/update-bash-to-version-4-0-on-osx,
# doesn’t do the trick for me. Only calling eslint from the command line
# with the given options works. But not calling it indirectly through `npm run lint`.
# Not sure how to fix this yet.
./node_modules/.bin/eslint index.js src/{,**/}*.js

if [[ $? != 0 ]];
  then ./scripts/notify.sh Eslint "Eslint error"
fi
