import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Box,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  generateKeyPair,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from "./cryptoUtils";

const socket = io("http://localhost:5000");

const Chat = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [users, setUsers] = useState([]);
  const [chatCache, setChatCache] = useState({});
  const [keyPair, setKeyPair] = useState(null);
  const [sharedSecrets, setSharedSecrets] = useState({});

  // Load or generate keys on component mount
  useEffect(() => {
    const loadOrGenerateKeys = async () => {
      const storedKeyPair = localStorage.getItem(`keyPair_${user.id}`);
      if (storedKeyPair) {
        setKeyPair(JSON.parse(storedKeyPair));
      } else {
        const keys = await generateKeyPair();
        setKeyPair(keys);
        localStorage.setItem(`keyPair_${user.id}`, JSON.stringify(keys));
      }
    };
    loadOrGenerateKeys();
  }, [user.id]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/users");
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();

    // Listen for incoming messages
    socket.on("receive_message", async (data) => {
      if (data.sender_id === user.id) return; // Ignore messages sent by this user

      const chatKey = getChatKey(data.sender_id, data.receiver_id);

      if (sharedSecrets[data.sender_id]) {
        const decryptedMessage = await decryptMessage(
          sharedSecrets[data.sender_id],
          data.encryptedMessage,
          data.iv
        );
        data.message = decryptedMessage;
      }

      setChatCache((prevCache) => ({
        ...prevCache,
        [chatKey]: [...(prevCache[chatKey] || []), data],
      }));

      if (
        (data.sender_id === user.id && data.receiver_id === receiverId) ||
        (data.sender_id === receiverId && data.receiver_id === user.id)
      ) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [user.id, receiverId, sharedSecrets]);

  // Fetch messages when receiver changes
  useEffect(() => {
    if (receiverId) {
      const chatKey = getChatKey(user.id, receiverId);

      if (chatCache[chatKey]) {
        setMessages(chatCache[chatKey]);
      } else {
        const fetchMessages = async () => {
          try {
            const response = await fetch(
              `http://localhost:5000/chat/${user.id}/${receiverId}`
            );
            const data = await response.json();

            setMessages(data);

            setChatCache((prevCache) => ({
              ...prevCache,
              [chatKey]: data,
            }));
          } catch (err) {
            console.error("Failed to fetch messages:", err);
          }
        };

        fetchMessages();
      }
    } else {
      setMessages([]);
    }
  }, [receiverId, user.id, chatCache]);

  // Generate a new key pair
  const generateNewKeyPair = async () => {
    const keys = await generateKeyPair();
    setKeyPair(keys);
    localStorage.setItem(`keyPair_${user.id}`, JSON.stringify(keys));
    alert("New key pair generated!");
  };

  // Send a message
  const sendMessage = async () => {
    if (!receiverId || !newMessage) {
      alert("Please select a user and type a message.");
      return;
    }

    if (!sharedSecrets[receiverId]) {
      alert(
        "Please exchange public keys with the user to establish a shared secret."
      );
      return;
    }

    const { encryptedMessage, iv } = await encryptMessage(
      sharedSecrets[receiverId],
      newMessage
    );

    const messageData = {
      sender_id: user.id,
      receiver_id: receiverId,
      encryptedMessage,
      iv,
    };

    const chatKey = getChatKey(user.id, receiverId);
    const localMessage = { ...messageData, message: newMessage };

    setChatCache((prevCache) => ({
      ...prevCache,
      [chatKey]: [...(prevCache[chatKey] || []), localMessage],
    }));
    setMessages((prev) => [...prev, localMessage]);
    setNewMessage("");

    socket.emit("send_message", messageData);
  };

  // Exchange keys with another user
  const exchangeKeys = async (otherUserId) => {
    const otherUserPublicKey = prompt("Enter the other user's public key:");
    if (!otherUserPublicKey) return;

    const sharedSecret = await deriveSharedSecret(
      keyPair.privateKey,
      otherUserPublicKey
    );
    setSharedSecrets((prev) => ({ ...prev, [otherUserId]: sharedSecret }));
    alert("Key exchange successful! Shared secret established.");
  };

  // Helper functions
  const getChatKey = (id1, id2) => {
    return [id1, id2].sort().join("_");
  };

  const getUsernameById = (id) => {
    const userObj = users.find((u) => u.id === id);
    return userObj ? userObj.username : "Unknown User";
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" component="div">
            Chat
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Logged in as: {user.username}
          </Typography>
        </Box>
        <Button variant="outlined" color="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      <Box mb={2}>
        <Typography>Your Public Key:</Typography>
        <TextField
          value={keyPair?.publicKey || ""}
          fullWidth
          InputProps={{
            readOnly: true,
          }}
        />
        <Box display="flex" gap={2} mt={2}>
          <Button
            variant="outlined"
            onClick={() => navigator.clipboard.writeText(keyPair?.publicKey || "")}
          >
            Copy Public Key
          </Button>
          <Button variant="outlined" onClick={generateNewKeyPair}>
            Generate New Key
          </Button>
        </Box>
      </Box>

      <Box mb={2}>
        <Typography>Chat with:</Typography>
        <Select
          value={receiverId}
          onChange={(e) => setReceiverId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">Select a user</MenuItem>
          {users
            .filter((u) => u.id !== user.id)
            .map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.username}
              </MenuItem>
            ))}
        </Select>
        <Button
          variant="contained"
          onClick={() => exchangeKeys(receiverId)}
          sx={{ mt: 2 }}
        >
          Exchange Keys
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box
        border="1px solid #ccc"
        p={2}
        height="300px"
        overflow="auto"
        mb={2}
        sx={{
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
        }}
      >
        {messages.map((msg, index) => (
          <Box
            key={index}
            textAlign={msg.sender_id === user.id ? "right" : "left"}
            mb={1}
          >
            <Typography
              variant="body2"
              sx={{
                display: "inline-block",
                backgroundColor:
                  msg.sender_id === user.id ? "#1976d2" : "#e0e0e0",
                color: msg.sender_id === user.id ? "white" : "black",
                padding: "8px 12px",
                borderRadius: "12px",
                maxWidth: "60%",
              }}
            >
              <strong>
                {msg.sender_id === user.id
                  ? "You"
                  : getUsernameById(msg.sender_id)}
                :
              </strong>{" "}
              {msg.message}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box display="flex" gap={2}>
        <TextField
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          fullWidth
          variant="outlined"
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          sx={{ alignSelf: "flex-end" }}
        >
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default Chat;
