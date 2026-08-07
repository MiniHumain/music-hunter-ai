import httpx

from app.collectors.base import (
    BaseCollector,
    CollectedProspect,
)


COUNTRY_IDS = {
    "france": "Q142",
    "canada": "Q16",
    "royaume-uni": "Q145",
    "royaume uni": "Q145",
    "united kingdom": "Q145",
    "allemagne": "Q183",
    "germany": "Q183",
    "espagne": "Q29",
    "spain": "Q29",
    "italie": "Q38",
    "italy": "Q38",
    "états-unis": "Q30",
    "etats-unis": "Q30",
    "united states": "Q30",
    "usa": "Q30",
    "belgique": "Q31",
    "belgium": "Q31",
    "suisse": "Q39",
    "switzerland": "Q39",
}


INDUSTRY_IDS = {
    "jeux vidéo": "Q941594",
    "jeux video": "Q941594",
    "video games": "Q941594",
    "musique": "Q638",
    "music": "Q638",
    "cinéma": "Q190117",
    "cinema": "Q190117",
    "audiovisuel": "Q2431196",
    "publicité": "Q37038",
    "publicite": "Q37038",
    "advertising": "Q37038",
    "marketing": "Q39809",
    "technologie": "Q11016",
    "technology": "Q11016",
}


class WikidataCollector(BaseCollector):
    ENDPOINT = "https://query.wikidata.org/sparql"

    def __init__(
        self,
        country: str | None = None,
        industry: str | None = None,
        limit: int = 20,
    ) -> None:
        self.country = country
        self.industry = industry
        self.limit = max(1, min(limit, 200))

    def collect(self) -> list[CollectedProspect]:
        country_clause = ""
        industry_clause = ""

        if self.country:
            country_key = self.country.strip().lower()
            country_id = COUNTRY_IDS.get(country_key)

            if country_id:
                country_clause = (
                    f"?company wdt:P17 wd:{country_id} ."
                )

        if self.industry:
            industry_key = self.industry.strip().lower()
            industry_id = INDUSTRY_IDS.get(industry_key)

            if industry_id:
                industry_clause = (
                    f"?company wdt:P452 wd:{industry_id} ."
                )

        query = f"""
        SELECT DISTINCT
            ?company
            ?companyLabel
            ?website
            ?countryLabel
        WHERE {{
            ?company wdt:P31 wd:Q4830453 ;
                     wdt:P856 ?website .

            {country_clause}
            {industry_clause}

            OPTIONAL {{
                ?company wdt:P17 ?country .
            }}

            SERVICE wikibase:label {{
                bd:serviceParam wikibase:language "fr,en" .
            }}
        }}
        LIMIT {self.limit}
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
                    industry=self.industry,
                    source="wikidata",
                )
            )

        return prospects