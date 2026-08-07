from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.collectors.mock_collector import MockCollector
from app.db.database import get_db
from app.services.collector_service import run_collector
from app.collectors.wikidata_collector import WikidataCollector

router = APIRouter(
    prefix="/collectors",
    tags=["Collectors"],
)


@router.post("/mock/run")
def run_mock_collector(
    db: Session = Depends(get_db),
) -> dict[str, int]:
    collector = MockCollector()

    return run_collector(
        db,
        collector,
    )
@router.post("/wikidata/run")
def run_wikidata_collector(
    country: str | None = None,
    industry: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> dict[str, int]:
    collector = WikidataCollector(
        country=country,
        industry=industry,
        limit=limit,
    )

    return run_collector(
        db,
        collector,
    )