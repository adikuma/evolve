export function safeParse<T>(raw: string): T {
  return JSON.parse(raw, (key, value) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
    return value;
  }) as T;
}
