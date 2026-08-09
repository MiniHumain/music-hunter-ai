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


def generate_outreach_draft(
    prospect: Prospect,
) -> tuple[str, str]:
    subject = (
        f"Collaboration musicale - "
        f"{prospect.company_name}"
    )

    context_parts: list[str] = []

    if prospect.industry:
        context_parts.append(
            f"dans le secteur {prospect.industry}"
        )

    if prospect.city and prospect.country:
        country_preposition = (
            COUNTRY_PREPOSITIONS.get(
                prospect.country,
                "en",
            )
        )

        context_parts.append(
            f"basée à {prospect.city}, "
            f"{country_preposition} "
            f"{prospect.country}"
        )

    elif prospect.country:
        country_preposition = (
            COUNTRY_PREPOSITIONS.get(
                prospect.country,
                "en",
            )
        )

        context_parts.append(
            f"basée {country_preposition} "
            f"{prospect.country}"
        )

    elif prospect.city:
        context_parts.append(
            f"basée à {prospect.city}"
        )

    if context_parts:
        company_context = ", ".join(
            context_parts
        )
    else:
        company_context = (
            "active dans les industries créatives"
        )

    body = (
        f"Bonjour,\n\n"
        f"Je me permets de vous contacter au sujet "
        f"d’une possible collaboration musicale avec "
        f"{prospect.company_name}, "
        f"{company_context}.\n\n"
        f"Je serais ravi d’échanger avec vous pour voir "
        f"s’il existe des opportunités de collaboration "
        f"autour de vos projets actuels ou à venir.\n\n"
        f"Bien cordialement"
    )

    return subject, body