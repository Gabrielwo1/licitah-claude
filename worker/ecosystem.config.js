module.exports = {
  apps: [
    // ── Robô de lances ────────────────────────────────────────────────────────
    {
      name: 'licitah-robo',
      script: 'dist/index.js',
      cwd: '/opt/licitah-worker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      exp_backoff_restart_delay: 5000,
      out_file: '/opt/licitah-worker/logs/robo-out.log',
      error_file: '/opt/licitah-worker/logs/robo-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // ── Sincronizador PNCP ────────────────────────────────────────────────────
    // Roda a cada hora — sem limite de tempo, busca TODAS as licitações novas
    {
      name: 'licitah-sync',
      script: 'dist/sync-pncp.js',
      cwd: '/opt/licitah-worker',
      instances: 1,
      autorestart: false,     // PM2 cron controla o agendamento
      watch: false,
      cron_restart: '0 * * * *',  // toda hora (minuto 0)
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production' },
      out_file: '/opt/licitah-worker/logs/sync-out.log',
      error_file: '/opt/licitah-worker/logs/sync-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
