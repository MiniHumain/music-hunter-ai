from app.config.outreach_identity import (
    OUTREACH_EMAIL,
    OUTREACH_NAME,
    OUTREACH_SOUNDCLOUD,
)
from app.models.prospect import Prospect


COUNTRY_PREPOSITIONS = {
    "Canada": "au",
    "Royaume-Uni": "au",
    "États-Unis": "aux",
    "France": "en",
    "Allemagne": "en",
    "Espagne": "en",
    "Italie": "en",
    "Belgique": "en",
    "Suisse": "en",
}


def _location_context(
    prospect: Prospect,
) -> str:
    if prospect.city and prospect.country:
        preposition = COUNTRY_PREPOSITIONS.get(
            prospect.country,
            "en",
        )

        return (
            f"basée à {prospect.city}, "
            f"{preposition} {prospect.country}"
        )

    if prospect.country:
        preposition = COUNTRY_PREPOSITIONS.get(
            prospect.country,
            "en",
        )

        return (
            f"basée {preposition} "
            f"{prospect.country}"
        )

    if prospect.city:
        return f"basée à {prospect.city}"

    return ""


def _signature() -> str:
    return (
        f"À bientôt,\n\n"
        f"{OUTREACH_NAME}\n"
        f"{OUTREACH_EMAIL}\n"
        f"SoundCloud : {OUTREACH_SOUNDCLOUD}"
    )


def _video_game_message(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Musique originale pour vos projets - "
        f"{prospect.company_name}"
    )

    location = _location_context(
        prospect
    )

    location_sentence = (
        f", {location}"
        if location
        else ""
    )

    body = (
        f"Bonjour,\n\n"
        f"Je me permets de vous écrire car je suis "
        f"tombé sur {prospect.company_name}"
        f"{location_sentence}.\n\n"
        f"Je suis {OUTREACH_NAME}, compositeur et "
        f"producteur, et je cherche à collaborer sur "
        f"des projets de jeu vidéo où la musique peut "
        f"apporter une vraie identité à l’univers du jeu.\n\n"
        f"Si vous travaillez sur des projets qui pourraient "
        f"avoir besoin de musique originale, je serais ravi "
        f"d’en discuter avec vous.\n\n"
        f"Vous pouvez écouter mon travail ici :\n"
        f"{OUTREACH_SOUNDCLOUD}\n\n"
        f"{_signature()}"
    )

    return subject, body


def _cinema_message(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Musique originale pour vos productions - "
        f"{prospect.company_name}"
    )

    body = (
        f"Bonjour,\n\n"
        f"Je découvre le travail de "
        f"{prospect.company_name} et je me permets "
        f"de vous contacter.\n\n"
        f"Je suis {OUTREACH_NAME}, compositeur et "
        f"producteur, et je travaille autour de la "
        f"musique à l’image.\n\n"
        f"Je serais ravi d’échanger avec vous si vous "
        f"avez des films, formats courts ou autres "
        f"productions qui pourraient nécessiter une "
        f"musique originale.\n\n"
        f"Quelques morceaux sont disponibles ici :\n"
        f"{OUTREACH_SOUNDCLOUD}\n\n"
        f"{_signature()}"
    )

    return subject, body


def _advertising_message(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Musique pour vos projets de marque - "
        f"{prospect.company_name}"
    )

    body = (
        f"Bonjour,\n\n"
        f"Je me permets de vous contacter après avoir "
        f"découvert {prospect.company_name}.\n\n"
        f"Je suis {OUTREACH_NAME}, compositeur et "
        f"producteur, et je crée de la musique originale "
        f"pour accompagner des univers de marque, "
        f"campagnes et contenus audiovisuels.\n\n"
        f"Si vous recherchez ponctuellement de la musique "
        f"sur mesure pour vos projets, je serais ravi "
        f"d’échanger avec vous.\n\n"
        f"Vous pouvez écouter mon univers ici :\n"
        f"{OUTREACH_SOUNDCLOUD}\n\n"
        f"{_signature()}"
    )

    return subject, body


def _music_message(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Collaboration musicale - "
        f"{prospect.company_name}"
    )

    body = (
        f"Bonjour,\n\n"
        f"Je me permets de vous écrire après avoir "
        f"découvert {prospect.company_name}.\n\n"
        f"Je suis {OUTREACH_NAME}, compositeur et "
        f"producteur, et je suis ouvert à des "
        f"collaborations autour de la composition, "
        f"production et création musicale.\n\n"
        f"Si vous avez des projets pour lesquels mon "
        f"univers pourrait être pertinent, ce serait "
        f"avec plaisir que j’échangerais avec vous.\n\n"
        f"Mon travail est disponible ici :\n"
        f"{OUTREACH_SOUNDCLOUD}\n\n"
        f"{_signature()}"
    )

    return subject, body


def _generic_message(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Collaboration musicale - "
        f"{prospect.company_name}"
    )

    body = (
        f"Bonjour,\n\n"
        f"Je me permets de vous contacter après avoir "
        f"découvert {prospect.company_name}.\n\n"
        f"Je suis {OUTREACH_NAME}, compositeur et "
        f"producteur, et je recherche des collaborations "
        f"autour de projets créatifs où la musique peut "
        f"avoir une vraie place.\n\n"
        f"Si cela peut correspondre à vos besoins, "
        f"je serais ravi d’échanger avec vous.\n\n"
        f"Vous pouvez écouter mon travail ici :\n"
        f"{OUTREACH_SOUNDCLOUD}\n\n"
        f"{_signature()}"
    )

    return subject, body


def generate_outreach_draft(
    prospect: Prospect,
) -> tuple[str, str]:
    industry = (
        prospect.industry
        .strip()
        .lower()
        if prospect.industry
        else ""
    )

    if industry in {
        "jeu vidéo",
        "jeux vidéo",
        "jeux video",
        "video games",
    }:
        return _video_game_message(
            prospect
        )

    if industry in {
        "cinéma",
        "cinema",
        "film",
        "film industry",
    }:
        return _cinema_message(
            prospect
        )

    if industry in {
        "publicité",
        "publicite",
        "advertising",
    }:
        return _advertising_message(
            prospect
        )

    if industry in {
        "musique",
        "music",
        "music industry",
    }:
        return _music_message(
            prospect
        )

    return _generic_message(
        prospect
    )