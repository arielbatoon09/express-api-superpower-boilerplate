import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import jwt from 'jsonwebtoken';
import { SocketService } from '../../src/services/socket/socket-service';
import { envConfig } from '../../src/config/env';
describe('Socket.IO Service Integration Tests', () => {
  let server: http.Server;
  let socketService: SocketService;
  let port: number;
  let testToken: string;
  const mockUser = { id: 'user_123', email: 'test@example.com' };

  beforeAll(async () => {
    // Generate valid JWT test token
    testToken = jwt.sign(mockUser, envConfig.JWT_SECRET);

    // Create an ephemeral HTTP server
    const app = express();
    server = http.createServer(app);

    // Initialize Socket Service
    socketService = SocketService.getInstance();
    socketService.init(server);

    // Listen on dynamic port 0 (operating system chooses any free port)
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        port = typeof address === 'string' ? 8000 : address?.port || 8000;
        resolve();
      });
    });
  });

  afterAll(() => {
    // Stop all WebSocket client listeners and tear down the server
    const io = socketService.getIO();
    io.close();
    server.close();
  });

  it('should reject client connection if no JWT auth token is provided', () => {
    return new Promise<void>((resolve, reject) => {
      const client: ClientSocket = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        client.disconnect();
        reject(new Error('Expected server to reject connection but it succeeded.'));
      });

      client.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        resolve();
      });
    });
  });

  it('should authenticate client successfully with a valid JWT token', () => {
    return new Promise<void>((resolve) => {
      const client: ClientSocket = ioc(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { token: testToken },
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
    });
  });

  it('should join user to private room and receive private targeted notifications', () => {
    return new Promise<void>((resolve) => {
      const client: ClientSocket = ioc(`http://localhost:${port}/notifications`, {
        transports: ['websocket'],
        auth: { token: testToken },
      });

      client.on('connect', () => {
        // Wait 100ms to ensure the async room join finishes on the server
        setTimeout(() => {
          // Emit a targeted user event via the server instance
          socketService.notifications.sendToUser('user_123', 'new_alert', {
            msg: 'You have a new message!',
          });
        }, 100);
      });

      client.on('new_alert', (payload) => {
        expect(payload.data.msg).toBe('You have a new message!');
        expect(payload.event).toBe('new_alert');
        client.disconnect();
        resolve();
      });
    });
  });

  it('should support dynamic rooms and broadcast messages within a Chat room', () => {
    return new Promise<void>((resolve) => {
      // Client 1 (User 123)
      const client1: ClientSocket = ioc(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        auth: { token: testToken },
      });

      // Client 2 (User 456)
      const client2Token = jwt.sign({ id: 'user_456', email: 'user2@example.com' }, envConfig.JWT_SECRET);
      const client2: ClientSocket = ioc(`http://localhost:${port}/chat`, {
        transports: ['websocket'],
        auth: { token: client2Token },
      });

      let connectCount = 0;
      const onConnect = () => {
        connectCount++;
        if (connectCount === 2) {
          // Both clients are connected. Now join them both to the room.
          client1.emit('join_room', 'room_premium_chat');
          client2.emit('join_room', 'room_premium_chat');

          // Wait 100ms to ensure both join processes completed on the server
          setTimeout(() => {
            client1.emit('send_message', {
              roomId: 'room_premium_chat',
              message: 'Hey there! Welcome to the premium group chat!',
            });
          }, 100);
        }
      };

      client1.on('connect', onConnect);
      client2.on('connect', onConnect);

      // Client 2 listens for the message
      client2.on('new_message', (payload) => {
        expect(payload.message).toBe('Hey there! Welcome to the premium group chat!');
        expect(payload.senderId).toBe('user_123');
        expect(payload.senderEmail).toBe('test@example.com');
        
        client1.disconnect();
        client2.disconnect();
        resolve();
      });
    });
  });
});
