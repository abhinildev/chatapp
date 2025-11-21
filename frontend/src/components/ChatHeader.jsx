import { X, VideoIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();

  if (!selectedUser) return null;

  return (
    <div className="p-2.5 border-b border-base-300 flex items-center justify-between">
      
      {/* Left Side: Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="avatar">
          <div className="size-10 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} />
          </div>
        </div>

        <div>
          <h3 className="font-medium">{selectedUser.fullName}</h3>
          <p className="text-sm opacity-70">
            {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Right Side: Video Call + Close */}
      <div className="flex items-center gap-3">

        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate("/video")}
        >
          Video Call 📞
        </button>

        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
