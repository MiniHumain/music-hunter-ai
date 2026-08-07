from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prospect import Prospect
from app.schemas.prospect import ProspectCreate, ProspectUpdate


def create_prospect(db: Session, data: ProspectCreate) -> Prospect:
    prospect = Prospect(**data.model_dump())

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
        .order_by(Prospect.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def get_prospect_by_id(
    db: Session,
    prospect_id: int,
) -> Prospect | None:
    return db.get(Prospect, prospect_id)


def update_prospect(
    db: Session,
    prospect: Prospect,
    data: ProspectUpdate,
) -> Prospect:
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(prospect, field, value)

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