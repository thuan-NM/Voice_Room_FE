import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://voice-room-be.onrender.com');

const VoiceChat = () => {
    const [remoteStream, setRemoteStream] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [micMuted, setMicMuted] = useState(false);  // Sử dụng useState để quản lý trạng thái mic

    const localStreamRef = useRef(null);

    useEffect(() => {
        const getLocalStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = stream;
            } catch (err) {
                console.error('Lỗi khi lấy âm thanh:', err);
            }
        };

        getLocalStream();
    }, []);

    useEffect(() => {
        const createPeerConnection = () => {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                ],
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

            // Cập nhật trạng thái mic bằng callback, đảm bảo luôn lấy trạng thái mới nhất
            setMicMuted((prevState) => {
                audioTrack.enabled = prevState;  // Cập nhật trực tiếp trạng thái enabled của track
                return !prevState;  // Đảo ngược trạng thái và cập nhật
            });
        } else {
            console.log('Không có track âm thanh nào được tìm thấy');
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
        <div>
            <h1>Audio Chat</h1>
            <input
                type="text"
                placeholder="Tên phòng"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
            />
            <input
                type="text"
                placeholder="Tên người dùng"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            {isJoined ? (
                <button onClick={() => setIsJoined(false)}>Rời Phòng</button>
            ) : (
                <button onClick={joinRoom}>Tham Gia Phòng</button>
            )}

            <div>
                {/* Nút bật/tắt mic */}
                <button onClick={toggleMic}>
                    {micMuted ? 'Bật Mic' : 'Tắt Mic'}
                </button>

                {/* Phát âm thanh từ remote */}
                {remoteStream && (
                    <audio autoPlay controls ref={(audio) => audio && (audio.srcObject = remoteStream)} />
                )}
            </div>
        </div>
    );
};

export default VoiceChat;
