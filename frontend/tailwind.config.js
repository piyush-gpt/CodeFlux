module.exports = {
    content: [
      './index.html', // Include your Vite entry point
      './src/**/*.{js,jsx,ts,tsx}', // Include all your source files
    ],
    theme: {
      extend: {
        colors: {
          collaboratorCursor: '#ff5722', // Custom color for collaborator cursor
          collaboratorBackground: 'rgba(255, 87, 34, 0.2)', // Custom background highlight
        },
      },
    },
    plugins: [],
  };