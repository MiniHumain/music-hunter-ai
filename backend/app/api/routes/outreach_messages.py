from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.outreach_message import (
    OutreachMessageCreate,
    OutreachMessageRead,
    OutreachMessageUpdate,
)
from app.services import prospect_service
from app.services.outreach_generation import (
    generate_follow_up_draft,
    generate_outreach_draft,
)

from app.services.outreach_message_service import (
    create_outreach_message,
    delete_outreach_message,
    get_outreach_message_by_id,
    get_outreach_messages,
    send_outreach_message,
    update_outreach_message,
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


@router.post(
    "/generate/{prospect_id}",
)
def generate_message(
    prospect_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    prospect = prospect_service.get_prospect_by_id(
        db,
        prospect_id,
    )
    

    if prospect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospect introuvable",
        )

    subject, body = generate_outreach_draft(
        prospect
    )

    return {
        "subject": subject,
        "body": body,
    }
@router.post(
    "/generate-follow-up/{prospect_id}",
)
def generate_follow_up_message(
    prospect_id: int,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    prospect = prospect_service.get_prospect_by_id(
        db,
        prospect_id,
    )

    if prospect is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospect introuvable",
        )

    subject, body = generate_follow_up_draft(
        prospect
    )

    return {
        "subject": subject,
        "body": body,
    }


@router.post(
    "/{message_id}/send",
    response_model=OutreachMessageRead,
)
def send_message(
    message_id: int,
    db: Session = Depends(get_db),
) -> OutreachMessageRead:
    message = get_outreach_message_by_id(
        db,
        message_id,
    )

    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable",
        )

    try:
        return send_outreach_message(
            db,
            message,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Impossible d'envoyer l'email : "
                f"{exc}"
            ),
        ) from exc


@router.patch(
    "/{message_id}",
    response_model=OutreachMessageRead,
)
def update_message(
    message_id: int,
    data: OutreachMessageUpdate,
    db: Session = Depends(get_db),
) -> OutreachMessageRead:
    message = get_outreach_message_by_id(
        db,
        message_id,
    )

    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable",
        )

    return update_outreach_message(
        db,
        message,
        data,
    )


@router.delete(
    "/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
) -> Response:
    message = get_outreach_message_by_id(
        db,
        message_id,
    )

    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brouillon introuvable",
        )

    delete_outreach_message(
        db,
        message,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )