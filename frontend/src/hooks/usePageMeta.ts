import { useEffect } from "react";

const DEFAULT_TITLE = "World Cup 2026 Stats";
const DEFAULT_DESCRIPTION =
  "FIFA World Cup 2026 squads, players, schedule, and match stats";

function setMetaDescription(content: string): void {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = title;
    setMetaDescription(description);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaDescription(DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
