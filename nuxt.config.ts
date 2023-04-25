// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/apollo'],
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  components: true,
  apollo: {
    clients: {
      default: {
        httpEndpoint: 'https://cms.jstubenrauch.de/graphql'
      }
    },
  },
})
