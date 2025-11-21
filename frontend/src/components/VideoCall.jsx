import { useEffect, useRef, useState } from "react";

export default function VideoCall({ socket }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const roomId = "room1"; // can make dynamic later
  const [localStream, setLocalStream] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);

  // --------------------------
  // CREATE PEER CONNECTION
  // --------------------------
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-signal", {
          roomId,
          data: { iceCandidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    return pc;
  };

  // --------------------------
  // JOIN ROOM
  // --------------------------
  const joinRoom = async () => {
    socket.emit("join-call", roomId);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection();
    setPeerConnection(pc);

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    setInCall(true);
  };

  // --------------------------
  // HANDLE PEER JOINED → CREATE OFFER
  // --------------------------
  useEffect(() => {
    socket.on("user-joined", async () => {
      if (!peerConnection) return;

      console.log("A new user joined, creating offer...");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("webrtc-signal", {
        roomId,
        data: { offer },
      });
    });

    return () => socket.off("user-joined");
  }, [peerConnection]);

  // --------------------------
  // HANDLE SIGNALING (Offer, Answer, ICE)
  // --------------------------
  useEffect(() => {
    socket.on("webrtc-signal", async ({ data }) => {
      if (!peerConnection) return;

      try {
        if (data.offer) {
          console.log("Received OFFER");
          await peerConnection.setRemoteDescription(data.offer);

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socket.emit("webrtc-signal", {
            roomId,
            data: { answer },
          });
        }

        if (data.answer) {
          console.log("Received ANSWER");
          await peerConnection.setRemoteDescription(data.answer);
        }

        if (data.iceCandidate) {
          console.log("Received ICE candidate");
          await peerConnection.addIceCandidate(data.iceCandidate);
        }
      } catch (err) {
        console.error("WebRTC signaling error ->", err);
      }
    });

    return () => socket.off("webrtc-signal");
  }, [peerConnection]);

  // --------------------------
  // LEAVE CALL
  // --------------------------
  const leaveCall = () => {
    socket.emit("leave-call", roomId);

    peerConnection?.close();
    setPeerConnection(null);

    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);

    localVideoRef.current.srcObject = null;
    remoteVideoRef.current.srcObject = null;

    setInCall(false);
  };

  return (
    <div style={{ padding: 20, background: "#111", height: "100vh", color: "white" }}>
      <h1>Video Call</h1>

      <div style={{ display: "flex", gap: 20 }}>
        <video autoPlay muted ref={localVideoRef} style={{ width: 300, background: "#333" }} />
        <video autoPlay ref={remoteVideoRef} style={{ width: 500, background: "#333" }} />
      </div>

      {!inCall ? (
        <button onClick={joinRoom} style={btn}>
          Join Call
        </button>
      ) : (
        <button onClick={leaveCall} style={endBtn}>
          Leave Call
        </button>
      )}
    </div>
  );
}

const btn = {
  marginTop: 20,
  padding: "10px 20px",
  fontSize: 18,
  background: "#007bff",
  borderRadius: 8,
  border: "none",
  color: "white",
};

const endBtn = {
  marginTop: 20,
  padding: "10px 20px",
  fontSize: 18,
  background: "#e53935",
  borderRadius: 8,
  border: "none",
  color: "white",
};
