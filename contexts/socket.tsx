import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUserProfile } from "./user-profile";
import { SOCKET_URL } from "../lib/config";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const { accessToken } = useUserProfile();

  const closeSocket = useCallback((target: Socket | null) => {
    if (!target) return;

    try {
      target.removeAllListeners();
      target.io.removeAllListeners();
      target.disconnect();
    } catch {
      // No-op cleanup guard
    }
  }, []);

  const attachSocketListeners = useCallback((targetSocket: Socket) => {
    targetSocket.on("connect", () => {
      setIsConnected(true);
    });

    // Server sends this immediately after route setup; treat as connected signal too.
    targetSocket.on("connected", () => {
      setIsConnected(true);
    });

    targetSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    targetSocket.on("connect_error", () => {
      setIsConnected(false);
    });

    targetSocket.io.on("reconnect", () => {
      setIsConnected(true);
    });

    targetSocket.io.on("reconnect_error", () => {
      setIsConnected(false);
    });

    targetSocket.io.on("reconnect_attempt", () => {
      const token = tokenRef.current;
      if (!token) return;
      targetSocket.auth = { token };
      targetSocket.io.opts.query = { token };
      targetSocket.io.opts.extraHeaders = {
        Authorization: `Bearer ${token}`,
      };
    });
  }, []);

  const createSocket = useCallback(
    (token: string) => {
      const nextSocket = io(SOCKET_URL, {
        path: "/socket.io",
        auth: { token },
        query: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: false,
        forceNew: true,
      });

      attachSocketListeners(nextSocket);
      return nextSocket;
    },
    [attachSocketListeners]
  );

  useEffect(() => {
    const normalizedToken = accessToken?.trim() || null;

    if (!normalizedToken) {
      tokenRef.current = null;
      setIsConnected(false);

      if (socketRef.current) {
        closeSocket(socketRef.current);
        socketRef.current = null;
      }

      setSocket(null);
      return;
    }

    const existingSocket = socketRef.current;
    const tokenChanged = tokenRef.current !== normalizedToken;

    if (!existingSocket || tokenChanged) {
      if (existingSocket) {
        closeSocket(existingSocket);
      }

      const nextSocket = createSocket(normalizedToken);
      socketRef.current = nextSocket;
      tokenRef.current = normalizedToken;
      setSocket(nextSocket);
      setIsConnected(false);
      nextSocket.connect();
      return;
    }

    existingSocket.auth = { token: normalizedToken };
    existingSocket.io.opts.query = { token: normalizedToken };
    existingSocket.io.opts.extraHeaders = {
      Authorization: `Bearer ${normalizedToken}`,
    };

    tokenRef.current = normalizedToken;
    setSocket(existingSocket);

    if (!existingSocket.connected) {
      existingSocket.connect();
    } else {
      setIsConnected(true);
    }
  }, [accessToken, createSocket, closeSocket]);

  useEffect(() => {
    return () => {
      tokenRef.current = null;
      setIsConnected(false);
      if (socketRef.current) {
        closeSocket(socketRef.current);
        socketRef.current = null;
      }
      setSocket(null);
    };
  }, [closeSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
