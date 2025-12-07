module.exports = {
  apps: [{
    name: 'tabletalk-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: process.env.PORT || 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5001
    },
    error_file: 'logs/error.log',
    out_file: 'logs/output.log',
    log_file: 'logs/combined.log',
    time: true
  }]
}; 