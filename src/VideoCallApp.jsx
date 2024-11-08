// src/VideoCallApp.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Video from './components/Video';
import Controls from './components/Controls';
import ParticipantsList from './components/ParticipantsList';
import Chat from './components/Chat';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { saveAs } from 'file-saver';
import { getRoomInfo } from './api';
import Draggable from 'react-draggable';
import {
    Container,
    Box,
    Typography,
    Drawer,
    TextField,
    Button,
    Paper,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';


const theme = createTheme({
    palette: {
        primary: {
            main: '#2196f3', // Màu xanh dương
        },
        secondary: {
            main: '#f50057', // Màu hồng
        },
        error: {
            main: '#d32f2f', // Màu đỏ
        },
    },
    typography: {
        fontFamily: 'Roboto, sans-serif',
    },
});
const socketurl = import.meta.env.VITE_API_URL;

// Initialize socket outside component to prevent multiple connections
const socket = io(socketurl, {
    transports: ['websocket', 'polling'],
});

const VideoCallApp = () => {
    const { userId, companyId } = useParams();
    const roomId = `${userId}-${companyId}`;

    // State variables
    const [remoteStreams, setRemoteStreams] = useState({});
    const [key, setKey] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [micMuted, setMicMuted] = useState(false);
    const [cameraOff, setCameraOff] = useState(false);
    const [screenSharing, setScreenSharing] = useState(false);
    const [recording, setRecording] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [userType, setUserType] = useState(null);
    const [userInRoom, setUserInRoom] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [username, setUsername] = useState('');
    const [messages, setMessages] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerContent, setDrawerContent] = useState('participants');

    // Refs
    const peerConnectionsRef = useRef({});
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const screenTrackRef = useRef(null);
    const cameraTrackRef = useRef(null);
    const screenStreamRef = useRef(null);
    const draggableRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const canvasRef = useRef(null);
    const canvasStreamRef = useRef(null);
    const videoElementsRef = useRef([]);
    const recordedChunksRef = useRef([]);
    const animationFrameIdRef = useRef();

    // Peer connections
    const peerConnections = peerConnectionsRef.current;

    useEffect(() => {
        const getLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localStreamRef.current = stream;
                // Lưu trữ track camera
                cameraTrackRef.current = stream.getVideoTracks()[0];
            } catch (err) {
                console.error('Error getting media stream:', err);
                toast.error('Không thể truy cập webcam hoặc microphone.');
            }
        };
        getLocalStream();

        return () => {
            // Cleanup media streams
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }
            // Cleanup canvas drawing
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            // Stop video elements
            videoElementsRef.current.forEach((video) => {
                video.pause();
                video.srcObject = null;
            });
        };
    }, []);

    const createPeerConnection = (socketId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: ["stun:hk-turn1.xirsys.com"] }, { username: "-3LKC68VNAMjswMpgNk2AsJh8n60STZq4sZ1JrqZe5nZ3ABVUU_yTgN7sXW9UlgPAAAAAGcJ8mZ0aHVhbg==", credential: "595f356e-884d-11ef-b41a-0242ac120004", urls: ["turn:hk-turn1.xirsys.com:80?transport=udp", "turn:hk-turn1.xirsys.com:3478?transport=udp", "turn:hk-turn1.xirsys.com:80?transport=tcp", "turn:hk-turn1.xirsys.com:3478?transport=tcp", "turns:hk-turn1.xirsys.com:443?transport=tcp", "turns:hk-turn1.xirsys.com:5349?transport=tcp"] }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', { candidate: event.candidate, to: socketId });
            }
        };

        pc.ontrack = (event) => {
            console.log(`Received track from ${socketId}`, event.streams[0]);
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
        if (roomId && key) {
            console.log(`Joining room ${roomId} with key ${key}`);
            socket.emit('joinRoom', { roomId, key, userId, companyId });
            setIsJoined(true);
        } else {
            toast.error('Vui lòng nhập khóa phòng hợp lệ.');
        }
    };

    useEffect(() => {
        const fetchRoomInfo = async () => {
            try {
                const roomData = await getRoomInfo(roomId);
                setUserInRoom(roomData.participants);
            } catch (error) {
                console.error('Error fetching room information:', error);
            }
        };

        if (isJoined) {
            fetchRoomInfo();
        }
    }, [isJoined, roomId]);

    useEffect(() => {
        if (!isJoined) return;

        // Socket event handlers
        socket.on('allUsers', (usersInfo) => {
            usersInfo.forEach(({ socketId, username }) => {
                if (socketId !== socket.id && !peerConnections[socketId]) {
                    const pc = createPeerConnection(socketId);
                    peerConnections[socketId] = pc;

                    pc.createOffer()
                        .then((offer) => pc.setLocalDescription(offer))
                        .then(() => {
                            socket.emit('offer', { offer: pc.localDescription, to: socketId });
                        })
                        .catch((error) => console.error('Error creating offer:', error));

                    setParticipants((prev) => [...prev, { socketId, username }]);
                }
            });
        });

        socket.on('offer', async ({ offer, from }) => {
            console.log('Received offer from:', from);
            let pc = peerConnections[from];
            if (!pc) {
                pc = createPeerConnection(from);
                peerConnections[from] = pc;
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', { answer: pc.localDescription, to: from });
                console.log(`Sent answer to ${from}`);
            } catch (error) {
                console.error('Error handling offer:', error);
            }
        });

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

        socket.on('userDisconnected', ({ username: disconnectedUsername, socketId }) => {
            console.log(`User ${disconnectedUsername} (ID: ${socketId}) disconnected`);
            const pc = peerConnections[socketId];
            if (pc) {
                pc.close();
                delete peerConnections[socketId];
            }

            setRemoteStreams((prevStreams) => {
                const updatedStreams = { ...prevStreams };
                delete updatedStreams[socketId];
                return updatedStreams;
            });

            setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
            toast.warn(`${disconnectedUsername} đã rời phòng.`);
        });

        socket.on('error', (message) => {
            console.log('Received error:', message);
            toast.error(message);
            setIsJoined(false);
            setUserInfo(null);
            setUsername('');
            setKey('');
        });

        socket.on('userInfo', ({ userInfo, userType, username: serverUsername }) => {
            setUserInfo(userInfo);
            setUserType(userType);
            setUsername(serverUsername);

            // Add yourself to participants
            setParticipants((prev) => [...prev, { socketId: socket.id, username: serverUsername }]);
        });

        socket.on('userJoined', ({ username: newUsername, socketId }) => {
            console.log('User joined:', newUsername, socketId);
            toast.info(`${newUsername} đã tham gia phòng.`);
            setParticipants((prev) => [...prev, { socketId, username: newUsername }]);
        });

        socket.on('receiveMessage', (msg) => {
            console.log('Received message:', msg);
            setMessages((prev) => [...prev, msg]);
        });

        // Cleanup
        return () => {
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
    }, [isJoined, peerConnections]);

    const leaveRoom = () => {
        if (isJoined) {
            // Close all peer connections
            Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
            peerConnectionsRef.current = {};
            setRemoteStreams({});
            socket.emit('leaveRoom', { roomId });
            setIsJoined(false);
            setKey('');
            setParticipants([]);
            setUsername('');
            toast.info('Bạn đã rời phòng.');

            // Stop canvas drawing and video elements
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            videoElementsRef.current.forEach((video) => {
                video.pause();
                video.srcObject = null;
            });

            // Dừng chia sẻ màn hình nếu đang chia sẻ
            if (screenSharing) {
                stopScreenShare();
            }
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
        recordedChunksRef.current = [];

        // Create an off-screen canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        canvasRef.current = canvas;

        const ctx = canvas.getContext('2d');

        // Create video elements for all streams
        const allStreams = [localStreamRef.current, ...Object.values(remoteStreams)];
        videoElementsRef.current = allStreams.map((stream) => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            video.play();
            return video;
        });

        // Function to draw videos onto the canvas
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            videoElementsRef.current.forEach((video, index) => {
                const cols = 2;
                const rows = Math.ceil(videoElementsRef.current.length / cols);
                const width = canvas.width / cols;
                const height = canvas.height / rows;
                const x = (index % cols) * width;
                const y = Math.floor(index / cols) * height;
                ctx.drawImage(video, x, y, width, height);
            });
            animationFrameIdRef.current = requestAnimationFrame(draw);
        };

        draw();

        // Capture the canvas stream
        const stream = canvas.captureStream(30);
        canvasStreamRef.current = stream;

        // Combine audio tracks
        const audioTracks = [];
        allStreams.forEach((stream) => {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTracks.push(audioTrack);
            }
        });

        const combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioTracks]);

        // Initialize MediaRecorder
        try {
            mediaRecorderRef.current = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm; codecs=vp9',
            });
        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            toast.error('MediaRecorder không được hỗ trợ trong trình duyệt này.');
            return;
        }

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            saveAs(blob, 'recording.webm');
            toast.success('Ghi âm cuộc họp đã hoàn thành và được tải xuống.');
        };

        mediaRecorderRef.current.start(1000);
        setRecording(true);
        toast.info('Bắt đầu ghi âm cuộc họp.');
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setRecording(false);
            toast.info('Đang xử lý ghi âm...');

            // Stop canvas drawing
            cancelAnimationFrame(animationFrameIdRef.current);

            // Stop video elements
            videoElementsRef.current.forEach((video) => {
                video.pause();
                video.srcObject = null;
            });
        }
    };

    const toggleScreenShare = async () => {
        if (!screenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrackRef.current = screenTrack;
                screenStreamRef.current = screenStream;

                // Thay thế track video hiện tại bằng track screen
                Object.values(peerConnections).forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                        console.log('Replaced video track with screen share track.');
                    }
                });

                setScreenSharing(true);
                toast.info('Chia sẻ màn hình đã bắt đầu.');

                screenTrack.onended = () => {
                    stopScreenShare();
                };
            } catch (error) {
                console.error('Error sharing screen:', error);
                toast.error('Không thể chia sẻ màn hình.');
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (screenTrackRef.current && cameraTrackRef.current) {
            const screenTrack = screenTrackRef.current;
            const cameraTrack = cameraTrackRef.current;

            // Thay thế screen track bằng camera track trong mỗi peer connection
            Object.values(peerConnections).forEach((pc) => {
                const sender = pc.getSenders().find((s) => s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(cameraTrack);
                    console.log('Replaced screen share track with camera track.');
                }
            });

            // Dừng và xóa screen track và stream
            screenTrack.stop();
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((track) => track.stop());
                screenStreamRef.current = null;
            }
            screenTrackRef.current = null;

            setScreenSharing(false);
            toast.info('Chia sẻ màn hình đã dừng.');
        }
    };

    const openParticipants = () => {
        setDrawerContent('participants');
        setDrawerOpen(true);
    };

    const openChat = () => {
        setDrawerContent('chat');
        setDrawerOpen(true);
    };

    return (
        <ThemeProvider theme={theme}>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} />
            {!isJoined ? (
                // Join Room UI
                <Container maxWidth="sm" className='!flex !justify-center !items-center'>
                    <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <img src="/logo.png" alt="Logo" style={{ width: 100 }} />
                            <Typography component="h1" variant="h5">
                                Tham Gia Phòng
                            </Typography>
                        </Box>
                        <Box component="form" sx={{ mt: 3 }}>
                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                label="Room ID"
                                value={roomId}
                                disabled
                            />
                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                label="Key"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                            />
                            <Button
                                type="button"
                                fullWidth
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={joinRoom}
                            >
                                Tham Gia
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            ) : (
                // Video Call UI
                <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>

                    {/* Video Area */}
                    <Box sx={{ flex: 1, display: 'flex', position: 'relative', backgroundColor: '#fff', overflow: 'hidden' }}>
                        {/* Remote Streams */}
                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignContent: 'flex-start',
                                justifyContent: 'center',
                                overflow: 'hidden', // Ẩn thanh cuộn
                            }}
                        >
                            {Object.entries(remoteStreams).map(([socketId, stream]) => {
                                const participant = participants.find((p) => p.socketId === socketId);
                                const remoteUsername = participant ? participant.username : 'User';
                                return (
                                    <Box
                                        key={socketId}
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            aspectRatio: '16 / 9', // Giữ tỉ lệ 16:9
                                            margin: '1%',
                                            backgroundColor: '#000',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            boxShadow: 3,
                                        }}
                                    >
                                        <Video
                                            stream={stream}
                                            muted={false}
                                            username={remoteUsername}
                                        />
                                    </Box>
                                );
                            })}
                            {Object.keys(remoteStreams).length === 0 && (
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                    }}
                                >
                                    <Typography variant="h6" color="text.secondary" className='text-center'>
                                        Đang chờ người khác tham gia...
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Local Video */}
                        <Draggable nodeRef={draggableRef}>
                            <Box
                                ref={draggableRef}
                                sx={{
                                    position: 'absolute',
                                    bottom: 100,
                                    right: 16,
                                    width: { xs: 150, sm: 200 },
                                    height: { xs: 112, sm: 150 },
                                    border: '2px solid #fff',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    boxShadow: 3,
                                    zIndex: 10,
                                    backgroundColor: '#000',
                                    cursor: 'move',
                                }}
                            >
                                <Video
                                    stream={localStreamRef.current}
                                    muted={true}
                                    flip={true}
                                    username="You"
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        bottom: 8,
                                        left: 8,
                                        color: '#fff',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                    }}
                                >
                                </Typography>
                            </Box>
                        </Draggable>
                    </Box>

                    {/* Controls */}
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
                        openChat={openChat}
                        openParticipants={openParticipants}
                    />

                    {/* Drawer */}
                    <Drawer
                        anchor="right"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        sx={{ width: 300, flexShrink: 0 }}
                    >
                        {drawerContent === 'participants' ? (
                            <ParticipantsList participants={participants} />
                        ) : (
                            <Chat socket={socket} roomId={roomId} username={username} messages={messages} />
                        )}
                    </Drawer>
                </Box>
            )}
        </ThemeProvider>
    );
};

export default VideoCallApp;
