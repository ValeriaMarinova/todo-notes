// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,

  modules: ['@pinia/nuxt'],

  css: ['~/assets/scss/main.scss'],

  typescript: {
    strict: true,
    typeCheck: true,
  },

  devtools: {
    enabled: true,
  },

  compatibilityDate: '2025-07-15',
})
