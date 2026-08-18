from app.schemas.prospect import ProspectRead
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from fastapi import HTTPException
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
@router.post(
    "/{campaign_id}/prospects/{prospect_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_prospect_to_campaign(
    campaign_id: int,
    prospect_id: int,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    try:
        campaign_prospect = (
            campaign_service.add_prospect_to_campaign(
                db,
                campaign_id,
                prospect_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return {
        "id": campaign_prospect.id,
        "campaign_id": campaign_prospect.campaign_id,
        "prospect_id": campaign_prospect.prospect_id,
    }
@router.get(
    "/{campaign_id}/prospects",
    response_model=list[ProspectRead],
)
def list_campaign_prospects(
    campaign_id: int,
    db: Session = Depends(get_db),
) -> list[ProspectRead]:
    try:
        return campaign_service.get_campaign_prospects(
            db,
            campaign_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
@router.delete(
    "/{campaign_id}/prospects/{prospect_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_prospect_from_campaign(
    campaign_id: int,
    prospect_id: int,
    db: Session = Depends(get_db),
) -> Response:
    try:
        campaign_service.remove_prospect_from_campaign(
            db,
            campaign_id,
            prospect_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
@router.post(
    "/{campaign_id}/generate-drafts",
)
def generate_campaign_drafts(
    campaign_id: int,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    try:
        return campaign_service.generate_campaign_drafts(
            db,
            campaign_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc