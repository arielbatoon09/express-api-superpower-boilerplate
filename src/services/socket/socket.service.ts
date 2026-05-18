import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { envConfig } from '@/config/env';
import { logger } from '@/lib/logger';
import { AuthenticatedSocket, DecodedUser } from './types';

// Namespaces
import { NotificationNamespace } from './namespaces/notification.namespace';
import { ChatNamespace } from './namespaces/chat.namespace';

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  // Registered namespaces
  public notifications!: NotificationNamespace;
  public chat!: ChatNamespace;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize Socket.IO with an HTTP Server instance
   */
  public init(server: http.Server): void {
    if (this.io) {
      logger.warn('⚠️ WebSocket server has already been initialized.');
      return;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: envConfig.FRONTEND_URL,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
    });

    // Initialize Namespaces & apply authentication
    this.registerNamespaces();

    logger.info('🔌 WebSocket server successfully initialized and attached to HTTP Server.');
  }

  /**
   * Retrieve the primary Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('❌ SocketService has not been initialized. Call init(server) first.');
    }
    return this.io;
  }

  /**
   * Get shared auth middleware for all namespaces
   */
  public getAuthMiddleware() {
    return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      try {
        let token = '';

        // 1. Check client handshake auth block (preferred standard for Socket.IO clients)
        // e.g. io({ auth: { token: '...' } })
        if (socket.handshake.auth && socket.handshake.auth.token) {
          token = socket.handshake.auth.token;
        }

        // 2. Check Cookie headers
        if (!token && socket.handshake.headers.cookie) {
          const cookies = cookie.parse(socket.handshake.headers.cookie);
          token = cookies.token || cookies.jwt; // adjusts to boilerplate cookie keys
        }

        // 3. Check Authorization header
        if (!token && socket.handshake.headers.authorization) {
          const parts = socket.handshake.headers.authorization.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
          }
        }

        if (!token) {
          logger.warn(`🔌 Connection from socket [${socket.id}] rejected: No Auth Token provided.`);
          return next(new Error('Authentication failed: No token provided'));
        }

        // Verify Token
        const decoded = jwt.verify(token, envConfig.JWT_SECRET) as DecodedUser;
        socket.user = decoded; // Attach to socket instance for handlers

        next();
      } catch (err) {
        logger.error(`🔌 Auth error for socket [${socket.id}]:`, err);
        next(new Error('Authentication failed: Invalid token'));
      }
    };
  }

  /**
   * Register feature namespaces and apply the shared auth middleware
   */
  private registerNamespaces(): void {
    if (!this.io) return;

    const auth = this.getAuthMiddleware();

    // Default namespace authentication
    this.io.use(auth);

    // Notifications namespace setup
    const notificationsOf = this.io.of('/notifications');
    notificationsOf.use(auth);
    this.notifications = new NotificationNamespace(notificationsOf);

    // Chat namespace setup
    const chatOf = this.io.of('/chat');
    chatOf.use(auth);
    this.chat = new ChatNamespace(chatOf);
  }
}
