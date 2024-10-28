// src/api.js

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/rooms'; // Thay URL này thành URL của server nếu cần

// Lấy thông tin phòng (bao gồm participants)
export const getRoomInfo = async(roomId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/${roomId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching room info:', error);
        throw error;
    }
};

// Tham gia phòng
export const joinRoom = async(roomId, username) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/${roomId}/join`, { username });
        return response.data;
    } catch (error) {
        console.error('Error joining room:', error);
        throw error;
    }
};

// Rời phòng
export const leaveRoom = async(roomId, username) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/${roomId}/leave`, { username });
        return response.data;
    } catch (error) {
        console.error('Error leaving room:', error);
        throw error;
    }
};