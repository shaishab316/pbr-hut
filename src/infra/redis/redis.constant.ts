export const CACHE_KEY = {
  RESPONSE: (key: string) => `response:${key}`,
  PRIMARY_RESTAURANT: 'config:primary-restaurant',
  AUTH: {
    UNVERIFIED_USER: (identifier: string) => `auth:unverified:${identifier}`,
    PASSWORD_RESET: (identifier: string) => `auth:pwd-reset:${identifier}`,
  },
} as const;
