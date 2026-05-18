import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { envConfig } from '@/config/env';
import swaggerUi from 'swagger-ui-express';

// Enhance Zod with OpenAPI methods globally
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Register Bearer Auth Security Component
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter JWT token using: Bearer <token>',
});

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: envConfig.APP_NAME,
      version: '1.0.0',
      description: `API Documentation for ${envConfig.APP_NAME}.`,
    },
    servers: [
      {
        url: `${envConfig.BACKEND_URL}/api`,
        description: 'Primary Server Environment',
      },
    ],
  });
};

export { swaggerUi };