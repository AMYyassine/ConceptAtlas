import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
 plugins:[react()],
 server:{host:'0.0.0.0',allowedHosts:['terminal.local'],proxy:{'/api':'http://127.0.0.1:8000'}},
 build:{chunkSizeWarningLimit:1200,rollupOptions:{output:{manualChunks:{plotly:['plotly.js-basic-dist-min'],math:['katex']}}}}
});
