from app.ingestion.player_career_client import PlayerCareerClient


def test_is_international_team():
    assert PlayerCareerClient._is_international_team("Argentina national football team")
    assert PlayerCareerClient._is_international_team("England men's national football team")
    assert not PlayerCareerClient._is_international_team("FC Barcelona")
    assert not PlayerCareerClient._is_international_team("Portugal national under-21 football team")


def test_national_team_country():
    assert (
        PlayerCareerClient._national_team_country("Argentina national football team")
        == "Argentina"
    )
    assert (
        PlayerCareerClient._national_team_country("England national association football team")
        == "England"
    )


def test_parse_date():
    assert PlayerCareerClient._parse_date("2018-07-10T00:00:00Z") == "2018-07-10"
    assert PlayerCareerClient._parse_date(None) is None


def test_club_from_transfermarkt_builds_stints():
    client = PlayerCareerClient()
    transfers = {
        "transfers": [
            {
                "dateUnformatted": "2023-07-15",
                "fee": "free transfer",
                "to": {
                    "clubName": "Miami",
                    "clubEmblem-2x": "https://example.com/miami.png",
                },
            },
            {
                "dateUnformatted": "2021-08-10",
                "fee": "free transfer",
                "to": {
                    "clubName": "PSG",
                    "clubEmblem-2x": "https://example.com/psg.png",
                },
            },
            {
                "dateUnformatted": "2004-07-01",
                "fee": "€0",
                "to": {
                    "clubName": "Barcelona",
                    "clubEmblem-2x": "https://example.com/barca.png",
                },
            },
        ]
    }

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return transfers

    client.client.get = lambda url: FakeResponse()
    stints = client._club_from_transfermarkt("28003")

    assert len(stints) == 3
    assert stints[0].team_name == "Barcelona"
    assert stints[0].transfer_fee == "€0"
    assert stints[0].end_date == "2021-08-10"
    assert stints[2].team_name == "Miami"
    assert stints[2].is_current is True
    assert stints[2].badge_url == "https://example.com/miami.png"
