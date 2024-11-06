import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load environment variables based on mode (development or production)
    const env = process.env;

    return {
        base: './', // Đảm bảo đường dẫn cơ sở tương đối để hoạt động đúng trên các nền tảng như Vercel
        plugins: [react()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src'), // Định nghĩa alias cho thư mục src
            },
        },
        server: {
            port: 3000, // Định nghĩa cổng chạy server dev
            open: true, // Tự động mở trình duyệt khi chạy server
        },
        build: {
            outDir: 'dist', // Đầu ra của build
            sourcemap: mode === 'development', // Tạo sourcemap chỉ khi ở chế độ development
            chunkSizeWarningLimit: 500, // Tăng giới hạn cảnh báo chunk size để tránh thông báo không cần thiết
        },
        define: {
            'process.env': JSON.stringify(env), // Định nghĩa biến môi trường trong quá trình build
        },
    };
});