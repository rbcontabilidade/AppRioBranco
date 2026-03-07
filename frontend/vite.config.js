import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: '.',
    base: '/',
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api')
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // Tamanho máximo de chunk antes do aviso (500KB)
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Hash nos nomes garante cache-busting correto
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                // Separação manual de dependências pesadas em chunks independentes.
                // Cada chunk fica em cache separado — quando o código da app muda,
                // os chunks vendor não precisam ser baixados novamente.
                manualChunks: {
                    // React core e roteamento — raramente mudam, cache longo
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // Recharts — lib de gráficos pesada, isolada para lazy caching
                    'vendor-charts': ['recharts'],
                    // Ícones Lucide — carregados em muitas telas mas pesados
                    'vendor-icons': ['lucide-react'],
                    // Infraestrutura de dados — Supabase SDK e Axios
                    'vendor-data': ['@supabase/supabase-js', 'axios'],
                }
            }
        }
    }
});
