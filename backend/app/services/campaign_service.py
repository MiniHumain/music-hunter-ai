from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate


def create_campaign(
    db: Session,
    data: CampaignCreate,
) -> Campaign:
    campaign = Campaign(
        name=data.name.strip(),
        status="draft",
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign


def get_campaigns(
    db: Session,
) -> list[Campaign]:
    statement = (
        select(Campaign)
        .order_by(Campaign.created_at.desc())
    )

    return list(
        db.scalars(statement).all()
    )


def get_campaign_by_id(
    db: Session,
    campaign_id: int,
) -> Campaign | None:
    return db.get(
        Campaign,
        campaign_id,
    )