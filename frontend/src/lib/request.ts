async function requestWithRefresh(path: string, init: RequestInit = {}) {
  const run = () =>
    fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

  let r = await run();
  if (r.status !== 401) return r;

  await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" }).catch(
    () => null,
  );
  r = await run();

  if (r.status === 401) {
    const body = (await r
      .clone()
      .json()
      .catch(() => ({}))) as { message?: string; error?: string };
    const msg = `${body.message ?? body.error ?? ""}`.toLowerCase();

    if (
      msg.includes("invalid or expired access token") ||
      msg.includes("missing access token")
    ) {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      }).catch(() => null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }

  return r;
}

export { requestWithRefresh };
