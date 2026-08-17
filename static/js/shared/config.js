'use strict';
const CONFIG = {
  API_BASE: '/api',
  STATUS_URL: '/ping',
  VERSION_URL: '/app/v',
  API: {
    LAST: '/anime/last',
    LIST: '/api/list',
    INFO: '/api/info',
    BASIC_INFO: '/api/basic/info',
    IMAGE: '/api/img',
    SEARCH: '/api/search',
    DESCRIPTION: '/api/description',
    EPISODES: '/api/episodes',
    FCM_USER: '/api/user',
    IMAGE_PROXY: (url) => `/image?url=${encodeURIComponent(url)}`,
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
