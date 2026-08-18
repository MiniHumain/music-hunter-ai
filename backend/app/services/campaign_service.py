from app.models.campaign_prospect import CampaignProspect
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.prospect import Prospect
from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate
from app.schemas.outreach_message import OutreachMessageCreate
from app.services.outreach_generation import generate_outreach_draft
from app.services.outreach_message_service import create_outreach_message

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
def add_prospect_to_campaign(
    db: Session,
    campaign_id: int,
    prospect_id: int,
) -> CampaignProspect:
    campaign = db.get(
        Campaign,
        campaign_id,
    )

    if campaign is None:
        raise ValueError(
            "Campagne introuvable"
        )

    prospect = db.get(
        Prospect,
        prospect_id,
    )

    if prospect is None:
        raise ValueError(
            "Prospect introuvable"
        )

    campaign_prospect = CampaignProspect(
        campaign_id=campaign_id,
        prospect_id=prospect_id,
    )

    try:
        db.add(campaign_prospect)
        db.commit()
        db.refresh(campaign_prospect)
    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "Ce prospect est déjà dans la campagne"
        ) from exc

    return campaign_prospect
def get_campaign_prospects(
    db: Session,
    campaign_id: int,
) -> list[Prospect]:
    campaign = db.get(
        Campaign,
        campaign_id,
    )

    if campaign is None:
        raise ValueError(
            "Campagne introuvable"
        )

    statement = (
        select(Prospect)
        .join(
            CampaignProspect,
            CampaignProspect.prospect_id
            == Prospect.id,
        )
        .where(
            CampaignProspect.campaign_id
            == campaign_id
        )
        .order_by(
            Prospect.company_name.asc()
        )
    )

    return list(
        db.scalars(statement).all()
    )
def remove_prospect_from_campaign(
    db: Session,
    campaign_id: int,
    prospect_id: int,
) -> None:
    statement = (
        select(CampaignProspect)
        .where(
            CampaignProspect.campaign_id == campaign_id,
            CampaignProspect.prospect_id == prospect_id,
        )
    )

    campaign_prospect = db.scalar(statement)

    if campaign_prospect is None:
        raise ValueError(
            "Ce prospect n'est pas dans la campagne"
        )

    db.delete(campaign_prospect)
    db.commit()
def generate_campaign_drafts(
db: Session,
campaign_id: int,
) -> dict[str, int]:
    prospects = get_campaign_prospects(
        db,
        campaign_id,
    )

    created = 0
    skipped = 0

    for prospect in prospects:
        subject, body = generate_outreach_draft(
            prospect
        )

        data = OutreachMessageCreate(
            prospect_id=prospect.id,
            subject=subject,
            body=body,
        )

        create_outreach_message(
            db,
            data,
        )

        created += 1

    return {
        "prospects": len(prospects),
        "created": created,
        "skipped": skipped,
    }