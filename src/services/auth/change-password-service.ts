import { injectable, inject } from 'tsyringe';
import { UserRepository } from '@/repositories/user-repository';
import { hashPassword, verifyPassword } from '@/utils/password';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@/exceptions';

@injectable()
export class ChangePasswordService {
  constructor(@inject(UserRepository) private readonly userRepository: UserRepository) {}

  public async execute(data: { userId: string; currentPassword: string; newPassword: string }) {
    const { userId, currentPassword, newPassword } = data;

    const user = await this.getUserWithPassword(userId);
    await this.verifyCurrentPassword(currentPassword, user.password);
    await this.updateUserPassword(userId, newPassword);

    return {
      message: 'Password changed successfully',
    };
  }

  // Get User With Password
  private async getUserWithPassword(userId: string) {
    const user = await this.userRepository.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Verify Current Password
  private async verifyCurrentPassword(currentPassword: string, storedHash: string | null) {
    if (!storedHash) {
      throw new BadRequestException('OAuth accounts do not have a password set');
    }

    const isMatch = await verifyPassword(currentPassword, storedHash);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect current password');
    }
  }

  // Update User Password
  private async updateUserPassword(userId: string, newPassword: string) {
    const hashedPassword = await hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }
}
