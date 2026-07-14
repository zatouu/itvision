module.exports = {
  apps: [
    {
      name: 'ligey',
      script: './server.js',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // pm2 automatically picks up .env.local if present, but we also
      // pass through any variables already set in the shell.
    },
  ],
}
