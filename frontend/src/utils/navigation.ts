import type { Location, SetURLSearchParams } from "react-router-dom";

export function resolveReturnPath(
  returnTo: string | null | undefined,
  fallback: string
): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }
  return returnTo;
}

export function currentReturnPath(
  location: Pick<Location, "pathname" | "search" | "hash">
): string {
  const params = new URLSearchParams(location.search);
  params.delete("returnTo");
  const search = params.toString();
  return `${location.pathname}${search ? `?${search}` : ""}${location.hash}`;
}

export function withReturnTo(path: string, returnPath: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnPath)}`;
}

export function updateSearchParams(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  updates: Record<string, string | undefined>
) {
  const next = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  setSearchParams(next);
}
