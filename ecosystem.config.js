module.exports = {
  apps: [{
    name: 'capacitor-dev',
    script: 'src/server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    cwd: '/var/www/capacinator',
    env: {
      NODE_ENV: 'production',
      PORT: 3151,
      DATABASE_PATH: '/var/www/capacinator/data/capacitizer.db',
      CORS_ORIGIN: 'https://dev.capacinator.com',
      LOG_LEVEL: 'info',
      TRUST_PROXY: 'true'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    log_file: '/var/log/capacinator/combined.log',
    out_file: '/var/log/capacinator/out.log',
    error_file: '/var/log/capacinator/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true,
    cron_restart: '0 2 * * *' // Restart daily at 2 AM
  }]
};