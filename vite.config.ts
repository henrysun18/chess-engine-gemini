
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Setting base to './' ensures all asset paths are relative, 
  // allowing the app to be hosted in a subdirectory (e.g., user.github.io/app-name/)
  base: './', 
})
