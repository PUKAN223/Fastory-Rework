import { describe, expect, it } from "vitest";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

describe("slugify", () => {
  it("should convert simple name to slug", () => {
    expect(slugify("Fastory Shop")).toBe("fastory-shop");
  });

  it("should handle thai characters", () => {
    expect(slugify("ร้านค้า ทดสอบ")).toBe("");
  });

  it("should handle multiple spaces", () => {
    expect(slugify("My   Store  Name")).toBe("my-store-name");
  });

  it("should handle special characters", () => {
    expect(slugify("Store@#$%Name!")).toBe("store-name");
  });

  it("should trim leading/trailing dashes", () => {
    expect(slugify("  --My Store--  ")).toBe("my-store");
  });

  it("should handle empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("should handle already slugified string", () => {
    expect(slugify("my-store")).toBe("my-store");
  });

  it("should handle mixed case with numbers", () => {
    expect(slugify("Store123 ABC")).toBe("store123-abc");
  });

  it("should collapse consecutive non-alphanumeric chars", () => {
    expect(slugify("hello...world---test")).toBe("hello-world-test");
  });

  it("should trim whitespace before processing", () => {
    expect(slugify("  Fastory Shop  ")).toBe("fastory-shop");
  });
});
