// src/components/Controls.jsx

import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash, FaShareSquare, FaStopCircle, FaRecordVinyl, FaStop } from 'react-icons/fa';

const Controls = ({ micMuted, toggleMic, cameraOff, toggleCamera, leaveRoom, screenSharing, toggleScreenShare, recording, toggleRecording }) => {
    return (
        <div className="flex space-x-4">
            <button
                onClick={toggleMic}
                className={`p-3 rounded-full ${micMuted ? 'bg-red-500' : 'bg-gray-500'} text-white hover:bg-red-600 transition duration-200`}
                aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
                {micMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
            </button>
            <button
                onClick={toggleCamera}
                className={`p-3 rounded-full ${cameraOff ? 'bg-red-500' : 'bg-gray-500'} text-white hover:bg-red-600 transition duration-200`}
                aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
                {cameraOff ? <FaVideoSlash size={20} /> : <FaVideo size={20} />}
            </button>
            <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full ${screenSharing ? 'bg-green-500' : 'bg-gray-500'} text-white hover:bg-green-600 transition duration-200`}
                aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
                {screenSharing ? <FaStopCircle size={20} /> : <FaShareSquare size={20} />}
            </button>
            <button
                onClick={toggleRecording}
                className={`p-3 rounded-full ${recording ? 'bg-red-600' : 'bg-gray-500'} text-white hover:bg-red-700 transition duration-200`}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
                {recording ? <FaStop size={20} /> : <FaRecordVinyl size={20} />}
            </button>
            <button
                onClick={leaveRoom}
                className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition duration-200"
                aria-label="Leave room"
            >
                <FaPhoneSlash size={20} />
            </button>
        </div>
    );
};

export default Controls;
