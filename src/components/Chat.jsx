// src/components/Chat.jsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

const Chat = ({ socket, roomId, username, messages }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const sendMessage = (event) => {
    event.persist();
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
    <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Chat
      </Typography>
      <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
        {messages.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No messages yet.
          </Typography>
        ) : (
          messages.map((msg, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={msg.message}
                secondary={msg.username === username ? 'You' : msg.username}
                sx={{
                  textAlign: msg.username === username ? 'right' : 'left',
                }}
              />
            </ListItem>
          ))
        )}
        <div ref={messagesEndRef} />
      </List>
      <Box sx={{ display: 'flex', p: 1 }}>
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
        <IconButton color="primary" onClick={sendMessage}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Chat;
