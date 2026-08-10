const API_URL = "http://127.0.0.1:8000/api/v1";

export interface Prospect {
  id: number;
  company_name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  linkedin: string | null;
  public_email: string | null;
  public_phone: string | null;
  industry: string | null;
  priority: number;
  status: string;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface ProspectCreate {
  company_name: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  linkedin?: string | null;
  public_email?: string | null;
  public_phone?: string | null;
  industry?: string | null;
  priority?: number;
  status?: string;
  score?: number;
}

export type ProspectUpdate =
  Partial<ProspectCreate>;

export interface ImportResult {
  collected: number;
  imported: number;
  duplicates: number;
  ignored: number;
}

export interface CollectorResult {
  collected: number;
  imported: number;
  duplicates: number;
  ignored: number;
}

export interface CollectorSearch {
  country: string;
  industry: string;
  limit: number;
}

export interface BatchEnrichmentResult {
  analyzed: number;
  enriched: number;
  unchanged: number;
  errors: number;
}

export interface ScoreRecalculationResult {
  analyzed: number;
  updated: number;
}

export interface OutreachMessageCreate {
  prospect_id: number;
  subject: string;
  body: string;
}

export interface OutreachMessageUpdate {
  subject?: string;
  body?: string;
  status?: string;
}

export interface OutreachMessage {
  id: number;
  prospect_id: number;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedOutreachDraft {
  subject: string;
  body: string;
}

async function ensureOk(
  response: Response,
  label: string
): Promise<Response> {
  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `${label} : ${response.status} ${errorBody}`
    );
  }

  return response;
}

export async function getProspects():
  Promise<Prospect[]> {
  const response = await fetch(
    `${API_URL}/prospects`
  );

  return (
    await ensureOk(
      response,
      "Erreur API"
    )
  ).json();
}

export async function createProspect(
  data: ProspectCreate
): Promise<Prospect> {
  const response = await fetch(
    `${API_URL}/prospects`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur création prospect"
    )
  ).json();
}

export async function updateProspect(
  id: number,
  data: ProspectUpdate
): Promise<Prospect> {
  const response = await fetch(
    `${API_URL}/prospects/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur modification prospect"
    )
  ).json();
}

export async function deleteProspect(
  id: number
): Promise<void> {
  const response = await fetch(
    `${API_URL}/prospects/${id}`,
    {
      method: "DELETE",
    }
  );

  await ensureOk(
    response,
    "Erreur suppression prospect"
  );
}

export async function importProspectsCsv(
  file: File
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_URL}/prospects/import`,
    {
      method: "POST",
      body: formData,
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur import CSV"
    )
  ).json();
}

export async function runWikidataCollector(
  search: CollectorSearch
): Promise<CollectorResult> {
  const params = new URLSearchParams();

  if (search.country) {
    params.set(
      "country",
      search.country
    );
  }

  if (search.industry) {
    params.set(
      "industry",
      search.industry
    );
  }

  params.set(
    "limit",
    String(search.limit)
  );

  const response = await fetch(
    `${API_URL}/collectors/wikidata/run?${params.toString()}`,
    {
      method: "POST",
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur collecte"
    )
  ).json();
}

export async function enrichProspectsBatch(
  limit: number
): Promise<BatchEnrichmentResult> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const response = await fetch(
    `${API_URL}/prospects/enrich/batch?${params.toString()}`,
    {
      method: "POST",
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur enrichissement"
    )
  ).json();
}

export async function recalculateProspectScores():
  Promise<ScoreRecalculationResult> {
  const response = await fetch(
    `${API_URL}/prospects/recalculate-scores`,
    {
      method: "POST",
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur recalcul des scores"
    )
  ).json();
}

export async function createOutreachMessage(
  data: OutreachMessageCreate
): Promise<OutreachMessage> {
  const response = await fetch(
    `${API_URL}/outreach-messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur création brouillon"
    )
  ).json();
}

export async function getOutreachMessages(
  prospectId?: number
): Promise<OutreachMessage[]> {
  const params = new URLSearchParams();

  if (prospectId !== undefined) {
    params.set(
      "prospect_id",
      String(prospectId)
    );
  }

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/outreach-messages${
      query ? `?${query}` : ""
    }`
  );

  return (
    await ensureOk(
      response,
      "Erreur chargement brouillons"
    )
  ).json();
}

export async function generateOutreachDraft(
  prospectId: number
): Promise<GeneratedOutreachDraft> {
  const response = await fetch(
    `${API_URL}/outreach-messages/generate/${prospectId}`,
    {
      method: "POST",
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur génération brouillon"
    )
  ).json();
}

export async function updateOutreachMessage(
  messageId: number,
  data: OutreachMessageUpdate
): Promise<OutreachMessage> {
  const response = await fetch(
    `${API_URL}/outreach-messages/${messageId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return (
    await ensureOk(
      response,
      "Erreur modification brouillon"
    )
  ).json();
}

export async function deleteOutreachMessage(
  messageId: number
): Promise<void> {
  const response = await fetch(
    `${API_URL}/outreach-messages/${messageId}`,
    {
      method: "DELETE",
    }
  );

  await ensureOk(
    response,
    "Erreur suppression brouillon"
  );
}