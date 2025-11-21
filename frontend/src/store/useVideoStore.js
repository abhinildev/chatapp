import { useState, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "/";

export function useVideoCall() {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pendingCandidates = useRef([]);


  const [inCall, setInCall] = useState(false);
  const [roomId, setRoomId] = useState(null);

  const startCall = async (room) => {
    setInCall(true);
    setRoomId(room);

    // 1️⃣ Connect socket
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("user-joined", handleUserJoined);
    socketRef.current.on("webrtc-signal", handleSignal);
    socketRef.current.on("user-left", handleUserLeft);

    socketRef.current.emit("join-call", room);

    // 2️⃣ Get media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideoRef.current.srcObject = stream;

    // 3️⃣ Create peer connection immediately (both users)
    createPeerConnection(stream);
  };

  const createPeerConnection = (stream) => {
    peerRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks
    stream.getTracks().forEach((track) => peerRef.current.addTrack(track, stream));

    // ICE candidates
    peerRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit("webrtc-signal", {
          roomId,
          data: { candidate: e.candidate },
        });
      }
    };

    // Remote tracks
    peerRef.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };
  };

  const handleUserJoined = async () => {
    // If local peerRef exists, create offer
    if (!peerRef.current) return;

    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);

    socketRef.current.emit("webrtc-signal", {
      roomId,
      data: { offer },
    });
  };

 const handleSignal = async ({ data }) => {
  const peer = peerRef.current;
  if (!peer) return;

  try {
    if (data.offer) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));

      // Ensure local tracks are added before sending answer
      const stream = localVideoRef.current.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      }

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socketRef.current.emit("webrtc-signal", {
        roomId,
        data: { answer },
      });

      // Apply queued ICE candidates
      pendingCandidates.current.forEach(async (c) => {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.error(err);
        }
      });
      pendingCandidates.current = [];
    }

    if (data.answer) {
      await peer.setRemoteDescription(new RTCSessionDescription(data.answer));

      // Apply queued ICE candidates
      pendingCandidates.current.forEach(async (c) => {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.error(err);
        }
      });
      pendingCandidates.current = [];
    }

    if (data.candidate) {
      // Only add ICE if remote description is set, otherwise queue it
      if (peer.remoteDescription && peer.remoteDescription.type) {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        pendingCandidates.current.push(data.candidate);
      }
    }
  } catch (err) {
    console.error("WebRTC signaling error ->", err);
  }
};


  const handleUserLeft = () => {
    endCall();
  };

  const endCall = () => {
    setInCall(false);

    peerRef.current?.close();
    peerRef.current = null;

    socketRef.current?.emit("leave-call", roomId);
    socketRef.current?.disconnect();
  };

  return {
    startCall,
    endCall,
    inCall,
    localVideoRef,
    remoteVideoRef,
  };
}

