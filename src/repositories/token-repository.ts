import { injectable, inject } from 'tsyringe';
import { PrismaClient, Token, TokenType } from '@prisma/client';

@injectable()
export class TokenRepository {
  constructor(@inject('PrismaClient') private readonly db: PrismaClient) {}

  async createEmailVerificationToken(params: { userId: string; token: string; expiresAt: Date }) {
    const { userId, token, expiresAt } = params;
    return this.db.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.EMAIL_VERIFY,
      },
    });
  }

  async createRefreshToken(params: { userId: string; token: string; expiresAt: Date }) {
    const { userId, token, expiresAt } = params;
    return this.db.token.create({
      data: {
        userId,
        token,
        expiresAt,
        type: TokenType.REFRESH,
      },
    });
  }

  async findActiveRefreshToken(token: string): Promise<Token | null> {
    return this.db.token.findFirst({
      where: {
        token,
        type: TokenType.REFRESH,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  async findActiveEmailVerificationToken(token: string): Promise<Token | null> {
    return this.db.token.findFirst({
      where: {
        token,
        type: TokenType.EMAIL_VERIFY,
        consumedAt: null,
        revokedAt: null,
      },
    });
  }

  async findLatestEmailVerificationTokenByUser(userId: string): Promise<Token | null> {
    return this.db.token.findFirst({
      where: {
        userId,
        type: TokenType.EMAIL_VERIFY,
        consumedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async consumeToken(id: string) {
    return this.db.token.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async revokeToken(id: string) {
    return this.db.token.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
