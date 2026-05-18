import "reflect-metadata";
import http from "http";
import app from "@/app";
import { envConfig } from "@/config/env";
import { SocketService } from "@/services/socket/socket-service";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import chalk from "chalk";
import { initMailWorker } from "@/workers/mail-worker";

const startServer = () => {
  try {
    // 1. Create standard HTTP server around Express App
    const server = http.createServer(app);

    // 2. Initialize and attach Socket Service singleton
    SocketService.getInstance().init(server);

    // 3. Connect to Database (Non-blocking startup check for serverful resilience)
    prisma.$connect().then(() => {
      logger.info("Database connected successfully.");
    }).catch((error) => {
      logger.error("CRITICAL: Database connection failed on startup:", error);
    });

    // Connect to Redis (Non-blocking startup check for serverful resilience)
    redis.ping().then(() => {
      logger.info("Redis connected successfully.");
      // Start background workers
      initMailWorker();
    }).catch((error) => {
      logger.error("CRITICAL: Redis connection failed on startup:", error);
    });

    // 4. Listen on port using HTTP Server
    server.listen(envConfig.PORT, () => {
      const mode = envConfig.STAGE === "prod" ? "Production" : "Development";

      console.log("");
      console.log(`  ${chalk.bold.cyan("▲")} ${chalk.bold(envConfig.APP_NAME)}`);
      console.log(`  ${chalk.gray("- URL:")}            ${chalk.cyan(envConfig.BACKEND_URL)}`);
      console.log(`  ${chalk.gray("- API Docs:")}       ${chalk.cyan(`${envConfig.BACKEND_URL}/api/docs`)}`);
      console.log(`  ${chalk.gray("- Environment:")}    ${mode}`);
      console.log(`  ${chalk.gray("- Port:")}           ${envConfig.PORT}`);
      console.log("");
      console.log(`  ${chalk.green("✓")} Ready in ${chalk.bold(mode)} mode.`);
      console.log("");
    });

    // 5. Production-Ready Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new HTTP connections
      server.close(() => {
        logger.info("HTTP server connection pool closed.");
      });

      try {
        // Disconnect from PostgreSQL database safely
        await prisma.$disconnect();
        logger.info("Prisma Database client disconnected.");

        // Disconnect standard Redis client safely
        await redis.quit();
        logger.info("Redis cache client disconnected.");

        // Dynamically resolve and close all BullMQ connections safely
        const { container } = await import("@/lib/container");
        const { QueueService } = await import("@/services/redis/queue-service");
        const queueService = container.resolve(QueueService);
        await queueService.closeAll();
        logger.info("All BullMQ connections closed.");

        logger.info("Graceful shutdown sequence completed. Exiting process safely.");
        process.exit(0);
      } catch (error) {
        logger.error("Error occurred during graceful shutdown sequence:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

  } catch (error) {
    console.error(chalk.red("CRITICAL: Could not start the engine:"), error);
    process.exit(1);
  }
};

startServer();