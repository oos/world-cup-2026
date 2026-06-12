from app.models.espn_match import EspnMatch, MatchCommentaryEvent
from app.models.auth_token import AuthToken
from app.models.ingestion_run import IngestionRun
from app.models.match import Match
from app.models.nation import Nation
from app.models.player import Player
from app.models.push_subscription import PushSubscription, SentMatchNotification
from app.models.squad_member import SquadMember
from app.models.stadium import Stadium
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.models.user import User, UserProfile

# Backward-compatible alias used across services during transition.
Team = TournamentTeam

__all__ = [
    "Tournament",
    "Nation",
    "TournamentTeam",
    "Team",
    "Player",
    "SquadMember",
    "Stadium",
    "Match",
    "IngestionRun",
    "PushSubscription",
    "SentMatchNotification",
    "User",
    "UserProfile",
    "AuthToken",
    "EspnMatch",
    "MatchCommentaryEvent",
]
