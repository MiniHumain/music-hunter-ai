from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.prospect import ProspectCreate, ProspectRead, ProspectUpdate
from app.services import prospect_service

router = APIRouter(
    prefix="/prospects",
    tags=["Prospects"],
)


@router.post(
    "",
    response_model=ProspectRead,
    status_code=status.HTTP_201_CREATED,
)
def create_prospect(
    data: ProspectCreate,
    db: Session = Depends(get_db),
) -> ProspectRead:
    return prospect_service.create_prospect(db, data)


@router.get(
    "",
    response_model=list[ProspectRead],
)
def list_prospects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[ProspectRead]:
    return prospect_service.get_prospects(
        db,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{prospect_id}",
    response_model=ProspectRead,
)
def get_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
) -> ProspectRead:
    prospect = prospect_service.get_prospect_by_id(
        db,
        prospect_id,
    )

    if prospect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospect introuvable",
        )

    return prospect


@router.patch(
    "/{prospect_id}",
    response_model=ProspectRead,
)
def update_prospect(
    prospect_id: int,
    data: ProspectUpdate,
    db: Session = Depends(get_db),
) -> ProspectRead:
    prospect = prospect_service.get_prospect_by_id(
        db,
        prospect_id,
    )

    if prospect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospect introuvable",
        )

    return prospect_service.update_prospect(
        db,
        prospect,
        data,
    )


@router.delete(
    "/{prospect_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
) -> Response:
    prospect = prospect_service.get_prospect_by_id(
        db,
        prospect_id,
    )

    if prospect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospect introuvable",
        )

    prospect_service.delete_prospect(db, prospect)

    return Response(status_code=status.HTTP_204_NO_CONTENT)