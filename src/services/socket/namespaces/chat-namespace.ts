import { AuthenticatedSocket } from '@/services/socket/types';
import { BaseNamespace } from '@/services/socket/namespaces/base-namespace';
import { logger } from '@/lib/logger';

export class ChatNamespace extends BaseNamespace {
  public readonly path = '/chat';

  protected onConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user?.id || 'anonymous';
    const userEmail = socket.user?.email || 'anonymous';

    // Handle joining a chat room
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      logger.info(`User [${userId}] joined chat room: ${roomId}`);
      
      // Notify other members of the room
      socket.to(roomId).emit('user_joined', {
        userId,
        email: userEmail,
        timestamp: new Date().toISOString()
      });
    });

    // Handle leaving a chat room
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      logger.info(`User [${userId}] left chat room: ${roomId}`);
      
      // Notify other members of the room
      socket.to(roomId).emit('user_left', {
        userId,
        email: userEmail,
        timestamp: new Date().toISOString()
      });
    });

    // Handle sending a chat message to a room
    socket.on('send_message', (data: { roomId: string; message: string }) => {
      const { roomId, message } = data;
      logger.debug(`User [${userId}] sent message in room [${roomId}]`);

      // Emit to everyone in the room (including sender)
      this.ioNamespace.to(roomId).emit('new_message', {
        senderId: userId,
        senderEmail: userEmail,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle user typing indicators
    socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit('user_typing', {
        userId,
        isTyping,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User [${userId}] disconnected from Chat namespace`);
    });
  }
}