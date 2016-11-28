'use strict';

const EventEmitter = require('events');

module.exports = function() {
  const promiseTracker = new EventEmitter();

  let installData;

  promiseTracker.install = (promiseContexts = [global]) => {
    if (installData) {
      throw new Error('promiseTracker is already installed (needs uninstall before re-use)');
    }

    installData = {};
    installData.apis = [];
    installData.promises = [];

    const methods = ['then', 'catch', 'finally'];

    for (const context of promiseContexts) {
      const OriginalPromise = context.Promise;
      const apiInstallData = {};
      apiInstallData.OriginalPromise = OriginalPromise;
      installData.apis.push(apiInstallData);

      context.Promise = (resolve, reject) => {
        const promise = new OriginalPromise(
          (resolveValue) => {
            OriginalPromise.resolve().then(() => {
              promiseTracker.emit('promiseCompleted', promise);
            });

            resolve(resolveValue);
          },
          (rejectValue) => {
            OriginalPromise.resolve().then(() => {
              promiseTracker.emit('promiseCompleted', promise);
            });

            reject(rejectValue);
          }
        );

        installData.promises.emit('promiseCreated', promise);

        return promise;
      }

      for (const staticMethod of Object.getOwnPropertyNames(OriginalPromise)) {
        if (['length', 'name', 'prototype'].indexOf(staticMethod) !== -1) {
          continue;
        }

        // Expecting reject, all, race, resolve here
        // TODO: Do these need to be intercepted too?

        context.Promise[staticMethod] = OriginalPromise[staticMethod];
      }

      apiInstallData.originalMethods = {};

      for (const method of methods) {
        if (method === 'finally' && api.prototype[method] === undefined) {
          continue;
        }

        apiInstallData.originalMethods[method] = api.prototype[method];
      }

      for (const method of Object.keys(apiInstallData.originalMethods)) {
        api.prototype[method] = function(resolveHandler, rejectHandler) {
          promiseTracker.emit('promiseCreated', this);

          const promise = apiInstallData.originalMethods[method].apply(
            this,
            [resolveHandler, rejectHandler]
          );

          const emitPromiseCompleted = () => promiseTracker.emit('promiseCompleted', this);

          apiInstallData.originalMethods.then.apply(
            this,
            [emitPromiseCompleted, emitPromiseCompleted]
          );
        }
      }

      apiInstallData.proxyThen = api.prototype.then;
    }

    promiseTracker.on('promiseCreated', (promise) => {
      installData.promises.push(promise);
    });

    promiseTracker.on('promiseCompleted', (promise) => {
      if (installData.promises.length === 0) {
        return;
      }

      installData.promises = installData.promises.filter(otherPromise => promise !== otherPromise);

      if (installData.promises.length === 0) {
        promiseTracker.emit('allPromisesCompleted');
      }
    });
  }

  return promiseTracker;
};
