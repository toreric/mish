import { defineConfig } from "vite";
import { extensions, classicEmberSupport, ember } from "@embroider/vite";
import { babel } from "@rollup/plugin-babel";
import { loadTranslations } from "@ember-intl/vite";

export default defineConfig({
  plugins: [
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: "runtime",
      extensions,
    }),
    loadTranslations(),
  ],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
         if (warning.code === 'FILE_NAME_CONFLICT') {
      // if (warning.code === 'FILE_NAME_CONFLICT' && warning.message.includes('@embroider/virtual/app.css')) { // May also target a specific file
          return; // Ignore this warning (don't log)
        }
        warn(warning); // Else default log
      },
    },
    chunkSizeWarningLimit: 800, // Default is 500
  },
});
