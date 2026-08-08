from sqlalchemy import select
from sqlalchemy.orm import Session

from app.collectors.base import (
    BaseCollector,
    CollectedProspect,
)
from app.models.prospect import Prospect
from app.services.prospect_scoring import (
    calculate_priority,
    calculate_prospect_score,
)


def prospect_exists(
    db: Session,
    collected: CollectedProspect,
) -> bool:
    if collected.public_email:
        existing = db.scalar(
            select(Prospect).where(
                Prospect.public_email
                == collected.public_email
            )
        )

        if existing is not None:
            return True

    if collected.website:
        existing = db.scalar(
            select(Prospect).where(
                Prospect.website
                == collected.website
            )
        )

        if existing is not None:
            return True

    return False


def save_collected_prospect(
    db: Session,
    collected: CollectedProspect,
) -> Prospect:
    score = calculate_prospect_score(
        collected
    )

    priority = calculate_priority(
        score
    )

    prospect = Prospect(
        company_name=collected.company_name,
        country=collected.country,
        city=collected.city,
        website=collected.website,
        linkedin=collected.linkedin,
        public_email=collected.public_email,
        public_phone=collected.public_phone,
        industry=collected.industry,
        priority=priority,
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

        if prospect_exists(
            db,
            collected,
        ):
            duplicates += 1
            continue

        save_collected_prospect(
            db,
            collected,
        )

        imported += 1

    db.commit()

    return {
        "collected": len(
            collected_prospects
        ),
        "imported": imported,
        "duplicates": duplicates,
        "ignored": ignored,
    }