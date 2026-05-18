import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordService } from '@/services/auth/change-password-service';

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

  it('should reject with 404 if user is not found', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue(null);

    const response = await service.execute({
      userId: 'nonexistent-uuid',
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword2!',
    });

    expect(response).toEqual({
      code: 404,
      status: 'error',
      message: 'User not found',
    });
    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should reject with 400 if user signed up via OAuth and has no password', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue({
      id: 'user-uuid',
      password: null, // OAuth account
    });

    const response = await service.execute({
      userId: 'user-uuid',
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword2!',
    });

    expect(response).toEqual({
      code: 400,
      status: 'error',
      message: 'OAuth accounts do not have a password set',
    });
    expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('should reject with 401 if current password is incorrect', async () => {
    mockUserRepository.findByIdWithPassword.mockResolvedValue({
      id: 'user-uuid',
      password: 'correct-password',
    });

    const response = await service.execute({
      userId: 'user-uuid',
      currentPassword: 'wrong-password',
      newPassword: 'NewPassword2!',
    });

    expect(response).toEqual({
      code: 401,
      status: 'error',
      message: 'Incorrect current password',
    });
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
      code: 200,
      status: 'success',
      message: 'Password changed successfully',
    });

    expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-uuid', 'hashed-new-password');
  });

  it('should return error 500 on database failure', async () => {
    mockUserRepository.findByIdWithPassword.mockRejectedValue(new Error('Prisma error'));

    const response = await service.execute({
      userId: 'user-uuid',
      currentPassword: 'correct-password',
      newPassword: 'NewPassword2!',
    });

    expect(response).toEqual({
      code: 500,
      status: 'error',
      message: 'Unable to change password',
    });
  });
});
