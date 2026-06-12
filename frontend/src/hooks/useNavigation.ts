import { useLocation, useSearchParams } from "react-router-dom";
import {
  currentReturnPath,
  resolveReturnPath,
  withReturnTo,
} from "../utils/navigation";

export function useBackPath(fallback: string): string {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fromQuery = searchParams.get("returnTo");
  const fromState = (location.state as { returnTo?: string } | null)?.returnTo;
  return resolveReturnPath(fromQuery ?? fromState, fallback);
}

export function useReturnToLink(path: string): string {
  const location = useLocation();
  return withReturnTo(path, currentReturnPath(location));
}
