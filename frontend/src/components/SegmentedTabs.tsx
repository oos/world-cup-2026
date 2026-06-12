import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const tablist = tablistRef.current;
    if (!tablist) return;

    const updateIndicator = () => {
      const activeButton = tablist.querySelector<HTMLButtonElement>(
        'button[aria-selected="true"]'
      );
      if (!activeButton) return;

      const tablistRect = tablist.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicator({
        left: buttonRect.left - tablistRect.left,
        width: buttonRect.width,
      });
    };

    updateIndicator();

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(tablist);
    window.addEventListener("resize", updateIndicator);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [value, tabs]);

  return (
    <div
      ref={tablistRef}
      className="segmented-tabs"
      role="tablist"
      aria-label={ariaLabel}
      style={
        {
          "--segmented-tab-count": tabs.length,
        } as CSSProperties
      }
    >
      <span
        className="segmented-tabs-indicator"
        aria-hidden="true"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={value === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
