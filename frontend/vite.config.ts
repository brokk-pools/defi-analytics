import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
    // Build configuration
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for React and related libraries
            react: ['react', 'react-dom'],
            // Solana libraries chunk
            solana: ['@solana/web3.js'],
            // Utility libraries
            utils: ['react/jsx-runtime']
          },
          // Naming convention for chunks
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name ?? '')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          }
        }
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: parseInt(env.VITE_CHUNK_SIZE_WARNING_LIMIT) || 1000,
      
      // Disable or enable compression based on environment
      cssCodeSplit: true,
      
      // Asset inlining threshold
      assetsInlineLimit: 4096
    },
    
    // Development server configuration
    server: {
      port: 3000,
      host: true,
      cors: true,
      hmr: {
        overlay: true
      },
      // Security headers for development
      ...((command === 'serve') && {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      })
    },
    
    // Preview server configuration (for production build testing)
    preview: {
      port: 3000,
      host: true,
      cors: true
    },
    
    // Path resolution
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@api': resolve(__dirname, 'src/api')
      }
    },
    
    // Environment variables
    envPrefix: 'VITE_',
    
    // CSS configuration
    css: {
      devSourcemap: mode === 'development',
      postcss: {},
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@solana/web3.js'],
      exclude: ['@vite/client', '@vite/env']
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_PRODUCTION__: mode === 'production'
    }
  }
})
