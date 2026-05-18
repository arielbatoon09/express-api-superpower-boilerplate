import { container } from "tsyringe";
import { prisma } from "@/lib/prisma";

// Register external dependencies and singletons
container.register("PrismaClient", { useValue: prisma });

export { container };