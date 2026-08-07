import httpx

from app.collectors.base import (
    BaseCollector,
    CollectedProspect,
)


class WikidataCollector(BaseCollector):
    ENDPOINT = "https://query.wikidata.org/sparql"

    def collect(self) -> list[CollectedProspect]:
        query = """
        SELECT DISTINCT
            ?company
            ?companyLabel
            ?website
            ?countryLabel
        WHERE {
            ?company wdt:P31 wd:Q4830453 ;
                     wdt:P856 ?website .

            OPTIONAL {
                ?company wdt:P17 ?country .
            }

            SERVICE wikibase:label {
                bd:serviceParam wikibase:language "fr,en" .
            }
        }
        LIMIT 20
        """

        headers = {
            "User-Agent": (
                "MusicHunterAIBot/0.1 "
                "(https://github.com/MiniHumain/music-hunter-ai)"
            ),
            "Accept": "application/sparql-results+json",
        }

        response = httpx.get(
            self.ENDPOINT,
            params={
                "query": query,
                "format": "json",
            },
            headers=headers,
            timeout=60.0,
            follow_redirects=True,
        )

        response.raise_for_status()

        data = response.json()

        prospects: list[CollectedProspect] = []

        bindings = (
            data
            .get("results", {})
            .get("bindings", [])
        )

        for item in bindings:
            company_name = (
                item
                .get("companyLabel", {})
                .get("value")
            )

            if not company_name:
                continue

            website = (
                item
                .get("website", {})
                .get("value")
            )

            country = (
                item
                .get("countryLabel", {})
                .get("value")
            )

            prospects.append(
                CollectedProspect(
                    company_name=company_name,
                    country=country,
                    website=website,
                    source="wikidata",
                )
            )

        return prospects