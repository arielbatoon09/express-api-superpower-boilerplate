import { Router, RequestHandler } from "express";
import { registry } from "@/lib/openapi";
import { z } from "zod";
import { SchemaMiddleware } from "@/middlewares";
import { 
  StandardErrorResponseSchema, 
  ConflictErrorResponseSchema, 
  ServerErrorResponseSchema 
} from "@/schemas/common";

export interface OpenApiRouteConfig {
  path: string;
  summary: string;
  description?: string;
  tags?: string[];
  request?: z.ZodTypeAny; // Zod schema containing .body, .query, or .params
  response?: z.ZodTypeAny;
  errors?: number[]; // Example: [400, 401, 403, 404, 409, 500]
  handler: RequestHandler | RequestHandler[];
  middlewares?: RequestHandler[];
}

/**
 * OpenApiRouter
 * 
 * A "Superpower" wrapper around the standard Express Router that automatically
 * handles Zod schema validation and OpenAPI Swagger generation in a single call.
 */
export class OpenApiRouter {
  public router: Router;

  constructor(private prefix: string = "") {
    this.router = Router();
  }

  private registerRoute(method: "get" | "post" | "put" | "patch" | "delete", config: OpenApiRouteConfig) {
    const { path, summary, description, tags, request, response, errors, handler, middlewares = [] } = config;

    // 1. Build OpenAPI Responses dynamically
    const responses: any = {
      200: {
        description: "Successful response",
        content: response ? { "application/json": { schema: response } } : undefined,
      },
    };

    if (errors) {
      if (errors.includes(400)) responses[400] = { description: "Validation failed", content: { "application/json": { schema: StandardErrorResponseSchema } } };
      if (errors.includes(409)) responses[409] = { description: "Resource already exists", content: { "application/json": { schema: ConflictErrorResponseSchema } } };
      if (errors.includes(500)) responses[500] = { description: "Internal server error", content: { "application/json": { schema: ServerErrorResponseSchema } } };
    }

    // Safely extract request shape
    const requestShape = request && "shape" in request ? (request as any).shape : undefined;
    const requestBody = requestShape?.body ? {
      content: { "application/json": { schema: requestShape.body as z.ZodTypeAny } }
    } : undefined;

    // Register into Swagger Engine
    registry.registerPath({
      method,
      path: `${this.prefix}${path}`,
      summary,
      description,
      tags: tags || [],
      request: requestBody ? { body: requestBody } : undefined,
      responses,
    });

    // 2. Build Express Route Handlers
    const routeHandlers = [
      ...middlewares,
      ...(request ? [SchemaMiddleware.validate(request)] : []),
      ...(Array.isArray(handler) ? handler : [handler]),
    ];

    // Mount to the internal Express Router
    this.router[method](path, ...routeHandlers);
  }

  public get(config: OpenApiRouteConfig) { this.registerRoute("get", config); }
  public post(config: OpenApiRouteConfig) { this.registerRoute("post", config); }
  public put(config: OpenApiRouteConfig) { this.registerRoute("put", config); }
  public patch(config: OpenApiRouteConfig) { this.registerRoute("patch", config); }
  public delete(config: OpenApiRouteConfig) { this.registerRoute("delete", config); }
}