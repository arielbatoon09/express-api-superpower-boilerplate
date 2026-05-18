import { injectable } from "tsyringe";
import { Queue, Job, JobsOptions } from "bullmq";
import { envConfig } from "@/config/env";
import { logger } from "@/lib/logger";

@injectable()
export class QueueService {
  private queues: Map<string, Queue> = new Map();

  constructor() {
    logger.info("QueueService: Instantiated successfully");
  }

  /**
   * Lazily retrieves or creates a BullMQ Queue.
   * Caches active queues to prevent redundant connection overhead.
   */
  public getQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);

    if (!queue) {
      logger.info(`QueueService: Initializing new queue [${queueName}]`);
      
      queue = new Queue(queueName, {
        connection: {
          url: envConfig.REDIS_URL,
          // Crucial: BullMQ requires maxRetriesPerRequest to be null
          maxRetriesPerRequest: null,
        },
      });

      queue.on("error", (error) => {
        logger.error(`QueueService: Queue [${queueName}] encountered error: ${error.message}`, { error });
      });

      this.queues.set(queueName, queue);
    }

    return queue;
  }

  /**
   * Adds a job to a specific queue cleanly with robust logging, type-safety, and retry options.
   */
  public async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions
  ): Promise<Job<T>> {
    try {
      const queue = this.getQueue(queueName);
      logger.info(`QueueService: Appending job [${jobName}] to queue [${queueName}]`);

      const job = await queue.add(jobName, data, {
        // Standard production-ready defaults (e.g. automatic retries, backoff)
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true, // Keep Redis memory clean
        removeOnFail: { count: 1000 }, // Clean fail history cap
        ...opts,
      });

      logger.info(`QueueService: Job [${jobName}] appended successfully. Assigned JobId: ${job.id}`);
      return job;
    } catch (error: any) {
      logger.error(`QueueService: Failed to append job [${jobName}] to queue [${queueName}]: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Gracefully shuts down all active queue connections during server teardown.
   */
  public async closeAll(): Promise<void> {
    logger.info("QueueService: Shutting down all active queue connections...");
    for (const [name, queue] of this.queues.entries()) {
      try {
        await queue.close();
        logger.info(`QueueService: Queue [${name}] closed successfully.`);
      } catch (error: any) {
        logger.error(`QueueService: Error closing queue [${name}]: ${error.message}`, { error });
      }
    }
    this.queues.clear();
  }
}