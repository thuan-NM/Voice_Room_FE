// src/components/Video.jsx

import React, { useEffect, useRef } from 'react';

const Video = ({ stream, muted }) => {
    const videoRef = useRef();

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <video
            ref={videoRef}
            muted={muted}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-lg shadow-lg scale-x-[-1]"
        />
    );
};

export default Video;
