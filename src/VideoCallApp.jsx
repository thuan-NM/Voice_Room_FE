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
import {
    Container,
    Box,
    Typography,
    Grid,
    Drawer,
    TextField,
    Button,
} from '@mui/material';
const socketurl =
    import.meta.env.WEBRTC_API;
import { createTheme, ThemeProvider } from '@mui/material/styles';

const socket = io('http://localhost:5000', {
    transports: ['websocket', 'polling'],
});

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2', // Blue
        },
        secondary: {
            main: '#d32f2f', // Red
        },
    },
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
    const [userInRoom, setUserInRoom] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [username, setUsername] = useState(''); // Khai báo biến username
    const [messages, setMessages] = useState([]); // Khai báo state cho tin nhắn
    const mediaRecorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const roomId = `${userId}-${companyId}`;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerContent, setDrawerContent] = useState('participants');

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
                setUserInRoom(roomData.participants)
            } catch (error) {
                console.error('Error fetching room information:', error);
            }
        };

        if (isJoined) {
            fetchRoomInfo();
        }
    }, [isJoined, roomId, peerConnections, remoteStreams]);

    useEffect(() => {
        if (!isJoined) return;

        socket.on('allUsers', (usersInfo) => {
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
            setParticipants(participantList);
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

        // In your socket event handlers
        socket.on('userInfo', ({ userInfo, userType, username: serverUsername }) => {
            setUserInfo(userInfo);
            setUserType(userType);
            setUsername(serverUsername);

            // Add yourself to participants
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

    const openParticipants = () => {
        setDrawerContent('participants');
        setDrawerOpen(true);
    };

    // Hàm mở chat
    const openChat = () => {
        setDrawerContent('chat');
        setDrawerOpen(true);
    };

    return (
        <ThemeProvider theme={theme}>
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

            {!isJoined ? (
                // Join Room UI
                <Container maxWidth="sm">
                    <Box
                        sx={{
                            mt: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Typography component="h1" variant="h5">
                            Join Room
                        </Typography>
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
                                Join
                            </Button>
                        </Box>
                    </Box>
                </Container>
            ) : (
                // Video Call UI
                <Box sx={{ display: 'flex', height: '100vh' }}>
                    {/* Video Area */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Grid container spacing={2} sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
                            {/* Local Video */}
                            <Grid item xs={12} sm={6} md={4} lg={3} sx={{ position: 'relative' }}>
                                <Video stream={localStreamRef.current} muted={true} />
                                <Typography
                                    variant="caption"
                                    sx={{ position: 'absolute', bottom: 8, left: 8, color: '#fff' }}
                                >
                                    You
                                </Typography>
                            </Grid>

                            {/* Remote Videos */}
                            {Object.entries(remoteStreams).map(([socketId, stream]) => {
                                const participant = participants.find((p) => p.socketId === socketId);
                                const remoteUsername = participant ? participant.username : 'User';
                                return (
                                    <Grid
                                        key={socketId}
                                        item
                                        xs={12}
                                        sm={6}
                                        md={4}
                                        lg={3}
                                        sx={{ position: 'relative' }}
                                    >
                                        <Video stream={stream} muted={false} />
                                        <Typography
                                            variant="caption"
                                            sx={{ position: 'absolute', bottom: 8, left: 8, color: '#fff' }}
                                        >
                                            {remoteUsername}
                                        </Typography>
                                    </Grid>
                                );
                            })}
                        </Grid>
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
                            openParticipants={openParticipants}
                            openChat={openChat}
                        />
                    </Box>

                    {/* Drawer */}
                    <Drawer
                        anchor="right"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        sx={{ width: 300, flexShrink: 0 }}
                    >
                        {drawerContent === 'participants' ? (
                            <ParticipantsList participants={userInRoom} />
                        ) : (
                            <Chat
                                socket={socket}
                                roomId={roomId}
                                username={username}
                                messages={messages}
                            />
                        )}
                    </Drawer>
                </Box>
            )}
        </ThemeProvider>
    );
};

export default VideoCallApp;