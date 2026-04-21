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
      { text: 'Getting Started', link: '/quick-start' },
      { text: 'Architecture', link: '/architecture-overview' },
      {
        text: 'Guides',
        items: [
          { text: 'Auth & Security', link: '/jwt-authentication-flow' },
          { text: 'Data & Database', link: '/multi-file-prisma-schema-design' },
          { text: 'Business Logic', link: '/order-checkout-pipeline' },
          { text: 'Infrastructure', link: '/redis-caching-layer' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Overview',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/overview' },
          { text: 'Quick Start', link: '/quick-start' },
          { text: 'Project Structure', link: '/project-structure-guide' },
        ],
      },
      {
        text: 'Architecture & Design',
        collapsed: false,
        items: [
          { text: 'Architecture Overview', link: '/architecture-overview' },
          { text: 'API Conventions', link: '/api-conventions-and-standards' },
          { text: 'Repository Pattern', link: '/repository-pattern' },
        ],
      },
      {
        text: 'Authentication & Security',
        collapsed: false,
        items: [
          { text: 'JWT Authentication', link: '/jwt-authentication-flow' },
          {
            text: 'Role-Based Access Control',
            link: '/role-based-access-control',
          },
          { text: 'OTP Verification', link: '/otp-verification-system' },
          {
            text: 'Contact Strategy Pattern',
            link: '/contact-strategy-pattern',
          },
        ],
      },
      {
        text: 'Data & Persistence',
        collapsed: false,
        items: [
          {
            text: 'Multi-File Prisma Schema',
            link: '/multi-file-prisma-schema-design',
          },
          {
            text: 'Prisma Service & Pool',
            link: '/prisma-service-with-pg-pool',
          },
        ],
      },
      {
        text: 'Business Logic',
        collapsed: false,
        items: [
          { text: 'Menu & Items', link: '/menu-and-item-management' },
          { text: 'Cart System', link: '/cart-system-with-variants' },
          { text: 'Order Checkout', link: '/order-checkout-pipeline' },
          {
            text: 'Rider Dispatch & H3',
            link: '/rider-dispatch-and-h3-geospatial',
          },
        ],
      },
      {
        text: 'Infrastructure & DevOps',
        collapsed: false,
        items: [
          { text: 'Redis Caching', link: '/redis-caching-layer' },
          { text: 'BullMQ Mail Queue', link: '/bullmq-mail-queue' },
          { text: 'Cloudinary Uploads', link: '/cloudinary-file-uploads' },
          {
            text: 'Global Response Interceptor',
            link: '/global-response-interceptor',
          },
          {
            text: 'Environment Configuration',
            link: '/environment-config-with-zod',
          },
        ],
      },
      {
        text: 'Monitoring & Documentation',
        collapsed: false,
        items: [
          { text: 'Admin Analytics', link: '/admin-dashboard-analytics' },
          { text: 'API Documentation', link: '/api-documentation-with-scalar' },
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
