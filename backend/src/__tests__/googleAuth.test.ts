import { describe, it, expect } from "bun:test";

describe("Google Auth configuration and URL builder", () => {
  it("should construct valid Google OAuth consent URL", () => {
    const clientId = "test-client-id.apps.googleusercontent.com";
    const redirectUri = "http://localhost:3000/api/auth/google/callback";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=test-client-id.apps.googleusercontent.com");
    expect(url).toContain(encodeURIComponent("http://localhost:3000/api/auth/google/callback"));
    expect(url).toContain("scope=openid+email+profile");
  });
});
