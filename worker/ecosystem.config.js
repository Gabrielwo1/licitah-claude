module.exports = {
  apps: [
    {
      name: 'licitah-robo',
      script: 'dist/index.js',
      cwd: '/opt/licitah-worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // Reinicia automaticamente se cair
      exp_backoff_restart_delay: 5000,
      // Log
      out_file: '/opt/licitah-worker/logs/out.log',
      error_file: '/opt/licitah-worker/logs/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
