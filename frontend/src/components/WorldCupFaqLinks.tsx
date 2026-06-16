import { DashboardSection } from "./DashboardSection";
import { GuideLink } from "./GuideLink";
import { WORLD_CUP_FAQ_LINKS } from "../config/worldCupFaqs";

export function WorldCupFaqLinks({
  title,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const links = (
    <div className="guide-link-list">
      {WORLD_CUP_FAQ_LINKS.map((item) => (
        <GuideLink key={item.to} {...item} />
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <DashboardSection
        id="wc26-faqs"
        title={title}
        subtitle={`${WORLD_CUP_FAQ_LINKS.length} guides`}
        defaultOpen={defaultOpen}
      >
        {links}
      </DashboardSection>
    );
  }

  return (
    <section className="guide-section">
      <h2 className="section-title">{title}</h2>
      {links}
    </section>
  );
}
