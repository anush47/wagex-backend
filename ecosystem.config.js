module.exports = {
  apps: [
    {
      name: 'wagex-backend',
      script: './dist/main.js',
      node_args: '--max-old-space-size=384',
      max_memory_restart: '450M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
