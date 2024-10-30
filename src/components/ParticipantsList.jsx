// src/components/ParticipantsList.jsx

import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

const ParticipantsList = ({ participants = [] }) => {
  return (
    <Box sx={{ width: 300 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Participants
      </Typography>
      <List>
        {participants.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
            No participants yet.
          </Typography>
        ) : (
          participants.map((participant, index) => (
            <ListItem key={index}>
              <ListItemAvatar>
                <Avatar>
                  <PersonIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={participant} />
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};

export default ParticipantsList;
