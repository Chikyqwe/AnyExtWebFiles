'use strict';
const CONFIG = {
  API_BASE: 'https://anyext.qzz.io/api',
  STATUS_URL: 'https://anyext.qzz.io/ping',
  VERSION_URL: 'https://anyext.qzz.io/app/v',
  API: {
    LAST: 'https://anyext.qzz.io/anime/last',
    LIST: 'https://anyext.qzz.io/api/list',
    INFO: 'https://anyext.qzz.io/api/info',
    BASIC_INFO: 'https://anyext.qzz.io/api/basic/info',
    IMAGE: 'https://anyext.qzz.io/api/img',
    SEARCH: 'https://anyext.qzz.io/api/search',
    DESCRIPTION: 'https://anyext.qzz.io/api/description',
    EPISODES: 'https://anyext.qzz.io/api/episodes',
    FCM_USER: 'https://anyext.qzz.io/api/user',
    IMAGE_PROXY: (url) => `https://anyext.qzz.io/image?url=${encodeURIComponent(url)}`,
  },
  DB: {
    FAVORITES: { name: 'FavoritosDB', version: 1, store: 'favoritos' },
    CACHE: { name: 'AnimeCacheDB', version: 3, store: 'precached' },
  },
  EPISODE_SOURCES: ['FLV', 'TIO', 'ANIMEYTX'],
  BLUR: {
    fps: 10,
    scale: 0.25
  },
  PER_PAGE: 24,
  MIN_LOAD_MS: 3000,
  SEARCH_DEBOUNCE_MS: 250,
  LOGO_EASTER_EGG_CLICKS: 21,
  LOGO_EASTER_EGG_RESET_MS: 8000,
};
