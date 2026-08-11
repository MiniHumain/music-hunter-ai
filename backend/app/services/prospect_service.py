from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.collectors.base import CollectedProspect
from app.models.prospect import Prospect
from app.schemas.prospect import (
    ProspectCreate,
    ProspectUpdate,
)
from app.services.prospect_scoring import (
    calculate_priority,
    calculate_prospect_score,
)


def create_prospect(
    db: Session,
    data: ProspectCreate,
) -> Prospect:
    prospect = Prospect(
        **data.model_dump()
    )

    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    return prospect


def get_prospects(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> list[Prospect]:
    statement = (
        select(Prospect)
        .order_by(
            Prospect.created_at.desc()
        )
        .offset(skip)
        .limit(limit)
    )

    return list(
        db.scalars(statement).all()
    )


def get_prospect_by_id(
    db: Session,
    prospect_id: int,
) -> Prospect | None:
    return db.get(
        Prospect,
        prospect_id,
    )


def update_prospect(
    db: Session,
    prospect: Prospect,
    data: ProspectUpdate,
) -> Prospect:
    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(
            prospect,
            field,
            value,
        )

    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    return prospect


def delete_prospect(
    db: Session,
    prospect: Prospect,
) -> None:
    db.delete(prospect)
    db.commit()


def mark_prospect_replied(
    db: Session,
    prospect: Prospect,
) -> Prospect:
    prospect.status = "Répondu"
    prospect.replied_at = (
        datetime.now(UTC)
        .replace(tzinfo=None)
    )
    prospect.follow_up_at = None

    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    return prospect


def recalculate_all_scores(
    db: Session,
) -> dict[str, int]:
    prospects = list(
        db.scalars(
            select(Prospect)
        ).all()
    )

    updated = 0

    for prospect in prospects:
        collected = CollectedProspect(
            company_name=prospect.company_name,
            country=prospect.country,
            city=prospect.city,
            website=prospect.website,
            linkedin=prospect.linkedin,
            public_email=prospect.public_email,
            public_phone=prospect.public_phone,
            industry=prospect.industry,
            source="score_recalculation",
        )

        score = calculate_prospect_score(
            collected
        )

        priority = calculate_priority(
            score
        )

        if (
            prospect.score != score
            or prospect.priority != priority
        ):
            prospect.score = score
            prospect.priority = priority
            db.add(prospect)
            updated += 1

    db.commit()

    return {
        "analyzed": len(prospects),
        "updated": updated,
    }