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

export async function getProspects(): Promise<Prospect[]> {
  const response = await fetch(`${API_URL}/prospects`);

  if (!response.ok) {
    throw new Error(`Erreur API : ${response.status}`);
  }

  return response.json();
}

export async function createProspect(
  data: ProspectCreate
): Promise<Prospect> {
  const response = await fetch(`${API_URL}/prospects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erreur création prospect : ${response.status} ${errorBody}`
    );
  }

  return response.json();
}
export interface ProspectUpdate {
  company_name?: string;
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

export async function updateProspect(
  id: number,
  data: ProspectUpdate
): Promise<Prospect> {
  const response = await fetch(`${API_URL}/prospects/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erreur modification prospect : ${response.status} ${errorBody}`
    );
  }

  return response.json();
}

export async function deleteProspect(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prospects/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erreur suppression prospect : ${response.status} ${errorBody}`
    );
  }
}
export interface ImportResult {
  collected: number;
  imported: number;
  duplicates: number;
  ignored: number;
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

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erreur import CSV : ${response.status} ${errorBody}`
    );
  }

  return response.json();
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

export async function runWikidataCollector(
  search: CollectorSearch
): Promise<CollectorResult> {
  const params = new URLSearchParams();

  if (search.country) {
    params.set("country", search.country);
  }

  if (search.industry) {
    params.set("industry", search.industry);
  }

  params.set("limit", String(search.limit));

  const response = await fetch(
    `${API_URL}/collectors/wikidata/run?${params.toString()}`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Erreur collecte : ${response.status} ${errorBody}`
    );
  }

  return response.json();
}