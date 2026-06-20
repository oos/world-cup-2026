import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Tv } from "lucide-react";
import posthog from "posthog-js";
import { Link, useParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import {
  api,
  type BroadcastCountry,
  type BroadcastCountrySummary,
} from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { TeamFlag } from "../components/TeamFlag";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatBroadcasterType,
  formatCoverageLabel,
  getBroadcastCountryForCity,
} from "../utils/broadcastCountry";
import { usePageMeta } from "../hooks/usePageMeta";

function CountryRow({ country }: { country: BroadcastCountrySummary }) {
  return (
    <Link
      to={`/watch/${country.code}`}
      className="watch-country-link"
      onClick={() => posthog.capture("watch_country_selected", { country_code: country.code, country_name: country.name })}
    >
      <div className="watch-country-link-main">
        <TeamFlag
          fifaCode={null}
          teamName={country.name}
          flagIso={country.flag_iso}
          className="watch-country-flag"
        />
        <div className="watch-country-copy">
          <div className="watch-country-name">{country.name}</div>
          <div className="watch-country-meta">
            {country.has_rights
              ? `${country.broadcaster_count} broadcaster${country.broadcaster_count === 1 ? "" : "s"}`
              : "Rights not yet confirmed"}
          </div>
        </div>
      </div>
      <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );
}

function BroadcasterRow({
  name,
  type,
  url,
  notes,
}: {
  name: string;
  type: string;
  url?: string | null;
  notes?: string | null;
}) {
  const content = (
    <>
      <div className="watch-broadcaster-main">
        <span className="watch-broadcaster-name">{name}</span>
        <span className={`watch-broadcaster-type watch-broadcaster-type--${type}`}>
          {formatBroadcasterType(type)}
        </span>
      </div>
      {notes ? <div className="watch-broadcaster-notes">{notes}</div> : null}
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        className="watch-broadcaster-row watch-broadcaster-row--link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
        <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
      </a>
    );
  }

  return <div className="watch-broadcaster-row">{content}</div>;
}

function WatchIndex({
  countries,
  suggestedCode,
}: {
  countries: BroadcastCountrySummary[];
  suggestedCode: string | null;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredCountries = useMemo(() => {
    if (!normalizedQuery) return countries;
    return countries.filter((country) =>
      country.name.toLowerCase().includes(normalizedQuery)
    );
  }, [countries, normalizedQuery]);

  const suggestedCountry = suggestedCode
    ? countries.find((country) => country.code === suggestedCode)
    : null;

  return (
    <>
      <PageHeader
        title="Where to watch"
        subtitle="Find broadcasters and streaming options for the 2026 World Cup in your country."
        accent="var(--palette-blue)"
      />

      {suggestedCountry ? (
        <div className="watch-suggested-card">
          <div className="watch-suggested-copy">
            <div className="watch-suggested-label">Suggested for you</div>
            <div className="watch-suggested-title">
              Watch in {suggestedCountry.name}
            </div>
          </div>
          <Link to={`/watch/${suggestedCountry.code}`} className="watch-suggested-btn" data-track-button="view_suggested_country_guide">
            View guide
          </Link>
        </div>
      ) : null}

      <div className="watch-search-wrap">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search countries…"
        />
      </div>

      <div className="profile-card watch-country-list">
        {filteredCountries.length > 0 ? (
          filteredCountries.map((country) => (
            <CountryRow key={country.code} country={country} />
          ))
        ) : (
          <p className="empty-state watch-empty-state">No countries match your search.</p>
        )}
      </div>
      <AdBanner />
    </>
  );
}

function WatchCountryDetail({ country }: { country: BroadcastCountry }) {
  const coverage = formatCoverageLabel(country.coverage);

  return (
    <>
      <Link to="/watch" className="back-link">
        ← All countries
      </Link>

      <PageHeader
        title={`Where to watch in ${country.name}`}
        subtitle="Broadcasters and streaming options for the 2026 FIFA World Cup."
        accent="var(--palette-blue)"
      />

      <div className="watch-detail-hero profile-card">
        <div className="watch-detail-hero-main">
          <TeamFlag
            fifaCode={null}
            teamName={country.name}
            flagIso={country.flag_iso}
            className="watch-detail-flag"
          />
          <div>
            <h2 className="watch-detail-title">{country.name}</h2>
            {coverage ? (
              <p className="watch-detail-coverage">{coverage}</p>
            ) : (
              <p className="watch-detail-coverage watch-detail-coverage--pending">
                Coverage details pending
              </p>
            )}
          </div>
        </div>
        {country.notes ? <p className="watch-detail-notes">{country.notes}</p> : null}
      </div>

      <h2 className="section-title watch-section-title">
        <Tv size={18} strokeWidth={2} aria-hidden="true" />
        Broadcasters
      </h2>

      {country.broadcasters.length > 0 ? (
        <div className="profile-card watch-broadcaster-list">
          {country.broadcasters.map((broadcaster) => (
            <BroadcasterRow
              key={`${broadcaster.name}-${broadcaster.type}`}
              name={broadcaster.name}
              type={broadcaster.type}
              url={broadcaster.url}
              notes={broadcaster.notes}
            />
          ))}
        </div>
      ) : (
        <div className="profile-card watch-empty-card">
          <p className="empty-state">
            Broadcast rights for {country.name} have not been confirmed yet.
          </p>
        </div>
      )}

      <div className="watch-footer-meta">
        <p>
          Last updated {country.last_updated}. Rights can change — check{" "}
          <a href={country.fifa_broadcasts_url} target="_blank" rel="noopener noreferrer">
            FIFA&apos;s official broadcast finder
          </a>{" "}
          for the latest information.
        </p>
      </div>
      <AdBanner />
    </>
  );
}

export function Watch() {
  usePageMeta(
    "Where to Watch World Cup 2026",
    "Broadcasters and streaming by country",
  );

  const { countryCode } = useParams<{ countryCode?: string }>();
  const { preferences } = useProfilePreferences();
  const [countries, setCountries] = useState<BroadcastCountrySummary[]>([]);
  const [country, setCountry] = useState<BroadcastCountry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const suggestedCode = getBroadcastCountryForCity(preferences.city);

  useEffect(() => {
    if (countryCode) {
      setLoading(true);
      setError(null);
      api
        .getBroadcastCountry(countryCode)
        .then(setCountry)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    setError(null);
    api
      .getBroadcastCountries()
      .then((response) => setCountries(response.countries))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [countryCode]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading broadcast guide…</div>;

  if (countryCode) {
    if (!country) return <div className="error">Country not found.</div>;
    return <WatchCountryDetail country={country} />;
  }

  return <WatchIndex countries={countries} suggestedCode={suggestedCode} />;
}
