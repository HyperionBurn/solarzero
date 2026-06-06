import { describe, expect, it } from "vitest";
import { parseRedisSocketUrl } from "@/lib/redis";

describe("parseRedisSocketUrl", () => {
  it("parses standard legacy rediss socket URL with user default and password/token", () => {
    const result = parseRedisSocketUrl("rediss://default:my-secret-token@host-slug.upstash.io:6379");
    expect(result.url).toBe("https://host-slug.upstash.io");
    expect(result.token).toBe("my-secret-token");
  });

  it("parses socket URL with empty user and token in password field", () => {
    const result = parseRedisSocketUrl("redis://:my-secret-token@host-slug.upstash.io:6379");
    expect(result.url).toBe("https://host-slug.upstash.io");
    expect(result.token).toBe("my-secret-token");
  });

  it("parses socket URL without prefix default but with username/token", () => {
    const result = parseRedisSocketUrl("redis://my-secret-token@host-slug.upstash.io:6379");
    expect(result.url).toBe("https://host-slug.upstash.io");
    expect(result.token).toBe("my-secret-token");
  });

  it("uses default token if not present in socket URL password or username", () => {
    const result = parseRedisSocketUrl("rediss://host-slug.upstash.io:6379", "env-token");
    expect(result.url).toBe("https://host-slug.upstash.io");
    expect(result.token).toBe("env-token");
  });

  it("returns nulls for invalid URLs gracefully", () => {
    const result = parseRedisSocketUrl("not-a-valid-url");
    expect(result.url).toBeNull();
    expect(result.token).toBeNull();
  });
});
