import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  plugins: [
    {
      name: 'copy-app-js',
      closeBundle() {
        try {
          fs.copyFileSync('app.js', 'dist/app.js');
          console.log('Successfully copied app.js to dist/app.js');
        } catch (err) {
          console.error('Error copying app.js to dist/app.js:', err);
        }
      }
    }
  ]
});
