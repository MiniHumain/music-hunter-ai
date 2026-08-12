from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.campaign import (
    CampaignCreate,
    CampaignRead,
)
from app.services import campaign_service


router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"],
)


@router.post(
    "",
    response_model=CampaignRead,
    status_code=status.HTTP_201_CREATED,
)
def create_campaign(
    data: CampaignCreate,
    db: Session = Depends(get_db),
) -> CampaignRead:
    return campaign_service.create_campaign(
        db,
        data,
    )


@router.get(
    "",
    response_model=list[CampaignRead],
)
def list_campaigns(
    db: Session = Depends(get_db),
) -> list[CampaignRead]:
    return campaign_service.get_campaigns(
        db
    )