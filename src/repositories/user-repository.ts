import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

@injectable()
export class UserRepository {
  constructor(@inject('PrismaClient') private readonly db: PrismaClient) {}

  async findById(id: string) {
    return await this.db.user.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true,
        emailVerifiedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.db.user.findFirst({ where: { email } });
  }

  async create(data: { name?: string | null; email: string; password?: string | null; emailVerifiedAt?: Date | null }) {
    return await this.db.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true,
        emailVerifiedAt: true,
      },
    });
  }

  async markEmailVerified(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
  }
}
