module.exports = {
  apps: [
    {
      name: 'hexgame',
      exec_mode: 'cluster',
      instances: '1', // max or a number of instances
      script: './node_modules/nuxt/bin/nuxt.js',
      args: 'start'
    }
  ]
}
