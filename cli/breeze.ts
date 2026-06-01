import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

// Simple helper to check if a file/directory exists
async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Case conversion helpers
function toPascalCase(str: string): string {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+(.)(\w*)/g, (_, c, w) => c.toUpperCase() + w.toLowerCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[-_ ]+/g, '-')
    .toLowerCase();
}

function pluralize(str: string): string {
  if (str.endsWith('y') && !/[aeiou]y$/i.test(str)) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
    return str + 'es';
  }
  return str + 's';
}

const templates = {
  repository: (name: string) => {
    const pascal = toPascalCase(name);
    const camel = toCamelCase(name);
    const kebab = toKebabCase(name);
    return `import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

@injectable()
export class ${pascal}Repository {
  constructor(@inject('PrismaClient') private readonly db: PrismaClient) {}

  async findById(id: string) {
    return await this.db.${camel}.findFirst({
      where: { id },
    });
  }

  async list(params: { skip?: number; take?: number } = {}) {
    return await this.db.${camel}.findMany({
      skip: params.skip,
      take: params.take,
    });
  }

  async create(data: any) {
    return await this.db.${camel}.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return await this.db.${camel}.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return await this.db.${camel}.delete({
      where: { id },
    });
  }
}
`;
  },

  service: (resourceName: string, serviceName: string) => {
    const resPascal = toPascalCase(resourceName);
    const resCamel = toCamelCase(resourceName);
    const resKebab = toKebabCase(resourceName);
    const srvPascal = toPascalCase(serviceName);

    return `import { injectable, inject } from 'tsyringe';
import { ${resPascal}Repository } from '@/repositories/${resKebab}-repository';
import { NotFoundException } from '@/exceptions';

@injectable()
export class ${srvPascal}Service {
  constructor(
    @inject(${resPascal}Repository) private readonly ${resCamel}Repository: ${resPascal}Repository
  ) {}

  public async execute(data: any) {
    // Add business logic here
    return {
      message: 'Service ${srvPascal} executed successfully',
      data,
    };
  }
}
`;
  },

  controller: (resourceName: string, services: string[]) => {
    const pascal = toPascalCase(resourceName);
    const camel = toCamelCase(resourceName);
    const kebab = toKebabCase(resourceName);

    const imports = services
      .map((s) => `  ${toPascalCase(s)}Service,`)
      .join('\n');

    const injections = services
      .map((s) => `    @inject(${toPascalCase(s)}Service) private readonly ${toCamelCase(s)}Service: ${toPascalCase(s)}Service,`)
      .join('\n');

    const methods = services
      .map((s) => {
        const methodCamel = toCamelCase(s.replace(/Service$/i, '').replace(new RegExp(`^${resourceName}`, 'i'), ''));
        const methodName = methodCamel || 'execute';
        return `  @AsyncController()
  async ${methodName}(req: Request, res: Response) {
    const result = await this.${toCamelCase(s)}Service.execute(req.body ?? {});
    return this.ok(res, result.data, result.message);
  }`;
      })
      .join('\n\n');

    return `import { injectable, inject } from 'tsyringe';
import type { Request, Response } from 'express';
import { BaseController } from '@/controllers/base-controller';
import { AsyncController } from '@/lib/decorators';
import {
${imports}
} from '@/services/${kebab}';

@injectable()
export class ${pascal}Controller extends BaseController {
  constructor(
${injections}
  ) {
    super();
  }

${methods}
}
`;
  },

  schema: (name: string) => {
    const camel = toCamelCase(name);
    const pascal = toPascalCase(name);
    return `import { z } from 'zod';
import { createSuccessResponseSchema } from '../common';

export const ${camel}Schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const create${pascal}Schema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
});

export const update${pascal}Schema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
  }),
});

export const get${pascal}Schema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});

export const list${pascal}sSchema = z.object({
  query: z.object({
    skip: z.coerce.number().optional(),
    take: z.coerce.number().optional(),
  }).optional(),
});

export const ${pascal}SuccessResponseSchema = createSuccessResponseSchema(
  ${camel}Schema,
  '${pascal} operation successful'
);

export const ${pascal}ListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(${camel}Schema),
  '${pascal} list retrieved'
);
`;
  },

  route: (name: string) => {
    const pascal = toPascalCase(name);
    const camel = toCamelCase(name);
    const kebab = toKebabCase(name);
    const pluralKebab = toKebabCase(pluralize(name));

    return `import { container } from '@/lib/container';
import { ${pascal}Controller } from '@/controllers/${kebab}-controller';
import {
  create${pascal}Schema,
  update${pascal}Schema,
  get${pascal}Schema,
  list${pascal}sSchema,
  ${pascal}SuccessResponseSchema,
  ${pascal}ListSuccessResponseSchema,
} from '@/schemas/${kebab}';
import { OpenApiRouter } from '@/lib/openapi-router';

const openApiRouter = new OpenApiRouter('/api/${pluralKebab}');
const controller = container.resolve(${pascal}Controller);

// Create
openApiRouter.post({
  path: '/',
  summary: 'Create a new ${name}',
  description: 'Creates a new ${name} record in the database.',
  tags: ['${pascal}'],
  request: create${pascal}Schema,
  response: ${pascal}SuccessResponseSchema,
  errors: [400, 500],
  handler: controller.create,
});

// List
openApiRouter.get({
  path: '/',
  summary: 'List ${pluralize(name)}',
  description: 'Retrieves a list of ${pluralize(name)}.',
  tags: ['${pascal}'],
  request: list${pascal}sSchema,
  response: ${pascal}ListSuccessResponseSchema,
  errors: [500],
  handler: controller.list,
});

// Get Detail
openApiRouter.get({
  path: '/:id',
  summary: 'Get ${name} details',
  description: 'Retrieves details for a specific ${name}.',
  tags: ['${pascal}'],
  request: get${pascal}Schema,
  response: ${pascal}SuccessResponseSchema,
  errors: [404, 500],
  handler: controller.get,
});

// Update
openApiRouter.put({
  path: '/:id',
  summary: 'Update a ${name}',
  description: 'Updates details of an existing ${name}.',
  tags: ['${pascal}'],
  request: update${pascal}Schema,
  response: ${pascal}SuccessResponseSchema,
  errors: [400, 404, 500],
  handler: controller.update,
});

// Delete
openApiRouter.delete({
  path: '/:id',
  summary: 'Delete a ${name}',
  description: 'Deletes a specific ${name} from the database.',
  tags: ['${pascal}'],
  request: get${pascal}Schema,
  response: ${pascal}SuccessResponseSchema,
  errors: [404, 500],
  handler: controller.delete,
});

export default openApiRouter.router;
`;
  },
};

