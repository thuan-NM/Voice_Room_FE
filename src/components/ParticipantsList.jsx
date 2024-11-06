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
  Divider,
  Badge,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700', // Màu xanh lá cây
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

const ParticipantsList = ({ participants = [] }) => {
  return (
    <Box sx={{ width: 300 }}>
      <Typography variant="h6" sx={{ p: 2 }}>
        Danh sách người tham gia
      </Typography>
      <Divider />
      <List sx={{ maxHeight: 'calc(100vh - 150px)', overflowY: 'auto' }}>
        {participants.length === 0 ? (
          <Typography variant="body2" sx={{ p: 2, color: 'text.secondary' }}>
            Chưa có người tham gia.
          </Typography>
        ) : (
          participants.map((participant, index) => (
            <ListItem key={index}>
              <ListItemAvatar>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                >
                  <Avatar sx={{ bgcolor: '#3f51b5' }}>
                    {participant.username.charAt(0).toUpperCase()}
                  </Avatar>
                </StyledBadge>
              </ListItemAvatar>
              <ListItemText primary={participant.username} />
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
};

export default ParticipantsList;
