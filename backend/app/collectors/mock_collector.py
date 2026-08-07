from app.collectors.base import (
    BaseCollector,
    CollectedProspect,
)


class MockCollector(BaseCollector):
    def collect(self) -> list[CollectedProspect]:
        return [
            CollectedProspect(
                company_name="Aurora Games",
                country="France",
                city="Paris",
                website="https://aurora-games.example",
                public_email="contact@aurora-games.example",
                industry="Jeux vidéo",
                source="mock",
            ),
            CollectedProspect(
                company_name="Northlight Studios",
                country="Canada",
                city="Montreal",
                website="https://northlight.example",
                public_email="hello@northlight.example",
                industry="Production audiovisuelle",
                source="mock",
            ),
            CollectedProspect(
                company_name="Blue Wave Agency",
                country="Royaume-Uni",
                city="Londres",
                website="https://bluewave.example",
                industry="Publicité",
                source="mock",
            ),
        ]