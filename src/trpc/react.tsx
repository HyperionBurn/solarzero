import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

export const api = createTRPCReact<AppRouter>();

/**
 * Get the base URL for tRPC requests.
 * In the browser, use an empty string (relative URL).
 * On the server, use the localhost URL.
 */
export function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Create a tRPC client instance.
 */
export function createTRPCClient() {
  return api.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}
