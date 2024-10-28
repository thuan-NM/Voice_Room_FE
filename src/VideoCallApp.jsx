import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Video from './components/Video';
import Controls from './components/Controls';
import ParticipantsList from './components/ParticipantsList';
import Chat from './components/Chat';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveAs } from 'file-saver'; // Đảm bảo đã cài đặt file-saver: npm install file-saver
import { getRoomInfo } from './api';

const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
});

const VideoCallApp = () => {
    const { userId, companyId } = useParams();
    const [remoteStreams, setRemoteStreams] = useState({});
    const [peerConnections, setPeerConnections] = useState({});
    const [key, setKey] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [micMuted, setMicMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [screenSharing, setScreenSharing] = useState(false);
    const [recording, setRecording] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [userType, setUserType] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [username, setUsername] = useState(''); // Khai báo biến username
    const [messages, setMessages] = useState([]); // Khai báo state cho tin nhắn
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const roomId = `${userId}-${companyId}`;


    useEffect(() => {
        const getLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error getting media stream:', err);
                toast.error('Không thể truy cập webcam hoặc microphone.');
            }
        };
        getLocalStream();

        return () => {
            // Cleanup media streams
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = null;
                }
            }
        };
    }, []);

    const createPeerConnection = (socketId) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: ["stun:stun.l.google.com:19302"] },
                {
                    urls: ["turn:turn.anyfirewall.com:443?transport=tcp"],
                    username: "webrtc",
                    credential: "webrtc"
                }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', { candidate: event.candidate, to: socketId });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStreams((prevStreams) => ({
                ...prevStreams,
                [socketId]: event.streams[0],
            }));
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        return pc;
    };

    const joinRoom = () => {
        if (roomId && key) { // Loại bỏ kiểm tra username
            console.log(`Joining room ${roomId} with key ${key}`);
            socket.emit('joinRoom', { roomId, key, userId, companyId }); // Loại bỏ username từ payload
            setIsJoined(true);
        } else {
            toast.error('Vui lòng nhập khóa phòng hợp lệ.');
        }
    };

    useEffect(() => {
        const fetchRoomInfo = async () => {
            try {
                const roomData = await getRoomInfo(roomId);
                setParticipants(roomData.participants);
            } catch (error) {
                console.error('Error fetching room information:', error);
            }
        };

        if (isJoined) {
            fetchRoomInfo();
        }
    }, [peerConnections, remoteStreams]);

    useEffect(() => {
        if (!isJoined) return;
        // Handle 'allUsers' event
        socket.on('allUsers', (usersInfo) => {
            console.log('Received allUsers:', usersInfo);
            const pcs = {};
            const participantList = [];

            usersInfo.forEach(({ socketId, username }) => {
                if (socketId !== socket.id) {
                    const pc = createPeerConnection(socketId);
                    pcs[socketId] = pc;

                    pc.createOffer()
                        .then((offer) => pc.setLocalDescription(offer))
                        .then(() => {
                            socket.emit('offer', { offer: pc.localDescription, to: socketId });
                        })
                        .catch((error) => console.error('Error creating offer:', error));

                    participantList.push({ socketId, username });
                }
            });
            setPeerConnections(pcs);
            // setParticipants(participantList);
        });

        // Handle 'offer' event
        socket.on('offer', async ({ offer, from }) => {
            console.log('Received offer from:', from);
            if (!peerConnections[from]) {
                const pc = createPeerConnection(from);
                setPeerConnections((prev) => ({ ...prev, [from]: pc }));
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('answer', { answer: pc.localDescription, to: from });
                    console.log(`Sent answer to ${from}`);
                } catch (error) {
                    console.error('Error handling offer:', error);
                }
            }
        });

        // Handle 'answer' event
        socket.on('answer', async ({ answer, from }) => {
            console.log('Received answer from:', from);
            const pc = peerConnections[from];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log(`Set remote description for ${from}`);
                } catch (error) {
                    console.error('Error setting remote description for answer:', error);
                }
            }
        });

        // Handle 'candidate' event
        socket.on('candidate', async ({ candidate, from }) => {
            console.log('Received candidate from:', from);
            const pc = peerConnections[from];
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log(`Added ICE candidate from ${from}`);
                } catch (error) {
                    console.error('Error adding received ICE candidate:', error);
                }
            }
        });

        // Handle 'userDisconnected' event
        socket.on('userDisconnected', ({ username: disconnectedUsername, socketId }) => {
            console.log(`User ${disconnectedUsername} (ID: ${socketId}) disconnected`);
            const pc = peerConnections[socketId];
            if (pc) {
                pc.close();

                setPeerConnections((prev) => {
                    const updated = { ...prev };
                    delete updated[socketId];
                    return updated;
                });

                setRemoteStreams((prevStreams) => {
                    const updatedStreams = { ...prevStreams };
                    delete updatedStreams[socketId];
                    return updatedStreams;
                });

                setParticipants((prev) => prev.filter(p => p.socketId !== socketId));
                toast.warn(`${disconnectedUsername} đã rời phòng.`);
            }
        });

        // Handle 'error' event
        socket.on('error', (message) => {
            console.log('Received error:', message);
            toast.error(message);
            setIsJoined(false);
            setUserInfo(null);
            setUsername(''); // Reset username nếu muốn
            setKey(''); // Reset key nếu muốn
        });

        // Handle 'userInfo' event
        // Trong phần useEffect xử lý 'userInfo' event

        socket.on('userInfo', ({ userInfo, userType, username: serverUsername }) => { // Nhận username từ server
            console.log('Received userInfo:', { userInfo, userType, serverUsername });
            setUserInfo(userInfo);
            setUserType(userType);
            setUsername(serverUsername); // Thiết lập username từ server

            // Thêm chính mình vào danh sách participants
            setParticipants((prev) => [...prev, { socketId: socket.id, username: serverUsername }]);
        });


        // Handle 'userJoined' event
        socket.on('userJoined', ({ username: newUsername, socketId }) => {
            console.log('User joined:', newUsername, socketId);
            toast.info(`${newUsername} đã tham gia phòng.`);
            setParticipants((prev) => [...prev, { socketId, username: newUsername }]);
        });

        // Handle 'receiveMessage' event
        socket.on('receiveMessage', (msg) => {
            console.log('Received message:', msg);
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            // Cleanup event listeners
            socket.off('allUsers');
            socket.off('offer');
            socket.off('answer');
            socket.off('candidate');
            socket.off('userDisconnected');
            socket.off('error');
            socket.off('userInfo');
            socket.off('userJoined');
            socket.off('receiveMessage');
        };
    }, [peerConnections, isJoined]);

    const leaveRoom = () => {
        if (isJoined) {
            // Close all peer connections
            Object.values(peerConnections).forEach((pc) => pc.close());
            setPeerConnections({});
            setRemoteStreams({});
            socket.emit('leaveRoom', { roomId }); // Loại bỏ username từ payload
            setIsJoined(false);
            setKey(''); // Clear the key nếu muốn
            setParticipants([]);
            setUsername(''); // Reset username nếu muốn
            toast.info('Bạn đã rời phòng.');
        }
    };

    const toggleMic = () => {
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            setMicMuted((prevState) => {
                audioTrack.enabled = prevState;
                return !prevState;
            });
        }
    };

    const toggleCamera = () => {
        if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            setCameraOff((prevState) => {
                videoTrack.enabled = prevState;
                return !prevState;
            });
        }
    };

    const toggleRecording = () => {
        if (!recording) {
            startRecording();
        } else {
            stopRecording();
        }
    };

    const startRecording = () => {
        recordedChunks.current = [];
        mediaRecorderRef.current = new MediaRecorder(localStreamRef.current);
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.current.push(event.data);
            }
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
            saveAs(blob, 'recording.webm');
            toast.success('Ghi âm cuộc họp đã hoàn thành và được tải xuống.');
        };
        mediaRecorderRef.current.start();
        setRecording(true);
        toast.info('Bắt đầu ghi âm cuộc họp.');
    };

    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setRecording(false);
        toast.info('Đang xử lý ghi âm...');
    };

    const toggleScreenShare = async () => {
        if (!screenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                // Thay thế track video hiện tại bằng track screen
                Object.values(peerConnections).forEach((pc) => {
                    const sender = pc.getSenders().find(s => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

                // Cập nhật local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                setScreenSharing(true);
                toast.info('Chia sẻ màn hình đã bắt đầu.');
            } catch (error) {
                console.error('Error sharing screen:', error);
                toast.error('Không thể chia sẻ màn hình.');
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        Object.values(peerConnections).forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track.kind === 'video');
            if (sender) {
                sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
            }
        });

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }

        setScreenSharing(false);
        toast.info('Chia sẻ màn hình đã dừng.');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

            {!isJoined ? (
                <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-2xl font-semibold mb-6 text-center">Tham Gia Phòng</h2>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">Room ID</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="text"
                            placeholder="Room ID"
                            value={roomId}
                            disabled
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2">Key</label>
                        <input
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            type="text"
                            placeholder="Key"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                        />
                    </div>
                    <button
                        className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition duration-200"
                        onClick={joinRoom}
                    >
                        Join Room
                    </button>
                </div>
            ) : (
                <>
                    {/* Video Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full h-3/4">
                        {/* Local Video */}
                        <div className="relative h-40 md:h-64">
                            <Video
                                stream={localStreamRef.current}
                                muted={true}
                            />
                            <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                You
                            </span>
                        </div>

                        {/* Remote Videos */}
                        {Object.entries(remoteStreams).map(([socketId, stream]) => {
                            const participant = participants.find(p => p.socketId === socketId);
                            const remoteUsername = participant ? participant.username : 'User';
                            return (
                                <div key={socketId} className="relative h-40 md:h-64">
                                    <Video
                                        stream={stream}
                                        muted={false}
                                    />
                                    <span className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                        {remoteUsername}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Controls */}
                    <div className="w-full mt-5 flex flex-col md:flex-row items-center justify-center gap-4">
                        {/* Control Buttons */}
                        <Controls
                            micMuted={micMuted}
                            toggleMic={toggleMic}
                            cameraOff={cameraOff}
                            toggleCamera={toggleCamera}
                            leaveRoom={leaveRoom}
                            screenSharing={screenSharing}
                            toggleScreenShare={toggleScreenShare}
                            recording={recording}
                            toggleRecording={toggleRecording}
                        />
                    </div>

                    {/* Participants and Chat */}
                    <div className="w-full mt-5 flex flex-col md:flex-row items-start gap-4">
                        <ParticipantsList participants={participants}/>
                        <Chat socket={socket} roomId={roomId} username={username} messages={messages} />
                    </div>
                </>
            )}
        </div>
    );

};

export default VideoCallApp;