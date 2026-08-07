from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class CollectedProspect:
    company_name: str
    country: str | None = None
    city: str | None = None
    website: str | None = None
    linkedin: str | None = None
    public_email: str | None = None
    public_phone: str | None = None
    industry: str | None = None
    source: str | None = None


class BaseCollector(ABC):
    @abstractmethod
    def collect(self) -> list[CollectedProspect]:
        """Collecte et retourne des prospects."""
        raise NotImplementedError