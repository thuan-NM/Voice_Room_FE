// src/components/ParticipantsList.jsx

import React from 'react';
import { FaUserFriends } from 'react-icons/fa';

const ParticipantsList = ({ participants }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md w-full md:w-1/4">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FaUserFriends className="mr-2" /> Participants
            </h2>
            <ul className="space-y-2">
                {participants.length === 0 ? (
                    <li className="text-gray-500">No participants yet.</li>
                ) : (
                    participants.map((participant) => (
                        <li key={participant.socketId} className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>{participant.username}</span>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default ParticipantsList;
