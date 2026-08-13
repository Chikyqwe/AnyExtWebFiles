'use strict';

const State = {
  config: {},       // { id, uid, totalEp, ep, title }
  serverList: [],
  hls: null,
  blobUrl: null,
  wakeLock: null,
  mirror: 1,
  fullscreen: false,
  progressTimer: null,
  mainInitDone: false,
  // Blur
  animFrame: null,
  blurActive: true,
  blurEnabled: localStorage.getItem('blurRunning') !== 'false',
  blurLooping: false,
  blurFrame: false,
  blurLastTs: 0,
  blurBuffers: ['', ''],
  blurBufIdx: 0,
  blurRunning: false,
};

/* ============================================================
 * UTILS
 * ============================================================ */
