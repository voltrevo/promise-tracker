# promise-tracker
Tracks promises to ensure proper cleanup

When testing, it can be difficult to know that your asynchronous tasks have all completed. If you ensure that every asynchronous action you take uses promises, perhaps by using promisification when needed, this tool can help determine that everything has completed.

## Basic Usage

```sh
npm install --save-dev promise-tracker
```

### Tape

```js
'use strict';

const doAsyncThings = require('do-async-things');
const promiseTracker = require('promise-tracker')();
const tape = require('tape');

test('async things finish running', (t) => {
  promiseTracker.install();
  
  doAsyncThings.run();
  
  promiseTracker.on('allPromisesCompleted', () => {
    t.equal(doAsyncThings.result, 42);
    t.end();
  });
});
```


### Mocha / Jasmine

```js
'use strict';

const assert = require('assert');

const doAsyncThings = require('do-async-things');
const promiseTracker = require('promise-tracker')();

describe('tests', () => {
  beforeEach(promiseTracker.install);
  beforeEach(promiseTracker.uninstall);

  it('test', (done) => {
    doAsyncThings.run();
    
    promiseTracker.on('allPromisesCompleted', () => {
      assert.equal(doAsyncThings.result, 42);
      done();
    });
  });
});
```
