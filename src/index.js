'use strict';

const EventEmitter = require('events');

module.exports = () => {
  const promiseTracker = new EventEmitter();

  let installData;

  promiseTracker.install = ({ promiseContexts = [global] } = {}) => {
    if (installData) {
      throw new Error('promiseTracker is already installed (needs uninstall before re-use)');
    }

    installData = {};
    installData.apis = [];
    installData.promises = [];

    const methods = ['then', 'catch', 'finally'];

    for (const context of promiseContexts) {
      const apiInstallData = {};
      apiInstallData.context = context;
      installData.apis.push(apiInstallData);

      apiInstallData.originalMethods = {};

      for (const method of methods) {
        if (method === 'finally' && context.Promise.prototype[method] === undefined) {
          continue;
        }

        apiInstallData.originalMethods[method] = context.Promise.prototype[method];
      }

      for (const method of Object.keys(apiInstallData.originalMethods)) {
        context.Promise.prototype[method] = function(resolveHandler, rejectHandler) {
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
        };
      }

      // Used to check there hasn't been another proxy set up when uninstalling
      apiInstallData.proxyThen = context.Promise.prototype.then;
    }

    installData.promiseCreatedListener = (promise) => {
      installData.promises.push(promise);
    };

    promiseTracker.addListener('promiseCreated', installData.promiseCreatedListener);

    installData.promiseCompletedListener = (promise) => {
      if (installData.promises.length === 0) {
        return;
      }

      installData.promises = installData.promises.filter(otherPromise => promise !== otherPromise);

      if (installData.promises.length === 0) {
        promiseTracker.emit('allPromisesCompleted');
      }
    };

    promiseTracker.addListener('promiseCompleted', installData.promiseCompletedListener);
  }

  promiseTracker.uninstall = ({ quiet = false } = {}) => {
    if (!installData) {
      if (quiet) {
        return;
      }

      throw new Error('promiseTracker is not installed');
    }

    for (const apiInstallData of installData.apis) {
      if (apiInstallData.context.Promise.prototype.then !== apiInstallData.proxyThen) {
        throw new Error(
          'OriginalPromise.prototype.then is not the one that was set up by promiseTracker. This ' +
          'can happen if there is other promise tracking or tweaking going on.'
        );
      }
    }

    promiseTracker.removeListener('promiseCreated', installData.promiseCreatedListener);
    promiseTracker.removeListener('promiseCompleted', installData.promiseCompletedListener);

    installData = undefined;
  };

  return promiseTracker;
};
