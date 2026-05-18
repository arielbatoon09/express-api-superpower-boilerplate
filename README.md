# ⚡ Express API Superpower Boilerplate

A production-grade, enterprise-ready Express boilerplate engineered with **TypeScript**, **Clean Architecture**, and automated **Dependency Injection**. This repository is designed to serve as a rock-solid foundation for high-performance microservices, providing out-of-the-box support for background processing, caching, real-time events, and zero-downtime resilience.

---

## 🏛️ Architectural Principles

This boilerplate enforces strict software engineering standards to guarantee developer velocity, code clarity, and testability as the project scales.

### Clean Architecture Layers
Code is structured inside four distinct, unidirectional layers:
* **Routes (Composition Root)**: The entry point where URLs are mapped to controller methods, and where Zod request validations are applied as middleware.
* **Controllers (Presentation Layer)**: Thin classes responsible *only* for resolving request query/param/body parameters, invoking the correct service orchestrator, and returning standardized API responses.
* **Services (Business Logic Layer)**: The core "brains" of the application. Business workflows are designed as class-based orchestrators. The public interface accepts inputs, while individual logical steps are encapsulated in private helper methods.
* **Repositories (Data Access Layer)**: A layer wrapping database models (Prisma) to decouple business services from database-specific query structures.

### SOLID Principles Enforced
* **Single Responsibility**: Classes have one job. Services handle business flows; repositories handle SQL queries; controllers handle HTTP request routing.
* **Open/Closed**: Features are easily extended. For instance, you can swap email delivery mechanisms by implementing a different email service, without altering the registration service.
* **Dependency Inversion**: High-level modules depend on constructor-injected abstractions rather than hardcoded global singletons.

---

## 📦 Core Technology Stack

Every technology in this stack has been selected for maximum type-safety, execution speed, and horizontal scalability:

### Database & Caching
* **PostgreSQL**: The primary relational database for ACID-compliant structured storage.
* **Prisma ORM**: A modern, type-safe database client providing auto-generated schemas, seamless migration tooling, and native TypeScript types.
* **Redis (`ioredis`)**: In-memory data store utilized for lightning-fast key-value caching, session management, and task queuing operations.

### Asynchronous Tasks & Background Workers
* **BullMQ**: A highly robust, Redis-backed queue system. Heavy operations (such as sending transactional emails, PDF generation, or third-party webhooks) are enqueued as background jobs rather than executed inside HTTP request loops, allowing endpoints to respond instantly.
* **Background Workers**: Dedicated background consumers that listen to Redis queues, handle retries, and execute jobs independently of the Express server thread.

### Dependency Injection (DI)
* **Tsyringe**: A lightweight, automated Dependency Injection container by Microsoft. It manages class instances dynamically, allowing you to inject repositories, services, and utilities through constructors. It is explicitly configured with custom decorators to maintain metadata resolution when run under fast, non-decorator native runtimes.

### Real-Time & Security
* **Socket.io**: Real-time bidirectional event engine encapsulated inside a singleton lifecycle service, allowing immediate socket communication across any architectural layer.
* **Argon2**: The industry-standard, secure password-hashing algorithm. Highly resistant to brute-force and GPU-based side-channel cracking.
* **JSON Web Tokens (`jsonwebtoken`)**: Signed token arrays utilized for stateless, high-speed user authorization and session management.
* **Zod**: Declarative, schema-driven validation middleware. Validates incoming query parameters, route segments, and payloads, ensuring only 100% compliant data reaches your controllers.

### Interactive API Documentation
* **OpenAPI 3.0 & Swagger UI**: Built-in, zero-duplication interactive API dashboard available at `/docs`.
* **Zod-to-OpenAPI**: This boilerplate utilizes a custom "Superpower" router (`OpenApiRouter`) that combines Zod validation, Swagger generation, and Express routing into a single method call. Your Zod schemas act as the single source of truth for both payload validation and documentation generation, guaranteeing that your API specs are 100% strictly typed and always accurate.

### Diagnostics & Monitoring
* **Winston Logger**: Centralized, multi-channel production logger. Configured with automated daily file rotations, clean console colors, and secure filters to capture execution traces and trace system failures without exposing sensitive data.

---

## 🛡️ Production Resilience & High Availability

This boilerplate is hardened out-of-the-box to run inside clustered, containerized production environments like Docker or Kubernetes:

### 1. Zero-Downtime Graceful Shutdowns
When a cloud cluster scales down or redeploys, it broadcasts termination signals (`SIGTERM`/`SIGINT`).
This boilerplate intercepts these signals and runs a graceful shutdown sequence:
* Closes the HTTP server pool to stop accepting new requests, allowing active connections to complete.
* Disconnects the Prisma database client safely to prevent orphaned transactions.
* Quits standard Redis cache connections cleanly.
* Gracefully closes all BullMQ workers and queue pipelines, ensuring active background jobs are completed or safely re-queued rather than corrupted.

### 2. Redis OOM (Out-of-Memory) Protection
Unmanaged queues can crash Redis by filling RAM with old job history. Our queue system is pre-configured with memory retention limits:
* **Auto-Cleanup**: Successful jobs are immediately removed from Redis.
* **Cap Limits**: Failed jobs are capped to prevent infinite history bloat.

### 3. Exponential Backoff & Retries
To handle transient network drops, background jobs are automatically configured to retry up to 3 times with exponential delay gaps, preventing system overload.

### 4. Express 5 Compatibility
Engineered on Express v5, utilizing safe `Object.assign` mapping strategies to validation schemas, bypassing the read-only Express 5 query/param getters, and eliminating manual router `try/catch` wrappers.

---

## 📂 Project Directory Structure

* `src/config/`: System configuration schemas and environment variable validations.
* `src/controllers/`: Express request handlers, extending `BaseController` for dynamic context auto-binding.
* `src/lib/`: Database connectors, logging routines, and the central DI container registry.
* `src/middlewares/`: Express filter middlewares (Authentication, RBAC, Validation).
* `src/repositories/`: Database query abstraction files.
* `src/routes/`: Route mappings and URL composition roots.
* `src/schemas/`: Declarative Zod validation rules.
* `src/services/`: Isolated business logic services, structured as facade orchestrators.
* `src/workers/`: Background queue consumer daemons.
* `src/utils/`: Standardized JSON API responders and template compilers.

---

## 🧪 Testing Architecture

* **Vitest Ready**: Lightning-fast, ESM-native testing environment.
* **Mock-Friendly**: Thanks to constructor Dependency Injection, you can unit-test any service, repository, or controller by simply passing stubbed mock parameters into the constructor, requiring zero complex mocking libraries or database connectivity.

---

## 📄 License
This project is licensed under the MIT License.