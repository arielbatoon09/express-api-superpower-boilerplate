import { logger } from '@/lib/logger';
import { SignupWithEmailInput } from '@/schemas/auth';
import { injectable } from "tsyringe";

@injectable()
export class SignupWithEmailService {
  constructor() {
    logger.info('Email signup service initialized');
  }

  /**
   * Scaffolding method to run user signup flow.
   * Currently returns a high-fidelity sample success response.
   */
  async execute(data: SignupWithEmailInput) {
    const { name, email } = data;

    logger.info(`[Scaffolding] Received signup request for: ${email}`);

    // Return a structured sample result
    return {
      code: 201,
      status: 'success',
      message: 'User registered successfully (scaffolding mock)',
      data: {
        user: {
          id: 'mock-uuid-123456',
          name: name || 'Mock User',
          email: email || 'mock@example.com',
          role: 'USER',
          createdAt: new Date().toISOString(),
        },
      },
    };
  }
}