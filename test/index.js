'use strict';

const test = require('tape');

const promiseTracker = require('../src/index')();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('emits promise created on .then', (t) => {
  promiseTracker.install();

  let promiseCreatedCounter = 0;
  promiseTracker.on('promiseCreated', () => promiseCreatedCounter++);

  delay(10).then(() => {
    // Do nothing
  });

  promiseTracker.once('allPromisesCompleted', () => {
    setTimeout(() => {
      t.equal(promiseCreatedCounter, 1);
      promiseTracker.uninstall();
      t.end();
    }, 100);
  });
});
