from app.collectors.base import CollectedProspect


TARGET_INDUSTRIES = {
    "jeux vidéo",
    "publicité",
    "cinéma",
    "musique",
}


TARGET_COUNTRIES = {
    "France",
    "Canada",
    "Royaume-Uni",
    "Allemagne",
    "Espagne",
    "Italie",
    "États-Unis",
    "Belgique",
    "Suisse",
}


def calculate_prospect_score(
    prospect: CollectedProspect,
) -> float:
    score = 0.0

    if prospect.website:
        score += 15

    if prospect.public_email:
        score += 25

    if prospect.linkedin:
        score += 10

    if prospect.public_phone:
        score += 5

    if prospect.country in TARGET_COUNTRIES:
        score += 10

    if prospect.city:
        score += 5

    if prospect.industry:
        industry = prospect.industry.strip().lower()

        if industry in TARGET_INDUSTRIES:
            score += 25
        else:
            score += 10

    return min(score, 100.0)


def calculate_priority(
    score: float,
) -> int:
    if score >= 80:
        return 5

    if score >= 60:
        return 4

    if score >= 40:
        return 3

    if score >= 20:
        return 2

    return 1