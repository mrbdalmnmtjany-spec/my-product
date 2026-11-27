import { io } from "socket.io-client";

let socket = null;

// في التطوير المحلي بنسيبها فاضية عشان تعدي على الـ proxy بتاع Vite (/socket.io)
// وبعد النشر بنحط لينك الباك اند في VITE_SOCKET_URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
