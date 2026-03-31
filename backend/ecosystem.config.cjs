/**
 * PM2 — avaliação saúde (API + frontend estático).
 *
 * Uso (na pasta backend, com PM2 instalado globalmente):
 *   npm run pm2:start
 *
 * Variáveis em .env (ex.: PORT=3001, DATABASE_URL) são carregadas pelo Node via dotenv.
 */
module.exports = {
  apps: [
    {
      name: 'asu-hm',
      script: './server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
