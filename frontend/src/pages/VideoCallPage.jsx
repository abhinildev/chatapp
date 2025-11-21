import VideoCall from "../components/VideoCall";
import { io } from "socket.io-client";
import { useMemo } from "react";

export default function VideoCallPage() {
  // Create socket connection
  const socket = useMemo(() => io("http://localhost:5001"), []);

  // Create peer connection
  const peerConnection = useMemo(() => {
    return new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
  }, []);

  return (
    <VideoCall socket={socket} peerConnection={peerConnection} />
  );
}
