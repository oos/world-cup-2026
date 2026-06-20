type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  id = "search",
}: SearchInputProps) {
  return (
    <div className="search-input">
      <svg
        className="search-input-icon"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.25" />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        className="search-input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-input-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
          data-track-button="clear_search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
