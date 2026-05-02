module.exports = {
  apps: [
    {
      name: 'wagex-backend',
      script: './dist/main.js',
      node_args: '--max-old-space-size=640',
      max_memory_restart: '750M',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
