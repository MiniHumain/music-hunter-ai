from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.outreach_message import (
    OutreachMessageCreate,
    OutreachMessageRead,
)
from app.services.outreach_message_service import (
    create_outreach_message,
    get_outreach_messages,
)


router = APIRouter(
    prefix="/outreach-messages",
    tags=["Outreach Messages"],
)


@router.post(
    "",
    response_model=OutreachMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    data: OutreachMessageCreate,
    db: Session = Depends(get_db),
) -> OutreachMessageRead:
    try:
        return create_outreach_message(
            db,
            data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "",
    response_model=list[OutreachMessageRead],
)
def list_messages(
    prospect_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[OutreachMessageRead]:
    return get_outreach_messages(
        db,
        prospect_id=prospect_id,
    )