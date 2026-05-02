module.exports = {
  apps: [
    {
      name: 'pbr-api',
      script: 'dist/src/main.js',
      instances: 5,
      exec_mode: 'cluster',
      max_memory_restart: '1500M',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
    },
    {
      name: 'pbr-worker',
      script: 'dist/src/worker/index.js',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '1000M',
      wait_ready: true,
      kill_timeout: 10000,
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'pbr-cron',
      script: 'dist/src/cron/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      wait_ready: true,
      kill_timeout: 5000,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
