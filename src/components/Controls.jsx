// src/components/Controls.jsx

import React from 'react';
import { Box, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import CallEndIcon from '@mui/icons-material/CallEnd';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';

const Controls = ({
    micMuted,
    toggleMic,
    cameraOff,
    toggleCamera,
    leaveRoom,
    screenSharing,
    toggleScreenShare,
    recording,
    toggleRecording,
    openChat, 
    openParticipants
}) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: '#f0f0f0' }}>
            <IconButton onClick={toggleMic} color={micMuted ? 'secondary' : 'primary'}>
                {micMuted ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
            <IconButton onClick={toggleCamera} color={cameraOff ? 'secondary' : 'primary'}>
                {cameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
            </IconButton>
            <IconButton onClick={toggleScreenShare} color="primary">
                {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
            <IconButton onClick={toggleRecording} color="primary">
                {recording ? <StopIcon /> : <FiberManualRecordIcon />}
            </IconButton>
            <IconButton onClick={leaveRoom} color="error">
                <CallEndIcon />
            </IconButton>
            <IconButton color="primary" onClick={openParticipants}>
                <PeopleIcon />
            </IconButton>
            <IconButton color="primary" onClick={openChat}>
                <ChatIcon />
            </IconButton>
        </Box>
    );
};

export default Controls;
