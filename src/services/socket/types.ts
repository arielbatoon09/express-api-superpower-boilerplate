import { Socket } from 'socket.io';

export interface DecodedUser {
  id: string;
  email: string;
  role?: string;
  [key: string]: any;
}

// Extend Socket to include authenticated user details
export interface AuthenticatedSocket extends Socket {
  user?: DecodedUser;
}

export interface WsResponse<T = any> {
  event: string;
  data: T;
  timestamp: string;
}
