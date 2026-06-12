import { ChevronRight, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

export function SavedItems() {
  return (
    <>
      <h1 className="page-title">Saved items</h1>
      <p className="page-subtitle">Teams and players you have saved</p>

      <div className="profile-card">
        <div className="profile-empty">
          <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
          <p>No saved teams or players yet.</p>
          <Link to="/teams" className="profile-link">
            Browse teams
            <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
