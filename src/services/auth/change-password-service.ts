import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { hashPassword, verifyPassword } from '@/utils/password';
import { logger } from '@/lib/logger';

@injectable()
export class ChangePasswordService {
  constructor(@inject(UserRepository) private readonly userRepository: UserRepository) {}

  public async execute(data: { userId: string; currentPassword: string; newPassword: string }) {
    const { userId, currentPassword, newPassword } = data;
    try {
      const user = await this.getUserWithPassword(userId);
      await this.verifyCurrentPassword(currentPassword, user.password);
      await this.updateUserPassword(userId, newPassword);

      return {
        code: 200,
        status: 'success',
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      const isBusinessException = 'code' in error && 'status' in error;
      if (isBusinessException) {
        return error;
      }

      logger.error(`ChangePasswordService failure: ${error.message}`, { error });
      return { code: 500, status: 'error', message: 'Unable to change password' };
    }
  }

  // Get User With Password
  private async getUserWithPassword(userId: string) {
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw { code: 404, status: 'error', message: 'User not found' };
    }
    return user;
  }

  // Verify Current Password
  private async verifyCurrentPassword(currentPassword: string, storedHash: string | null) {
    if (!storedHash) {
      throw { code: 400, status: 'error', message: 'OAuth accounts do not have a password set' };
    }

    const isMatch = await verifyPassword(currentPassword, storedHash);
    if (!isMatch) {
      throw { code: 401, status: 'error', message: 'Incorrect current password' };
    }
  }

  // Update User Password
  private async updateUserPassword(userId: string, newPassword: string) {
    const hashedPassword = await hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }
}
