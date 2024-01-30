/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{js,ts,jsx,tsx}",
    "./extension/chat-interface/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        custom: "0.96rem",
      },
    },
  },
  plugins: [],
};