async function writeComponentFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!(await exists(dir))) {
    await fs.mkdir(dir, { recursive: true });
  }
  if (await exists(filePath)) {
    console.log(`\x1b[33m[SKIPPED] Already exists:\x1b[0m ${filePath}`);
    return;
  }
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`\x1b[32m[CREATED]\x1b[0m ${filePath}`);
}

async function scaffoldController(resource: string, services: string[]) {
  const kebab = toKebabCase(resource);
  const filePath = path.join(process.cwd(), 'src/controllers', `${kebab}-controller.ts`);
  const content = templates.controller(resource, services);
  await writeComponentFile(filePath, content);
}

async function scaffoldRepository(resource: string) {
  const kebab = toKebabCase(resource);
  const filePath = path.join(process.cwd(), 'src/repositories', `${kebab}-repository.ts`);
  const content = templates.repository(resource);
  await writeComponentFile(filePath, content);
}

async function scaffoldService(resource: string, serviceName: string) {
  const resKebab = toKebabCase(resource);
  const srvKebab = toKebabCase(serviceName);
  const filePath = path.join(process.cwd(), 'src/services', resKebab, `${srvKebab}-service.ts`);
  const content = templates.service(resource, serviceName);
  await writeComponentFile(filePath, content);
}

async function scaffoldSchema(resource: string) {
  const kebab = toKebabCase(resource);
  const filePath = path.join(process.cwd(), 'src/schemas', kebab, `index.ts`);
  const content = templates.schema(resource);
  await writeComponentFile(filePath, content);
}

