import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, compareMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  compareMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock,
  },
}));

import { authorizeCredentials, getCredentialAccountStatus } from "@/lib/auth-credentials";

describe("authorizeCredentials", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    compareMock.mockReset();
  });

  it("rejects users who have not verified their email", async () => {
    findFirstMock.mockResolvedValue({
      id: "user-1",
      email: "verified@example.com",
      name: "Verified User",
      passwordHash: "hash",
      emailVerified: null,
    });

    const result = await authorizeCredentials("Verified@Example.com", "secret-password");

    expect(result).toBeNull();
    expect(compareMock).not.toHaveBeenCalled();
  });

  it("normalizes email, validates the password, and returns the user", async () => {
    findFirstMock.mockResolvedValue({
      id: "user-2",
      email: "verified@example.com",
      name: "Verified User",
      passwordHash: "hash",
      emailVerified: new Date(),
    });
    compareMock.mockResolvedValue(true);

    const result = await authorizeCredentials("  Verified@Example.com  ", "secret-password");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        email: {
          equals: "verified@example.com",
          mode: "insensitive",
        },
      },
    });
    expect(compareMock).toHaveBeenCalledWith("secret-password", "hash");
    expect(result).toEqual({
      id: "user-2",
      email: "verified@example.com",
      name: "Verified User",
    });
  });

  it("reports an unverified account without checking the password", async () => {
    findFirstMock.mockResolvedValue({
      emailVerified: null,
    });

    const result = await getCredentialAccountStatus("  Pending@Example.com ");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        email: {
          equals: "pending@example.com",
          mode: "insensitive",
        },
      },
      select: {
        emailVerified: true,
      },
    });
    expect(compareMock).not.toHaveBeenCalled();
    expect(result).toBe("unverified");
  });

  it("reports verified and missing account status for login copy", async () => {
    findFirstMock.mockResolvedValueOnce({
      emailVerified: new Date(),
    });
    await expect(getCredentialAccountStatus("verified@example.com")).resolves.toBe("verified");

    findFirstMock.mockResolvedValueOnce(null);
    await expect(getCredentialAccountStatus("missing@example.com")).resolves.toBe("missing");
  });

  it("rejects incorrect passwords", async () => {
    findFirstMock.mockResolvedValue({
      id: "user-3",
      email: "verified@example.com",
      name: "Verified User",
      passwordHash: "hash",
      emailVerified: new Date(),
    });
    compareMock.mockResolvedValue(false);

    const result = await authorizeCredentials("verified@example.com", "wrong-password");

    expect(result).toBeNull();
  });
});
