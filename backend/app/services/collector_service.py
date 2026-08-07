from sqlalchemy import select
from sqlalchemy.orm import Session

from app.collectors.base import BaseCollector, CollectedProspect
from app.models.prospect import Prospect


def prospect_exists(
    db: Session,
    collected: CollectedProspect,
) -> bool:
    if collected.public_email:
        existing = db.scalar(
            select(Prospect).where(
                Prospect.public_email == collected.public_email
            )
        )

        if existing is not None:
            return True

    if collected.website:
        existing = db.scalar(
            select(Prospect).where(
                Prospect.website == collected.website
            )
        )

        if existing is not None:
            return True

    return False


def calculate_score(
    collected: CollectedProspect,
) -> float:
    score = 0

    if collected.website:
        score += 20

    if collected.public_email:
        score += 30

    if collected.linkedin:
        score += 15

    if collected.public_phone:
        score += 10

    if collected.country:
        score += 5

    if collected.city:
        score += 5

    if collected.industry:
        score += 15

    return min(score, 100)


def calculate_priority(score: float) -> int:
    if score >= 80:
        return 5

    if score >= 60:
        return 4

    if score >= 40:
        return 3

    if score >= 20:
        return 2

    return 1


def save_collected_prospect(
    db: Session,
    collected: CollectedProspect,
) -> Prospect:
    score = calculate_score(collected)

    prospect = Prospect(
        company_name=collected.company_name,
        country=collected.country,
        city=collected.city,
        website=collected.website,
        linkedin=collected.linkedin,
        public_email=collected.public_email,
        public_phone=collected.public_phone,
        industry=collected.industry,
        priority=calculate_priority(score),
        status="À contacter",
        score=score,
    )

    db.add(prospect)
    db.flush()

    return prospect


def run_collector(
    db: Session,
    collector: BaseCollector,
) -> dict[str, int]:
    collected_prospects = collector.collect()

    imported = 0
    duplicates = 0
    ignored = 0

    for collected in collected_prospects:
        if not collected.company_name.strip():
            ignored += 1
            continue

        if prospect_exists(db, collected):
            duplicates += 1
            continue

        save_collected_prospect(
            db,
            collected,
        )

        imported += 1

    db.commit()

    return {
        "collected": len(collected_prospects),
        "imported": imported,
        "duplicates": duplicates,
        "ignored": ignored,
    }