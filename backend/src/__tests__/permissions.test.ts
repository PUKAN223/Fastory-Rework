import { describe, it, expect } from "bun:test";
import { hasPermission, getAccessToken } from "../api/auth/permissions";

describe("getAccessToken", () => {
  it("should extract token from valid Bearer header", () => {
    const token = getAccessToken("Bearer abc123");
    expect(token).toBe("abc123");
  });

  it("should return null for missing header", () => {
    expect(getAccessToken(undefined)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(getAccessToken("")).toBeNull();
  });

  it("should return null for non-Bearer scheme", () => {
    expect(getAccessToken("Basic abc123")).toBeNull();
  });

  it("should return null for Bearer without token", () => {
    expect(getAccessToken("Bearer ")).toBeNull();
  });

  it("should handle case-insensitive Bearer", () => {
    const token = getAccessToken("bearer abc123");
    expect(token).toBe("abc123");
  });
});

describe("hasPermission", () => {
  it("should return true for wildcard permission", () => {
    expect(hasPermission({ "*": true }, "products:read")).toBe(true);
  });

  it("should return true for 'all' permission", () => {
    expect(hasPermission({ all: true }, "products:read")).toBe(true);
  });

  it("should return true for exact match", () => {
    expect(hasPermission({ "products:read": true }, "products:read")).toBe(true);
  });

  it("should return true for dot notation match", () => {
    expect(hasPermission({ "products.read": true }, "products:read")).toBe(true);
  });

  it("should return true for singular module match", () => {
    expect(hasPermission({ "product:read": true }, "products:read")).toBe(true);
  });

  it("should return true for plural module match", () => {
    expect(hasPermission({ "products:read": true }, "product:read")).toBe(true);
  });

  it("should return true for wildcard action", () => {
    expect(hasPermission({ "products:*": true }, "products:read")).toBe(true);
  });

  it("should return true for nested permission object", () => {
    expect(
      hasPermission({ products: { read: true } }, "products:read"),
    ).toBe(true);
  });

  it("should return true for nested wildcard", () => {
    expect(
      hasPermission({ products: { "*": true } }, "products:read"),
    ).toBe(true);
  });

  it("should return false for missing permission", () => {
    expect(hasPermission({ "users:read": true }, "products:read")).toBe(false);
  });

  it("should return false for false value", () => {
    expect(hasPermission({ "products:read": false }, "products:read")).toBe(
      false,
    );
  });

  it("should return false for empty permissions", () => {
    expect(hasPermission({}, "products:read")).toBe(false);
  });

  it("should handle read_write nested permission", () => {
    expect(
      hasPermission({ products: { read_write: true } }, "products:read"),
    ).toBe(true);
  });
});
