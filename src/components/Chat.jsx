// src/components/Chat.jsx

import React, { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const Chat = ({ socket, roomId, username, messages }) => {
    const [message, setMessage] = useState('');

    const sendMessage = () => {
        if (message.trim()) {
            const msg = { username, message };
            socket.emit('sendMessage', { roomId, message: msg });
            setMessage('');
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md w-full md:w-1/3 h-64 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaPaperPlane className="mr-2" /> Chat
            </h2>
            <div className="flex-1 overflow-y-auto mb-4">
                {messages.length === 0 ? (
                    <p className="text-gray-500">No messages yet.</p>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`mb-2 flex ${
                                msg.username === username ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${
                                    msg.username === username
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-800'
                                }`}
                            >
                                <span className="font-semibold">
                                    {msg.username === username ? 'You' : msg.username}:
                                </span>
                                <span> {msg.message}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="flex">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type a message..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') sendMessage();
                    }}
                />
                <button
                    onClick={sendMessage}
                    className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition duration-200"
                    aria-label="Send message"
                >
                    <FaPaperPlane />
                </button>
            </div>
        </div>
    );
};

export default Chat;
