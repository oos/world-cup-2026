import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

function AboutRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="profile-row">
      <div className="profile-row-copy">
        <div className="profile-row-label">{label}</div>
      </div>
      <div className="profile-row-control">
        <span className="profile-meta">{children}</span>
      </div>
    </div>
  );
}

export function About() {
  return (
    <>
      <h1 className="page-title">About</h1>
      <p className="page-subtitle">App information</p>

      <div className="profile-card">
        <AboutRow label="App">World Cup 2026 Stats</AboutRow>
        <AboutRow label="Version">1.0.0</AboutRow>
        <Link to="/dashboard" className="profile-nav-link">
          <span>Back to dashboard</span>
          <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
