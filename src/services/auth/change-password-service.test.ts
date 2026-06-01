import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordService } from '@/services/auth/change-password-service';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@/exceptions';

vi.mock('@/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-new-password'),
  verifyPassword: vi.fn().mockImplementation(async (pass, hash) => pass === hash),
}));

describe('ChangePasswordService Unit Tests', () => {
  let mockUserRepository: any;
  let service: ChangePasswordService;

  beforeEach(() => {
    mockUserRepository = {
      findByIdWithPassword: vi.fn(),
      updatePassword: vi.fn(),
    };

    service = new ChangePasswordService(mockUserRepository);
  });

  it('should throw NotFoundException if user is not found', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: 'nonexistent-uuid',
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow(NotFoundException);

    await expect(
      service.execute({
        userId: 'nonexistent-uuid',
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow('User not found');

    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if user signed up via OAuth and has no password', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue({
      id: 'user-uuid',
      password: null, // OAuth account
    });

    await expect(
      service.execute({
        userId: 'user-uuid',
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.execute({
        userId: 'user-uuid',
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow('OAuth accounts do not have a password set');

    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if current password is incorrect', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue({
      id: 'user-uuid',
      password: 'correct-password',
    });

    await expect(
      service.execute({
        userId: 'user-uuid',
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      service.execute({
        userId: 'user-uuid',
        currentPassword: 'wrong-password',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow('Incorrect current password');

    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should successfully update password if current password is correct', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue({
      id: 'user-uuid',
      password: 'correct-password',
    });
    mockUserRepository.updatePassword.mockResolvedValue({ id: 'user-uuid', email: 'john@example.com' });

    const response = await service.execute({
      userId: 'user-uuid',
      currentPassword: 'correct-password',
      newPassword: 'NewPassword2!',
    });

    expect(response).toEqual({
      message: 'Password changed successfully',
    });

    expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-uuid', 'hashed-new-password');
  });

  it('should propagate unexpected internal errors as unhandled exceptions', async () => {
    mockUserRepository.findByIdWithPassword.mockRejectedValue(new Error('Prisma error'));

    await expect(
      service.execute({
        userId: 'user-uuid',
        currentPassword: 'correct-password',
        newPassword: 'NewPassword2!',
      })
    ).rejects.toThrow('Prisma error');
  });
});
