# ⚡ Express API Superpower Boilerplate

A production-grade, enterprise-ready Express boilerplate engineered with **TypeScript**, **Clean Architecture**, and automated **Dependency Injection**. This repository is designed to serve as a rock-solid foundation for high-performance microservices, providing out-of-the-box support for background processing, caching, real-time events, and zero-downtime resilience.

---

## 🚀 Getting Started (Local Development)

Follow these steps to set up and run the application locally on your machine.

### Prerequisites
* **Node.js**: `v22.x` (Recommended to use [nvm](https://github.com/nvm-sh/nvm))
* **Docker & Docker Compose**:
  * **Windows / macOS**: Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
    * *Windows users*: It is highly recommended to use the **WSL 2 (Windows Subsystem for Linux) backend** for optimal performance. If you don't have WSL installed yet, open PowerShell as Administrator and run:
      ```powershell
      wsl --install
      ```
  * **Linux**: Follow the official guide to install [Docker Engine](https://docs.docker.com/engine/install/) and the [Docker Compose plugin](https://docs.docker.com/compose/install/linux/).

### 1. Clone & Install Dependencies
Clone the repository and install the NPM packages:
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file to create your local `.env`:
```bash
cp .env.example .env
```
*(Specify any needed API keys and ports inside the newly created `.env` file).*

### 3. Spin up Databases & Cache (Docker)
We use Docker to run the database (PostgreSQL) and the key-value cache (Redis) locally. Start these services with:
```bash
docker compose up -d pg redis
```
This will start:
* **PostgreSQL** on port `5433` (mapped from 5432 to prevent local conflicts)
* **Redis** on port `6379`

### 4. Database Setup & Migrations
Generate the Prisma Client and run the migrations to create the database schemas:
```bash
npm run db:generate
npm run db:migrate
```

### 5. Start the Application
Run the backend server locally with hot-reloading (Strategy A):
```bash
npm run dev
```
The server will start on [http://localhost:8000](http://localhost:8000).

### 6. Verify and Explore
* **API Interactive Docs**: Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to view the OpenAPI Swagger interactive dashboard.
* **Stop Docker Services**: When you are done developing, you can stop the background containers using:
  ```bash
  docker compose down
  ```

---

## 🏛️ Architectural Principles

This boilerplate enforces strict software engineering standards to guarantee developer velocity, code clarity, and testability as the project scales.

### Clean Architecture Layers

Code is structured inside four distinct, unidirectional layers:

- **Routes (Composition Root)**: The entry point where URLs are mapped to controller methods, and where Zod request validations are applied as middleware.
- **Controllers (Presentation Layer)**: Thin classes responsible _only_ for resolving request query/param/body parameters, invoking the correct service orchestrator, and returning standardized API responses.
- **Services (Business Logic Layer)**: The core "brains" of the application. Business workflows are designed as class-based orchestrators. The public interface accepts inputs, while logical steps are encapsulated in private helper methods. Services throw typed exception classes instead of returning error maps.
- **Repositories (Data Access Layer)**: A layer wrapping database models (Prisma) to decouple business services from database-specific query structures.

### Standardized Exception Hierarchy

Error execution flows rely on a structured, class-based exception tree located under `src/exceptions`. By inheriting from a central `HttpException` class, exceptions capture concrete call stacks and carry structured payload validation metadata. The global error handler automatically catches thrown exceptions, logging debug stacks in non-production environments and responding with standardized API formats.


### SOLID Principles Enforced

- **Single Responsibility**: Classes have one job. Services handle business flows; repositories handle SQL queries; controllers handle HTTP request routing.
- **Open/Closed**: Features are easily extended. For instance, you can swap email delivery mechanisms by implementing a different email service, without altering the registration service.
- **Dependency Inversion**: High-level modules depend on constructor-injected abstractions rather than hardcoded global singletons.

---

## 📦 Core Technology Stack

Every technology in this stack has been selected for maximum type-safety, execution speed, and horizontal scalability:

### Database & Caching

- **PostgreSQL**: The primary relational database for ACID-compliant structured storage.
- **Prisma ORM**: A modern, type-safe database client providing auto-generated schemas, seamless migration tooling, and native TypeScript types.
- **Redis (`ioredis`)**: In-memory data store utilized for lightning-fast key-value caching, session management, and task queuing operations.

### Asynchronous Tasks & Background Workers

- **BullMQ**: A highly robust, Redis-backed queue system. Heavy operations (such as sending transactional emails, PDF generation, or third-party webhooks) are enqueued as background jobs rather than executed inside HTTP request loops, allowing endpoints to respond instantly.
- **Background Workers**: Dedicated background consumers that listen to Redis queues, handle retries, and execute jobs independently of the Express server thread.

### Dependency Injection (DI)

- **Tsyringe**: A lightweight, automated Dependency Injection container by Microsoft. It manages class instances dynamically, allowing you to inject repositories, services, and utilities through constructors. It is explicitly configured with custom decorators to maintain metadata resolution when run under fast, non-decorator native runtimes.

### Real-Time & Security

- **Socket.io**: Real-time bidirectional event engine encapsulated inside a singleton lifecycle service, allowing immediate socket communication across any architectural layer.
- **Argon2**: The industry-standard, secure password-hashing algorithm. Highly resistant to brute-force and GPU-based side-channel cracking.
- **JSON Web Tokens (`jsonwebtoken`)**: Signed token arrays utilized for stateless, high-speed user authorization and session management.
- **Zod**: Declarative, schema-driven validation middleware. Validates incoming query parameters, route segments, and payloads, ensuring only 100% compliant data reaches your controllers.
- **Double Submit Cookie CSRF (`csrf-csrf`)**: Advanced, cryptographically secure CSRF protection tied to user-session identifiers with automated validation rules.
- **Helmet**: Hardens standard HTTP response headers to protect against web vulnerabilities like XSS, clickjacking, and MIME-sniffing.
- **HPP**: HTTP Parameter Pollution middleware that protects the server from query-string injection and pollution attacks.

### Interactive API Documentation

- **OpenAPI 3.0 & Swagger UI**: Built-in, zero-duplication interactive API dashboard available at `/docs`.
- **Zod-to-OpenAPI**: This boilerplate utilizes a custom "Superpower" router (`OpenApiRouter`) that combines Zod validation, Swagger generation, and Express routing into a single method call. Your Zod schemas act as the single source of truth for both payload validation and documentation generation, guaranteeing that your API specs are 100% strictly typed and always accurate.

### Diagnostics & Monitoring

- **Winston Logger**: Centralized, multi-channel production logger. Configured with automated daily file rotations, clean console colors, and secure filters to capture execution traces and trace system failures without exposing sensitive data.

---

## 🛡️ Production Resilience & High Availability

This boilerplate is hardened out-of-the-box to run inside clustered, containerized production environments like Docker or Kubernetes:

### 1. Zero-Downtime Graceful Shutdowns

When a cloud cluster scales down or redeploys, it broadcasts termination signals (`SIGTERM`/`SIGINT`).
This boilerplate intercepts these signals and runs a graceful shutdown sequence:

- Closes the HTTP server pool to stop accepting new requests, allowing active connections to complete.
- Disconnects the Prisma database client safely to prevent orphaned transactions.
- Quits standard Redis cache connections cleanly.
- Gracefully closes all BullMQ workers and queue pipelines, ensuring active background jobs are completed or safely re-queued rather than corrupted.

### 2. Redis OOM (Out-of-Memory) Protection

Unmanaged queues can crash Redis by filling RAM with old job history. Our queue system is pre-configured with memory retention limits:

- **Auto-Cleanup**: Successful jobs are immediately removed from Redis.
- **Cap Limits**: Failed jobs are capped to prevent infinite history bloat.

### 3. Exponential Backoff & Retries

To handle transient network drops, background jobs are automatically configured to retry up to 3 times with exponential delay gaps, preventing system overload.

### 4. Express 5 Compatibility

Engineered on Express v5, utilizing safe `Object.assign` mapping strategies to validation schemas, bypassing the read-only Express 5 query/param getters, and eliminating manual router `try/catch` wrappers.

---

## 🔒 Production-Grade Security Hardening

This boilerplate implements a zero-trust, production-grade security architecture designed to fully eliminate XSS and CSRF injection vectors:

### 1. Hybrid In-Memory & Secure-Cookie Token Storage

To achieve ironclad immunity against both Session Theft (XSS) and Session Hijacking (CSRF), authorization uses a **Hybrid Storage Model**:

- **Access Tokens**: Transmitted strictly in JSON response bodies. The frontend stores them in volatile memory (never written to `localStorage` or `sessionStorage`), making them completely immune to malicious XSS script extraction.
- **Refresh Tokens**: Set as `HttpOnly`, `Secure`, `SameSite=Strict` cookies. These cookies are cryptographically protected and completely inaccessible to client-side JavaScript, ensuring XSS scripts cannot read or leak them.

### 2. Cryptographically Bound Double-Submit CSRF Protection

Equipped with `csrf-csrf` middleware enforcing the industry-standard Double Submit Cookie pattern:

- **Session-Stabilized Signature**: The signature is cryptographically bound to the user's stable **User ID** (decoded on the fly from the token). This ensures the CSRF token remains completely valid throughout the user's logged-in session, surviving token rotations while maintaining high-grade, identity-bound safety.
- **OpenAPI Documented**: A system route (`GET /api/csrf-token`) provides the CSRF token. It is fully registered under Zod schema declarations and interactive Swagger schemas.
- **Global Error Handling**: Any state-mutating request (`POST`, `PUT`, `DELETE`, `PATCH`) with missing/invalid headers is intercepted globally and returned as a secure, custom `403 Forbidden` JSON response without leaking trace frames.

### 3. Helmet & HTTP Parameter Pollution (HPP) Guards

- **Helmet Headers**: Automatically configures 15+ secure HTTP headers (including Content-Security-Policy fallbacks, Strict-Transport-Security, X-Frame-Options, and X-Content-Type-Options) to protect clients from modern web exploits.
- **HPP Protection**: Intercepts and mitigates parameter pollution attacks by sanitizing duplicate key-value pairs inside request queries and bodies.

### 4. Sliding-Window Rate Limiting

- **Atomic sliding window**: Uses Redis sorted sets (ZSET) inside multi-pipeline transactions to prevent boundary bursts.
- **Auth-Aware Resolution**: Automatically locks limits down on specific users by validating authentication bearer tokens or active route sessions (`req.user.sub`), falling back to client IP (`req.ip`) for anonymous traffic.
- **Fail-Open Resilience**: If Redis suffers connection loss, the middleware logs warnings but allows API requests to proceed (fail-open) rather than triggering system crashes.
- **Reverse Proxy Trust**: Explicitly configured to support reverse proxy IP headers (`trust proxy` activated).
- **Custom headers**: Sets standard rate limit response details (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and standard `Retry-After` on `429 Too Many Requests` states.


---

## 📂 Project Directory Structure

- `src/config/`: System configuration schemas and environment variable validations.
- `src/controllers/`: Express request handlers, extending `BaseController` for dynamic context auto-binding.
- `src/exceptions/`: Centralized HTTP exception classes for robust, standardized error states.
- `src/lib/`: Database connectors, logging routines, and the central DI container registry.
- `src/middlewares/`: Express filter middlewares (Authentication, RBAC, Validation, Rate Limiting).
- `src/repositories/`: Database query abstraction files.
- `src/routes/`: Route mappings and URL composition roots.
- `src/schemas/`: Declarative Zod validation rules.
- `src/services/`: Isolated business logic services, structured as facade orchestrators.
- `src/workers/`: Background queue consumer daemons.
- `src/utils/`: Standardized JSON API responders and template compilers.

---

## 🧪 Testing Architecture

- **Vitest Ready**: Lightning-fast, ESM-native testing environment.
- **Mock-Friendly**: Thanks to constructor Dependency Injection, you can unit-test any service, repository, or controller by simply passing stubbed mock parameters into the constructor, requiring zero complex mocking libraries or database connectivity.

---

## 📄 License

This project is licensed under the MIT License.
