module.exports = {
  darkMode: "class", // or 'media' or 'class'
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#7D53F6",
        secondary: "#FBFAFF",
        background: "rgb(238 241 249/1)",
        "sec-background": "#ECE8FE",
        "sec-dim": "rgb(253 253 253 / 75%)",
        red: "rgb(255 19 19 / 72%)",
        green: "green",
        dark: "#1e1e1e",
        iconColor: "#5F6388",
        blue: "#0388fc",
      },
      height: {
        15: "55px",
        25: "85px",
        28: "95px",
        18: "65px",
        100: "400px",
      },
      width: {
        15: "40px",
        25: "85px",
        28: "95px",
        100: "500px",
        110: "600px",
        120: "700px",
        130: "800px",
        140: "900px",
        150: "1000px",
      },
      maxWidth: {
        "3/4": "70%",
        100: "500px",
      },
      minWidth: {
        100: "400px",
      },
    },
  },
  plugins: [],
};
