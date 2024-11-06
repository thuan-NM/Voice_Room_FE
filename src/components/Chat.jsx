// src/components/Chat.jsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Paper,
  Grid,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { styled } from '@mui/system';

const MessageBubble = styled(Paper)(({ theme, isOwn }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.spacing(2),
  backgroundColor: isOwn ? '#1e88e5' : theme.palette.grey[200],
  color: isOwn ? theme.palette.common.white : theme.palette.text.primary,
  maxWidth: '75%',
  wordWrap: 'break-word',
  boxShadow: theme.shadows[2],
  alignSelf: isOwn ? 'flex-end' : 'flex-start',
  borderTopRightRadius: isOwn ? 0 : theme.spacing(2),
  borderTopLeftRadius: isOwn ? theme.spacing(2) : 0,
}));

const Chat = ({ socket, roomId, username, messages }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const sendMessage = () => {
    if (message.trim()) {
      const msg = { username, message };
      socket.emit('sendMessage', { roomId, message: msg });
      setMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Box sx={{ width: 400, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #ccc', backgroundColor: '#f5f5f5' }}>
        Chat
      </Typography>
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 1, bgcolor: '#fafafa' }}>
        {messages.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
            No messages yet.
          </Typography>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.username === username;
            return (
              <ListItem key={index} disableGutters>
                <Grid container spacing={1} justifyContent={isOwnMessage ? 'flex-end' : 'flex-start'}>
                  {!isOwnMessage && (
                    <Grid item>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}> 
                        {msg.username.charAt(0).toUpperCase()}
                      </Avatar>
                    </Grid>
                  )}
                  <Grid item width={200}>
                    <MessageBubble isOwn={isOwnMessage} elevation={2}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {msg.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          textAlign: isOwnMessage ? 'right' : 'left',
                          mt: 0.5,
                          fontStyle: 'italic',
                        }}
                      >
                        {isOwnMessage ? 'You' : msg.username}
                      </Typography>
                    </MessageBubble>
                  </Grid>
                </Grid>
              </ListItem>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </List>
      <Box sx={{ display: 'flex', p: 1, borderTop: '1px solid #ccc', bgcolor: '#f5f5f5' }}>
        <TextField
          variant="outlined"
          fullWidth
          size="small"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <IconButton color="primary" onClick={sendMessage} sx={{ ml: 1 }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Chat;
