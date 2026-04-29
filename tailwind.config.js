/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fond: "#0B1221",
        "fond-clair": "#101A2E",
        "fond-carte": "#16233D",
        bleu: "#1B3E7C",
        or: "#A67C4E",
        rouge: "#B32134",
        bordure: "#1E2D4A",
        "texte-muted": "#8494AD"
      },
      maxWidth: { "1600": "1600px" }
    }
  },
  plugins: []
};
