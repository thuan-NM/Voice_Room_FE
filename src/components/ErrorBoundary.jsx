// src/components/ErrorBoundary.jsx

import React from 'react';
import { Typography, Box } from '@mui/material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Cập nhật state để hiển thị fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Bạn có thể log error vào dịch vụ báo cáo lỗi ở đây
        console.error('ErrorBoundary caught an error', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h4" color="error">
                        Đã xảy ra lỗi
                    </Typography>
                    <Typography variant="body1">
                        Xin lỗi vì sự bất tiện này.
                    </Typography>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
