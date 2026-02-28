export function createVarejonlineClient(accessToken: string) {
  return {
    async get<T>(url: string) {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
