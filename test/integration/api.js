import 'mocha';
import {assert} from 'chai';

import fetch from 'node-fetch';

import * as helpers from '../helpers';

import createServer from '../../src/app';

async function postLogin (body) {
  return await fetch('http://localhost:5000/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
}

describe('api', () => {
  let server;

  before(async function () {
    await helpers.setupDb();
    server = createServer(5000);
  });

  beforeEach(async function () {
    await helpers.truncateTables();
    await helpers.seed();
  });

  after(async function () {
    server.close();
    await helpers.teardownDb();
  });

  describe('login', () => {
    describe('when user is not found', () => {
      it('sends an Unauthorized response', async function () {
        const res = await postLogin({email: 'invalid@example.com', password: 'dummypass'});
        assert.equal(401, res.status);
      });
    });
    describe('when password is incorrect', () => {
      it('sends an Unauthorized response', async function () {
        const res = await postLogin({email: 'email1@example.com', password: 'dummypass'});
        assert.equal(401, res.status);
      });
    });
    describe('when email and password are correct', () => {
      it('sends an Unauthorized response', async function () {
        const res = await postLogin({email: 'email1@example.com', password: 'pass1'});
        assert.equal(200, res.status);
        const data = await res.json();
        assert.isOk(data.success);
        assert.isOk(data.token);
      });
    });
  });

  describe('get-data', () => {
    describe('with an invalid token', () => {
      it('responds with 401', async function () {
        const res = await fetch('http://localhost:5000/get-data?token=invalid');
        assert.equal(401, res.status);
      });
    });
    describe('with a valid token', () => {
      let token;
      beforeEach(async function () {
        token = (await (await postLogin({email: 'email1@example.com', password: 'pass1'})).json()).token;
      });
      describe('with timestamp', () => {
        it('returns all user’s flashcards and repetitions updated after timestamp', async function () {
          const res = await fetch('http://localhost:5000/get-data?token=' + token + '&timestamp=1000');
          const data = await res.json();
          assert.equal(data.flashcards.length, 1);
          assert.equal(data.repetitions.length, 1);
          assert.equal(data.updatedAt, 6000);
        });
      });
      describe('without timestamp', () => {
        it('returns all user’s flashcards and repetitions', async function () {
          const res = await fetch('http://localhost:5000/get-data?token=' + token);
          const data = await res.json();
          assert.equal(data.flashcards.length, 2);
          assert.equal(data.repetitions.length, 2);
          assert.equal(data.updatedAt, 6000);
          assert.equal(data.flashcards[0].uuid, 'fl11');
          assert.equal(data.repetitions[0].uuid, 'rep111');
        });
      });
    });
  });

  describe('send-data', () => {
    describe('with an invalid token', () => {
      it('responds with 401', async function () {
        const res = await fetch('http://localhost:5000/send-data?token=invalid', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            flashcards: [{uuid: 'new', frontText: 'some text'}],
            repetitions: []
          })
        });
        assert.equal(401, res.status);
      });
    });
    describe('with a valid token', () => {
      let token;
      beforeEach(async function () {
        token = (await (await postLogin({email: 'email1@example.com', password: 'pass1'})).json()).token;
      });
      describe('with correct data', () => {
        describe('creating one flashcard', () => {
          it('creates the flashcard', async function () {
            assert.equal((await helpers.query('SELECT * FROM flashcards WHERE user_id = 1')).rowCount, 2);
            const res = await fetch('http://localhost:5000/send-data?token=' + token, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                flashcards: [{uuid: 'new', frontText: 'some text'}],
                repetitions: []
              })
            });
            assert.equal(200, res.status);
            assert.equal((await helpers.query(`SELECT * FROM flashcards WHERE user_id = 1`)).rowCount, 3);
          });
        });
        describe('creating a flashcard and updating a flashcard', () => {
          it('does what it needs to', async function () {
            assert.isNotOk((await helpers.query('SELECT * FROM flashcards WHERE uuid = \'fl11\'')).rows[0].front_text);
            const res = await fetch('http://localhost:5000/send-data?token=' + token, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                flashcards: [{
                  uuid: 'new', frontText: 'some text'
                }, {
                  uuid: 'fl11', frontText: 'new text'
                }],
                repetitions: []
              })
            });
            assert.equal(200, res.status);
            assert.equal((await helpers.query('SELECT * FROM flashcards WHERE uuid = \'fl11\'')).rows[0].front_text, 'new text');
            assert.equal((await helpers.query(`SELECT * FROM flashcards WHERE user_id = 1`)).rowCount, 3);
          });
        });
      });
    });
  });
});
