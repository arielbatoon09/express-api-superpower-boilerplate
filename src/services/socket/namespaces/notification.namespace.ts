import { AuthenticatedSocket } from '@/services/socket/types';
import { BaseNamespace } from '@/services/socket/namespaces/base.namespace';
import { logger } from '@/lib/logger';

export class NotificationNamespace extends BaseNamespace {
  public readonly path = '/notifications';

  protected onConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user?.id || 'anonymous';
    logger.info(`🔔 User [${userId}] joined notifications namespace`);

    // Auto-join user into their private room for targeted events
    const privateRoom = `user_${userId}`;
    socket.join(privateRoom);

    socket.on('disconnect', () => {
      logger.info(`🔔 User [${userId}] left notifications namespace`);
    });
  }

  /**
   * Send a real-time notification to a specific user
   */
  public sendToUser<T = any>(userId: string, event: string, payload: T): void {
    const privateRoom = `user_${userId}`;
    this.ioNamespace.to(privateRoom).emit(event, {
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`🔔 Sent notification event "${event}" to User [${userId}]`);
  }

  /**
   * Send a real-time notification to all connected users
   */
  public broadcast<T = any>(event: string, payload: T): void {
    this.ioNamespace.emit(event, {
      event,
      data: payload,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`🔔 Broadcasted notification event "${event}" to all users`);
  }
}