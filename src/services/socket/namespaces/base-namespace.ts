import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from '../types';
import { logger } from '@/lib/logger';

export abstract class BaseNamespace {
  /**
   * The namespace path (e.g. '/chat', '/notifications')
   */
  public abstract readonly path: string;

  constructor(protected ioNamespace: Namespace) {
    this.setupMiddleware();
    this.setupConnectionHandler();
  }

  /**
   * Setup namespace-specific middlewares (e.g. authorization checks)
   */
  protected setupMiddleware(): void {
    // Implement custom authorization middlewares here if needed
  }

  /**
   * Hooks into the connection event and delegates to children
   */
  private setupConnectionHandler(): void {
    this.ioNamespace.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🔌 Client [${socket.id}] connected to namespace: ${this.path}`);
      this.onConnection(socket);
    });
  }

  /**
   * Custom lifecycle method when a socket connects
   */
  protected abstract onConnection(socket: AuthenticatedSocket): void;
}