async function scaffoldRoute(resource: string) {
  const kebab = toKebabCase(resource);
  const filePath = path.join(process.cwd(), 'src/routes', `${kebab}-routes.ts`);
  const content = templates.route(resource);
  await writeComponentFile(filePath, content);
}

async function scaffoldResource(resource: string) {
  const pascal = toPascalCase(resource);
  console.log(`\n\x1b[36mScaffolding full resource: ${pascal}\x1b[0m`);

  const services = [
    `Create${pascal}`,
    `Get${pascal}`,
    `List${pascal}s`,
    `Update${pascal}`,
    `Delete${pascal}`,
  ];

  // 1. Repository
  await scaffoldRepository(resource);

  // 2. Services
  for (const srv of services) {
    await scaffoldService(resource, srv);
  }
  // Generate service index.ts
  const resKebab = toKebabCase(resource);
  const srvIndexContent = services
    .map((s) => `export * from './${toKebabCase(s)}-service';`)
    .join('\n') + '\n';
  const srvIndexPath = path.join(process.cwd(), 'src/services', resKebab, 'index.ts');
  await writeComponentFile(srvIndexPath, srvIndexContent);

  // 3. Controller
  await scaffoldController(resource, services);

  // 4. Schema
  await scaffoldSchema(resource);

  // 5. Route
  await scaffoldRoute(resource);

  console.log(`\n\x1b[32mResource ${pascal} scaffolded successfully!\x1b[0m`);
  console.log(`\x1b[33mDon't forget to:\x1b[0m`);
  console.log(`1. Define the model \`${toCamelCase(resource)}\` in \`prisma/schema.prisma\``);
  console.log(`2. Run \`npm run db:generate\``);
  console.log(`3. Register the new route file \`src/routes/${resKebab}-routes.ts\` in \`src/routes/index.ts\``);
}

// Interactive prompt
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  const args = process.argv.slice(2);
  let type = args[0];
  let name = args[1];

  if (!type) {
    console.log('\x1b[36m=== Express Clean Architecture Generator ===\x1b[0m');
    console.log('Available commands:');
    console.log('  resource <Name>    - Scaffold full CRUD logic');
    console.log('  controller <Name>  - Scaffold a controller class');
    console.log('  service <Name>     - Scaffold a business logic service');
    console.log('  repository <Name>  - Scaffold a database repository');
    console.log('  schema <Name>      - Scaffold Zod validation schemas');
    console.log('  route <Name>       - Scaffold routes using OpenApiRouter');
    console.log('');

    type = await askQuestion('What do you want to generate? ');
  }

  if (!name && ['resource', 'controller', 'service', 'repository', 'schema', 'route'].includes(type)) {
    name = await askQuestion(`Enter the name of the ${type}: `);
  }

  if (!type || !name) {
    console.error('\x1b[31mError: Type and name are required.\x1b[0m');
    process.exit(1);
  }

  const cleanType = type.toLowerCase().trim();

  try {
    switch (cleanType) {
      case 'resource':
        await scaffoldResource(name);
        break;
      case 'controller':
        const controllerServicesStr = await askQuestion('Enter associated service names (comma-separated, e.g. CreateUser,ListUsers) [optional]: ');
        const srvs = controllerServicesStr ? controllerServicesStr.split(',').map((s) => s.trim()) : [];
        await scaffoldController(name, srvs);
        break;
      case 'service':
        const parentResource = await askQuestion('Enter the parent resource folder name (e.g. user): ');
        if (!parentResource) {
          console.error('\x1b[31mError: Parent resource folder name is required for a service.\x1b[0m');
          process.exit(1);
        }
        await scaffoldService(parentResource, name);
        break;
      case 'repository':
        await scaffoldRepository(name);
        break;
      case 'schema':
        await scaffoldSchema(name);
        break;
      case 'route':
        await scaffoldRoute(name);
        break;
      default:
        console.error(`\x1b[31mUnknown generator type: ${type}\x1b[0m`);
        process.exit(1);
    }
  } catch (error) {
    console.error('\x1b[31mGeneration failed:\x1b[0m', error);
    process.exit(1);
  }
}

main();
