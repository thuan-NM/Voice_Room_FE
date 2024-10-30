// src/components/Controls.jsx

import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  CallEnd as CallEndIcon,
  FiberManualRecord as FiberManualRecordIcon,
  Stop as StopIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

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
  openParticipants,
  openChat,
}) => {
  return (
    <AppBar position="fixed" color="default" sx={{ top: 'auto', bottom: 0 }}>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <IconButton color="inherit" onClick={toggleMic}>
          {micMuted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
        <IconButton color="inherit" onClick={toggleCamera}>
          {cameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
        </IconButton>
        <IconButton color="inherit" onClick={toggleScreenShare}>
          {screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </IconButton>
        <IconButton color="inherit" onClick={toggleRecording}>
          {recording ? <StopIcon /> : <FiberManualRecordIcon />}
        </IconButton>
        <IconButton color="secondary" onClick={leaveRoom}>
          <CallEndIcon />
        </IconButton>
        <IconButton color="inherit" onClick={openParticipants}>
          <PeopleIcon />
        </IconButton>
        <IconButton color="inherit" onClick={openChat}>
          <ChatIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Controls;
