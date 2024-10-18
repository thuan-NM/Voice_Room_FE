import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://voice-room-be.onrender.com', {
    transports: ['websocket', 'polling'],
    secure: true
});

const VoiceChat = () => {
    const [remoteStream, setRemoteStream] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [micMuted, setMicMuted] = useState(false);
    const localStreamRef = useRef(null);

    useEffect(() => {
        const getLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
            } catch (err) {
                console.error('Error getting media stream:', err);
            }
        };

        getLocalStream();
    }, []);

    useEffect(() => {
        const createPeerConnection = () => {
            const pc = new RTCPeerConnection({
                iceServers: [{
                    urls: ["stun:hk-turn1.xirsys.com"]
                }, {
                    username: "USERNAME",
                    credential: "CREDENTIAL",
                    urls: [
                        "turn:hk-turn1.xirsys.com:80?transport=udp",
                        "turn:hk-turn1.xirsys.com:3478?transport=udp",
                        "turn:hk-turn1.xirsys.com:80?transport=tcp",
                        "turn:hk-turn1.xirsys.com:3478?transport=tcp",
                        "turns:hk-turn1.xirsys.com:443?transport=tcp",
                        "turns:hk-turn1.xirsys.com:5349?transport=tcp"
                    ]
                }]
            });

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('candidate', event.candidate);
                }
            };

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    pc.addTrack(track, localStreamRef.current);
                });
            }

            return pc;
        };

        if (localStreamRef.current) {
            const pc = createPeerConnection();
            setPeerConnection(pc);
        }
    }, [localStreamRef.current]);

    const toggleMic = () => {
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            setMicMuted((prevState) => {
                audioTrack.enabled = prevState;
                return !prevState;
            });
        }
    };

    const joinRoom = () => {
        if (roomId && username && peerConnection) {
            socket.emit('joinRoom', { roomId, username });
            setIsJoined(true);

            peerConnection.createOffer().then((offer) => {
                peerConnection.setLocalDescription(offer);
                socket.emit('offer', offer);
            });
        }
    };

    useEffect(() => {
        if (peerConnection) {
            socket.on('offer', (offer) => {
                if (peerConnection) {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                    peerConnection.createAnswer().then((answer) => {
                        peerConnection.setLocalDescription(answer);
                        socket.emit('answer', answer);
                    });
                }
            });

            socket.on('answer', (answer) => {
                if (peerConnection) {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                }
            });

            socket.on('candidate', (candidate) => {
                if (peerConnection) {
                    const iceCandidate = new RTCIceCandidate(candidate);
                    peerConnection.addIceCandidate(iceCandidate);
                }
            });
        }

        return () => {
            socket.off('offer');
            socket.off('answer');
            socket.off('candidate');
        };
    }, [peerConnection]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="flex justify-between w-4/5 h-3/4">
                {/* Hiển thị video local */}
                {localStreamRef.current && (
                    <video
                        className="w-1/2 h-full object-cover rounded-lg shadow-lg"
                        autoPlay
                        muted
                        ref={(video) => {
                            if (video) video.srcObject = localStreamRef.current;
                        }}
                    />
                )}

                {/* Hiển thị video remote */}
                {remoteStream && (
                    <video
                        className="w-1/2 h-full object-cover rounded-lg shadow-lg"
                        autoPlay
                        ref={(video) => {
                            if (video) video.srcObject = remoteStream;
                        }}
                    />
                )}
            </div>
            <div className="w-4/5 mt-5 flex flex-col items-center gap-4">
                <input
                    className="p-2 border border-gray-300 rounded-md w-full"
                    type="text"
                    placeholder="Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                />
                <input
                    className="p-2 border border-gray-300 rounded-md w-full"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                {isJoined ? (
                    <button 
                        className="px-4 py-2 bg-red-500 text-white rounded-lg"
                        onClick={() => setIsJoined(false)}>
                        Leave Room
                    </button>
                ) : (
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                        onClick={joinRoom}>
                        Join Room
                    </button>
                )}
                <button
                    className={`px-4 py-2 rounded-lg ${micMuted ? 'bg-green-500' : 'bg-gray-500'} text-white`}
                    onClick={toggleMic}>
                    {micMuted ? 'Unmute Mic' : 'Mute Mic'}
                </button>
            </div>
        </div>
    );
};

export default VoiceChat;
