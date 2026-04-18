import { defineConfig } from 'vitepress';

/**
 * GitHub Pages project sites: https://<user>.github.io/<repo>/
 * CI sets DOCS_BASE=/<repo>/ (see .github/workflows/deploy-docs.yml).
 * Local preview: omit DOCS_BASE → base is /
 */
function normalizeBase(): string {
  const b = process.env.DOCS_BASE;
  if (!b || b === '/') return '/';
  const withSlash = b.startsWith('/') ? b : `/${b}`;
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`;
}

export default defineConfig({
  base: normalizeBase(),

  title: 'PBR Hut Backend',
  description: 'API and platform documentation',

  lastUpdated: true,

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Architecture', link: '/architecture' },
      {
        text: 'Auth',
        items: [
          { text: 'Auth module', link: '/auth/auth' },
          { text: 'Forgot password', link: '/auth/forgot-password' },
          { text: 'OTP module', link: '/otp/otp' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [{ text: 'Architecture', link: '/architecture' }],
      },
      {
        text: 'Auth',
        collapsed: false,
        items: [
          {
            text: 'Auth module',
            link: '/auth/auth',
            items: [
              {
                text: 'auth.cache.repository',
                link: '/auth/repositories/auth.cache.repository',
              },
            ],
          },
          { text: 'Forgot password', link: '/auth/forgot-password' },
          { text: 'OTP module', link: '/otp/otp' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/shaishab316' }],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'PBR Hut Backend documentation',
    },

    outline: {
      level: [2, 3],
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
