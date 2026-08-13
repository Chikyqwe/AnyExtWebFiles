'use strict';

const WakeLock = {
  async request() {
    try {
      State.wakeLock = await navigator.wakeLock.request('screen');
      State.wakeLock.addEventListener('release', () => console.info('[WakeLock] released'));
    } catch (err) {
      console.warn('[WakeLock]', err.message);
    }
  },
};
