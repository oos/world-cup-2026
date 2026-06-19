import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Check, ChevronUp, Plus, Sparkles } from "lucide-react";
import { AdBanner } from "../ads/AdBanner";
import { PageHeader } from "../components/PageHeader";
import {
  ROADMAP_CATEGORIES,
  ROADMAP_CATEGORY_ACCENTS,
  ROADMAP_ITEMS,
  ROADMAP_STATUS_META,
  ROADMAP_STATUS_ORDER,
  type RoadmapCategory,
  type RoadmapItem,
  type RoadmapStatus,
} from "../config/roadmap";

const VOTES_STORAGE_KEY = "wc26-roadmap-votes";
const REQUESTS_STORAGE_KEY = "wc26-roadmap-requests";

type SortMode = "votes" | "status";

interface StoredRequest {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage may be unavailable (private mode, quota) — fail quietly
  }
}

export function Roadmap() {
  const [votedIds, setVotedIds] = useState<string[]>(() =>
    readStorage<string[]>(VOTES_STORAGE_KEY, [])
  );
  const [requests, setRequests] = useState<StoredRequest[]>(() =>
    readStorage<StoredRequest[]>(REQUESTS_STORAGE_KEY, [])
  );
  const [activeCategory, setActiveCategory] = useState<RoadmapCategory | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("votes");
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<RoadmapCategory>("Experience");
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    writeStorage(VOTES_STORAGE_KEY, votedIds);
  }, [votedIds]);

  useEffect(() => {
    writeStorage(REQUESTS_STORAGE_KEY, requests);
  }, [requests]);

  const votedSet = useMemo(() => new Set(votedIds), [votedIds]);

  const allItems = useMemo<RoadmapItem[]>(() => {
    const userItems: RoadmapItem[] = requests.map((request) => ({
      ...request,
      status: "considering" as RoadmapStatus,
      votes: 1,
    }));
    return [...userItems, ...ROADMAP_ITEMS];
  }, [requests]);

  const voteCountFor = (item: RoadmapItem) =>
    item.votes + (votedSet.has(item.id) ? 1 : 0);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return allItems;
    return allItems.filter((item) => item.category === activeCategory);
  }, [allItems, activeCategory]);

  const sortedByVotes = useMemo(
    () => [...filteredItems].sort((a, b) => voteCountFor(b) - voteCountFor(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredItems, votedSet]
  );

  const groupedByStatus = useMemo(() => {
    return ROADMAP_STATUS_ORDER.map((status) => ({
      status,
      items: filteredItems
        .filter((item) => item.status === status)
        .sort((a, b) => voteCountFor(b) - voteCountFor(a)),
    })).filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, votedSet]);

  const totalVotes = useMemo(
    () => allItems.reduce((sum, item) => sum + voteCountFor(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, votedSet]
  );

  const toggleVote = (id: string) => {
    setVotedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = formTitle.trim();
    if (!title) return;
    const id = `req-${Date.now()}`;
    const request: StoredRequest = {
      id,
      title,
      description: formDescription.trim() || "Suggested by a fan.",
      category: formCategory,
    };
    setRequests((prev) => [request, ...prev]);
    setVotedIds((prev) => [...prev, id]);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("Experience");
    setFormOpen(false);
    setJustSubmitted(true);
    window.setTimeout(() => setJustSubmitted(false), 4000);
  };

  const renderCard = (item: RoadmapItem) => {
    const voted = votedSet.has(item.id);
    const statusMeta = ROADMAP_STATUS_META[item.status];
    return (
      <article
        key={item.id}
        className="roadmap-card"
        style={{ "--card-accent": ROADMAP_CATEGORY_ACCENTS[item.category] } as CSSProperties}
      >
        <button
          type="button"
          className={`roadmap-vote ${voted ? "voted" : ""}`}
          onClick={() => toggleVote(item.id)}
          aria-pressed={voted}
          aria-label={voted ? `Remove vote for ${item.title}` : `Vote for ${item.title}`}
        >
          <ChevronUp size={18} strokeWidth={2.5} aria-hidden="true" />
          <span className="roadmap-vote-count">{voteCountFor(item)}</span>
        </button>
        <div className="roadmap-card-body">
          <div className="roadmap-card-tags">
            <span className="roadmap-tag roadmap-tag--category">{item.category}</span>
            <span
              className="roadmap-tag roadmap-tag--status"
              style={{ "--status-accent": statusMeta.accent } as CSSProperties}
            >
              {statusMeta.label}
            </span>
          </div>
          <h3 className="roadmap-card-title">{item.title}</h3>
          <p className="roadmap-card-description">{item.description}</p>
        </div>
      </article>
    );
  };

  return (
    <>
      <PageHeader
        title="Roadmap"
        subtitle="See what's coming, and vote for the features you want next."
        accent="var(--palette-teal)"
        showActions={false}
      />

      <div className="roadmap-summary">
        <span>
          <strong>{allItems.length}</strong> features
        </span>
        <span className="roadmap-summary-dot" aria-hidden="true">
          •
        </span>
        <span>
          <strong>{totalVotes.toLocaleString()}</strong> votes
        </span>
      </div>

      <div className="roadmap-toolbar">
        <div className="roadmap-filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`roadmap-chip ${activeCategory === "all" ? "active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            All
          </button>
          {ROADMAP_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`roadmap-chip ${activeCategory === category ? "active" : ""}`}
              style={{ "--chip-accent": ROADMAP_CATEGORY_ACCENTS[category] } as CSSProperties}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="roadmap-toolbar-actions">
          <div className="roadmap-sort" role="group" aria-label="Sort">
            <button
              type="button"
              className={`roadmap-sort-btn ${sortMode === "votes" ? "active" : ""}`}
              onClick={() => setSortMode("votes")}
            >
              Most voted
            </button>
            <button
              type="button"
              className={`roadmap-sort-btn ${sortMode === "status" ? "active" : ""}`}
              onClick={() => setSortMode("status")}
            >
              By status
            </button>
          </div>
          <button
            type="button"
            className="roadmap-request-btn"
            onClick={() => setFormOpen((open) => !open)}
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Request a feature
          </button>
        </div>
      </div>

      {justSubmitted && (
        <div className="roadmap-banner" role="status">
          <Sparkles size={16} aria-hidden="true" />
          Thanks! Your idea is in “Under consideration” with your vote already counted.
        </div>
      )}

      {formOpen && (
        <form className="roadmap-form profile-card" onSubmit={handleSubmit}>
          <div className="profile-field">
            <label className="profile-field-label" htmlFor="roadmap-title">
              Feature idea
            </label>
            <input
              id="roadmap-title"
              className="profile-field-input"
              value={formTitle}
              onChange={(event) => setFormTitle(event.target.value)}
              placeholder="e.g. Compare three players at once"
              maxLength={80}
              required
            />
          </div>
          <div className="profile-field">
            <label className="profile-field-label" htmlFor="roadmap-description">
              Details <span className="roadmap-optional">(optional)</span>
            </label>
            <textarea
              id="roadmap-description"
              className="profile-field-input roadmap-textarea"
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              placeholder="Tell us what you'd use it for."
              maxLength={240}
              rows={3}
            />
          </div>
          <div className="profile-field">
            <label className="profile-field-label" htmlFor="roadmap-category">
              Category
            </label>
            <select
              id="roadmap-category"
              className="profile-field-input profile-field-select"
              value={formCategory}
              onChange={(event) => setFormCategory(event.target.value as RoadmapCategory)}
            >
              {ROADMAP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="roadmap-form-actions">
            <button
              type="button"
              className="roadmap-form-cancel"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="roadmap-form-submit">
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              Submit idea
            </button>
          </div>
        </form>
      )}

      {sortMode === "votes" ? (
        <div className="roadmap-list">
          {sortedByVotes.map(renderCard)}
        </div>
      ) : (
        <div className="roadmap-status-groups">
          {groupedByStatus.map((group) => {
            const meta = ROADMAP_STATUS_META[group.status];
            return (
              <section key={group.status} className="roadmap-status-section">
                <div
                  className="roadmap-status-header"
                  style={{ "--status-accent": meta.accent } as CSSProperties}
                >
                  <span className="roadmap-status-dot" aria-hidden="true" />
                  <h2 className="roadmap-status-title">{meta.label}</h2>
                  <span className="roadmap-status-count">{group.items.length}</span>
                </div>
                <p className="roadmap-status-blurb">{meta.blurb}</p>
                <div className="roadmap-list">{group.items.map(renderCard)}</div>
              </section>
            );
          })}
        </div>
      )}

      <AdBanner />
    </>
  );
}
