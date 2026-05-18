# ⚡ Express API Superpower Boilerplate

A production-grade, highly-opinionated, and modular Express boilerplate engineered with **TypeScript**, **Clean Architecture**, and automated **Dependency Injection (tsyringe)**. Designed for maximum developer velocity, robust type-safety, and seamless testing.

---

## 🚀 Key Features

* 🏛️ **Clean Architecture**: Strictly separated layers (`Routes ➔ Controllers ➔ Services ➔ Repositories`) for maximum modularity and maintainability.
* 💉 **Automated Dependency Injection**: Powered by `tsyringe` and configured to work seamlessly with fast bundlers/runners like `tsx`.
* 🛡️ **Centralized API Responses**: Centralized response utility (`sendSuccess` and `sendError`) coupled with environmental safety (hides stack traces in production) and Winston logging.
* 📦 **Robust Tech Stack**:
  * **Database**: Prisma ORM with PostgreSQL.
  * **Caching & Key-Value**: Redis (`ioredis`).
  * **Realtime**: WebSockets (`socket.io` via an encapsulated singleton service).
  * **Validation**: Zod schema validation middleware.
  * **Security**: JWT-based session/request authorization (`jsonwebtoken`).
* 🏷️ **Modern Decorators**: Native ES Decorator and Legacy TS Decorator compatible `@AsyncController()` error-handler to automatically catch async route rejections.
* 🧩 **Extensible Base Controller**: Automatic method binding (never write `.bind(this)` or arrow wrappers in routes) and semantic helpers (`this.send`, `this.ok`, `this.created`, `this.clientError`).
* 🧪 **Vitest Ready**: Pre-configured Vitest environment optimized for lightning-fast testing with module mocking capabilities.

---

## 📂 Project Structure

```
src/
├── config/             # Environment variables and system configs
├── constants/          # Application-wide constants and HTTP states
├── controllers/        # Express entry points (handles req/res and validation)
│   ├── base-controller.ts  # Class auto-binder and HTTP helper shortcuts
│   └── auth-controller.ts  # Auth route handler
├── lib/                # Database, Redis, and logger initializations
│   ├── container.ts    # Central tsyringe DI container setup
│   ├── decorators.ts   # Error-handling decorators (@AsyncController)
│   └── prisma.ts       # Prisma Client wrapper
├── middlewares/        # Express request middleware filters (Auth, RBAC, Validation)
├── repositories/       # Data-access abstraction layer (Database queries)
├── routes/             # Express routes (Composition root / DI wiring)
├── schemas/            # Zod validation schemas
├── services/           # Business logic layer (The brains of the application)
├── utils/              # Centralized response and helper formatters
├── app.ts              # Express application assembly
└── server.ts           # Server runner and HTTP entrypoint
```

---

## 🛠️ Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) and your database/Redis servers ready.

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and specify the following details:
```env
PORT=3000
STAGE=dev
APP_NAME="Express Superpower"
BACKEND_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-ultra-secure-jwt-secret"
```

### 4. Running Locally
Start the development server with live watch mode (powered by `tsx`):
```bash
npm run dev
```

### 5. Production Build
Compile to highly-optimized production-ready bundles:
```bash
npm run build
npm start
```

---

## 🧪 Testing with Vitest

Tests are powered by **Vitest** for lightning-fast execution and native TypeScript support.

To run tests:
```bash
npm run test
```

### Mocking Services and Database Calls
Since the architecture decouples your business logic into the `Services` layer, you can easily mock database modules like Prisma globally without writing heavy integration pipelines:

```typescript
import { vi, describe, it, expect } from "vitest";
import { SignupWithEmailService } from "./signup-with-email";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("SignupWithEmailService", () => {
  it("should block duplicate signups", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "1", email: "test@example.com" } as any);

    const service = new SignupWithEmailService();
    const result = await service.execute({ email: "test@example.com", password: "Password123" });

    expect(result.code).toBe(400);
    expect(result.message).toBe("Email already taken");
  });
});
```

---

## 🏛️ Dependency Injection Guide

To add a new feature cleanly into the codebase using `tsyringe`:

### 1. Mark your Service as Injectable
```typescript
import { injectable } from "tsyringe";

@injectable()
export class OrderService {
  async processOrder(orderId: string) {
    return { success: true };
  }
}
```

### 2. Inject it into your Controller
Use the `@inject()` decorator to map parameters correctly so that fast builders like `tsx` (which strips design metadata at runtime) can resolve types reliably:
```typescript
import { injectable, inject } from "tsyringe";
import { BaseController } from "./base-controller";
import { OrderService } from "@/services/order-service";

@injectable()
export class OrderController extends BaseController {
  constructor(
    @inject(OrderService) private readonly orderService: OrderService
  ) {
    super();
  }

  @AsyncController()
  async purchase(req: Request, res: Response) {
    const result = await this.orderService.processOrder(req.body.id);
    return this.send(res, { code: 200, status: "success", message: "Ordered!", data: result });
  }
}
```

### 3. Resolve the Controller in your Routes
```typescript
import { Router } from "express";
import { container } from "@/lib/container";
import { OrderController } from "@/controllers/order-controller";

const router = Router();
const orderController = container.resolve(OrderController);

router.post("/order", orderController.purchase);

export default router;
```

---

## 📄 License
This project is licensed under the MIT License.