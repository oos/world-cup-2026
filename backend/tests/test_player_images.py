from app.ingestion.player_image_client import PlayerImageClient


def test_normalize_commons_file_path_url():
    url = "http://commons.wikimedia.org/wiki/Special:FilePath/Player.jpg"
    assert PlayerImageClient.normalize_image_url(url) == (
        "http://commons.wikimedia.org/wiki/Special:FilePath/Player.jpg?width=200"
    )


def test_normalize_preserves_upload_wikimedia_url():
    url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Player.jpg/200px-Player.jpg"
    assert PlayerImageClient.normalize_image_url(url) == url
