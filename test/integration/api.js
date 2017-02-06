import 'mocha';
import {assert} from 'chai';

import fetch from 'node-fetch';

import * as helpers from '../helpers';

import createServer from '../../src/app';

async function postLogin (email, password) {
  return await fetch('http://localhost:5000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({email, password})
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
        const res = await postLogin('invalid@example.com', 'dummypass');
        assert.equal(401, res.status);
      });
    });
    describe('when password is incorrect', () => {
      it('sends an Unauthorized response', async function () {
        const res = await postLogin('email1@example.com', 'dummypass');
        assert.equal(401, res.status);
      });
    });
    describe('when email and password are correct', () => {
      it('sends an Unauthorized response', async function () {
        const res = await postLogin('email1@example.com', 'pass1');
        assert.equal(200, res.status);
        const data = await res.json();
        assert.isOk(data.success);
      });
    });
  });
});
