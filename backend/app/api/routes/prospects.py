from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.collectors.base import CollectedProspect
from app.db.database import get_db
from app.schemas.prospect import (
    ProspectCreate,
    ProspectRead,
    ProspectUpdate,
)
from app.services import prospect_service
from app.services.import_service import (
    import_prospects_from_csv,
    import_prospects_from_xlsx,
)
from app.services.prospect_enrichment import (
    find_best_public_email,
    find_company_linkedin,
)
from app.services.prospect_scoring import (
    calculate_priority,
    calculate_prospect_score,
)


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
    return prospect_service.create_prospect(
        db,
        data,
    )


@router.post("/import")
async def import_prospects(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier manquant",
        )

    filename = file.filename.lower()

    if not (
        filename.endswith(".csv")
        or filename.endswith(".xlsx")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être au format CSV ou XLSX",
        )

    content = await file.read()

    try:
        if filename.endswith(".csv"):
            result = import_prospects_from_csv(
                db,
                content,
            )
        else:
            result = import_prospects_from_xlsx(
                db,
                content,
            )

    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Encodage CSV invalide",
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Impossible de lire le fichier : "
                f"{exc}"
            ),
        ) from exc

    return result


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


@router.post(
    "/{prospect_id}/enrich",
    response_model=ProspectRead,
)
def enrich_prospect(
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

    if not prospect.website:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Le prospect ne possède pas de site web"
            ),
        )

    try:
        if not prospect.public_email:
            public_email = find_best_public_email(
                prospect.website
            )

            if public_email:
                prospect.public_email = public_email

        if not prospect.linkedin:
            linkedin = find_company_linkedin(
                prospect.website
            )

            if linkedin:
                prospect.linkedin = linkedin

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Impossible d'analyser le site "
                f"du prospect : {exc}"
            ),
        ) from exc

    collected = CollectedProspect(
        company_name=prospect.company_name,
        country=prospect.country,
        city=prospect.city,
        website=prospect.website,
        linkedin=prospect.linkedin,
        public_email=prospect.public_email,
        public_phone=prospect.public_phone,
        industry=prospect.industry,
        source="enrichment",
    )

    new_score = calculate_prospect_score(
        collected
    )

    prospect.score = new_score

    prospect.priority = calculate_priority(
        new_score
    )

    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    return prospect


@router.post("/enrich/batch")
def enrich_prospects_batch(
    limit: int = 10,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    limit = max(
        1,
        min(limit, 50),
    )

    prospects = prospect_service.get_prospects(
        db,
        skip=0,
        limit=500,
    )

    candidates = [
        prospect
        for prospect in prospects
        if (
            prospect.website
            and (
                not prospect.public_email
                or not prospect.linkedin
            )
        )
    ][:limit]

    enriched = 0
    unchanged = 0
    errors = 0

    for prospect in candidates:
        try:
            changed = False

            if not prospect.public_email:
                public_email = (
                    find_best_public_email(
                        prospect.website
                    )
                )

                if public_email:
                    prospect.public_email = (
                        public_email
                    )
                    changed = True

            if not prospect.linkedin:
                linkedin = find_company_linkedin(
                    prospect.website
                )

                if linkedin:
                    prospect.linkedin = linkedin
                    changed = True

            if not changed:
                unchanged += 1
                continue

            collected = CollectedProspect(
                company_name=prospect.company_name,
                country=prospect.country,
                city=prospect.city,
                website=prospect.website,
                linkedin=prospect.linkedin,
                public_email=prospect.public_email,
                public_phone=prospect.public_phone,
                industry=prospect.industry,
                source="enrichment",
            )

            score = calculate_prospect_score(
                collected
            )

            prospect.score = score

            prospect.priority = (
                calculate_priority(
                    score
                )
            )

            db.add(prospect)

            enriched += 1

        except Exception:
            errors += 1

    db.commit()

    return {
        "analyzed": len(candidates),
        "enriched": enriched,
        "unchanged": unchanged,
        "errors": errors,
    }


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

    prospect_service.delete_prospect(
        db,
        prospect,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )