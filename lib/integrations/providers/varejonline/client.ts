export function createVarejonlineClient(accessToken: string) {
  const baseUrl =
    process.env.VAREJONLINE_API_BASE_URL?.trim() ||
    "https://integrador.varejonline.com.br/apps/api";

  return {
    async get<T>(
      path: string,
      query?: Record<string, string | number | boolean | null | undefined>,
    ) {
      const url = new URL(
        path.startsWith("/") ? path.slice(1) : path,
        `${baseUrl.replace(/\/$/, "")}/`,
      );
      url.searchParams.set("token", accessToken);

      Object.entries(query ?? {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "Varejonline request failed",
        );
      }

      return payload as T;
    },
  };
}
