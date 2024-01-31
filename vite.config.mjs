import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import scopeTailwind from "vite-plugin-scope-tailwind";
import shopify from "vite-plugin-shopify";

export default defineConfig({
  plugins: [
    shopify({
      themeRoot: "extensions/chat-interface",
      snippetFile: "vite-generator.liquid",
    }),
    react(),
    cssInjectedByJsPlugin(),
    scopeTailwind({react: true}),
  ],
});
