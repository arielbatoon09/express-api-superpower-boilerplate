import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginWithEmailService } from '@/services/auth/login-with-email-service';
import { verifyPassword } from '@/utils/password';
import { BadRequestException, ForbiddenException } from '@/exceptions';

// Mock password verification
vi.mock('@/utils/password', () => ({
  verifyPassword: vi.fn(),
}));

// Mock JWT generation functions
vi.mock('@/lib/jwt', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  TokenExpiry: {
    ACCESS_TOKEN_EXPIRES: '15m',
    REFRESH_TOKEN_EXPIRES: '7d',
  },
}));

describe('LoginWithEmailService Unit Tests', () => {
  let mockUserRepository: any;
  let mockTokenRepository: any;
  let service: LoginWithEmailService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      findByEmail: vi.fn(),
    };

    mockTokenRepository = {
      createRefreshToken: vi.fn(),
    };

    // Clean constructor injection
    service = new LoginWithEmailService(mockUserRepository, mockTokenRepository);
  });

  it('should successfully login a user if credentials match and email is verified', async () => {
    // Arrange
    const loginData = { email: 'test@example.com', password: 'Password123!' };
    const mockUser = {
      id: 'user-uuid-123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password-123',
      role: 'USER',
      emailVerifiedAt: new Date('2026-05-18T12:00:00.000Z'),
      image: 'https://example.com/avatar.png',
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    mockTokenRepository.createRefreshToken.mockResolvedValue({ id: 'token-uuid' });

    // Act
    const response = await service.execute(loginData);

    // Assert
    expect(response).toEqual({
      message: 'Login successful',
      data: {
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: '15m',
          refreshExpiresIn: '7d',
        },
        user: {
          id: 'user-uuid-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          emailVerifiedAt: mockUser.emailVerifiedAt,
          image: 'https://example.com/avatar.png',
        },
      },
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    expect(verifyPassword).toHaveBeenCalledWith('Password123!', 'hashed-password-123');
    expect(mockTokenRepository.createRefreshToken).toHaveBeenCalledWith({
      userId: 'user-uuid-123',
      token: 'mock-refresh-token',
      expiresAt: expect.any(Date),
    });
  });

  it('should throw BadRequestException if credentials do not match (invalid email or password)', async () => {
    // Arrange
    const loginData = { email: 'wrong@example.com', password: 'wrongpassword' };
    mockUserRepository.findByEmail.mockResolvedValue(null); // User not found

    // Act & Assert
    await expect(service.execute(loginData)).rejects.toThrow(BadRequestException);
    await expect(service.execute(loginData)).rejects.toThrow('Invalid Credentials');

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('wrong@example.com');
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(mockTokenRepository.createRefreshToken).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if password verification fails', async () => {
    // Arrange
    const loginData = { email: 'test@example.com', password: 'wrongpassword' };
    const mockUser = {
      id: 'user-uuid-123',
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password-123',
      role: 'USER',
      emailVerifiedAt: new Date(),
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(false); // Wrong password

    // Act & Assert
    await expect(service.execute(loginData)).rejects.toThrow(BadRequestException);
    await expect(service.execute(loginData)).rejects.toThrow('Invalid Credentials');
  });

  it('should throw ForbiddenException if user email is not verified', async () => {
    // Arrange
    const loginData = { email: 'unverified@example.com', password: 'Password123!' };
    const mockUser = {
      id: 'user-uuid-123',
      name: 'Unverified User',
      email: 'unverified@example.com',
      password: 'hashed-password-123',
      role: 'USER',
      emailVerifiedAt: null, // Unverified!
    };

    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    // Act & Assert
    await expect(service.execute(loginData)).rejects.toThrow(ForbiddenException);
    await expect(service.execute(loginData)).rejects.toThrow('Please verify your email first');

    expect(mockTokenRepository.createRefreshToken).not.toHaveBeenCalled();
  });

  it('should propagate unexpected internal errors as unhandled exceptions', async () => {
    // Arrange
    const loginData = { email: 'error@example.com', password: 'Password123!' };
    mockUserRepository.findByEmail.mockRejectedValue(new Error('PostgreSQL database crashed'));

    // Act & Assert
    await expect(service.execute(loginData)).rejects.toThrow('PostgreSQL database crashed');
  });
});
