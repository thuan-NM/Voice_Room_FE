// src/components/Video.jsx

import React, { useEffect, useRef, useState } from 'react';
import { IconButton, Box, Typography } from '@mui/material';
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import './Video.css'; // Import CSS tùy chỉnh

const Video = ({ stream, muted, username }) => {
    const videoRef = useRef();
    const containerRef = useRef(); // Thêm containerRef
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }

        // Thêm sự kiện để theo dõi trạng thái fullscreen
        const handleFullscreenChange = () => {
            const fullscreenElement = document.fullscreenElement || 
                                      document.webkitFullscreenElement || 
                                      document.mozFullScreenElement || 
                                      document.msFullscreenElement;
            const isFull = fullscreenElement === containerRef.current; // So sánh với container
            setIsFullscreen(isFull);
            console.log(`Fullscreen Status: ${isFull}`); // Thêm log để kiểm tra
            if (containerRef.current) {
                if (isFull) {
                    containerRef.current.classList.add('fullscreen-active');
                } else {
                    containerRef.current.classList.remove('fullscreen-active');
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
        document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
        document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [stream]);

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            } else if (containerRef.current.webkitRequestFullscreen) { /* Safari */
                containerRef.current.webkitRequestFullscreen();
            } else if (containerRef.current.msRequestFullscreen) { /* IE/Edge */
                containerRef.current.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
        }
    };

    return (
        <Box className="video-container" ref={containerRef}> {/* Sử dụng containerRef */}
            <video
                ref={videoRef}
                muted={muted}
                autoPlay
                playsInline
                className="video-element custom-video"
                // Không thêm thuộc tính controls
            />
            <IconButton
                onClick={toggleFullscreen}
                className={`fullscreen-button ${isFullscreen ? 'exit-fullscreen' : ''}`}
                aria-label="fullscreen"
            >
                {isFullscreen ? <FullscreenExit sx={{ color: 'white' }} /> : <Fullscreen sx={{ color: 'white' }} />}
            </IconButton>
            <Typography 
                className="username-label"
            >
                {username}
            </Typography>
        </Box>
    );
};

export default Video;
