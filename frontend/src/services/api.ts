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