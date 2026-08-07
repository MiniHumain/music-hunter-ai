import { useEffect, useState } from "react";
import { getProspects, type Prospect } from "./services/api";

function App() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProspects() {
      try {
        const data = await getProspects();
        setProspects(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur inconnue est survenue"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProspects();
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>🎵 Music Hunter AI</h1>

      <p>
        Prospects enregistrés : <strong>{prospects.length}</strong>
      </p>

      {loading && <p>Chargement des prospects...</p>}

      {error && (
        <p style={{ color: "red" }}>
          Erreur : {error}
        </p>
      )}

      {!loading && !error && prospects.length === 0 && (
        <p>Aucun prospect pour le moment.</p>
      )}

      {!loading && !error && prospects.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Entreprise
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Pays
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Secteur
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Priorité
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Statut
              </th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>
                Score
              </th>
            </tr>
          </thead>

          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id}>
                <td style={{ padding: "0.5rem" }}>
                  {prospect.company_name}
                </td>

                <td style={{ padding: "0.5rem" }}>
                  {prospect.country ?? "—"}
                </td>

                <td style={{ padding: "0.5rem" }}>
                  {prospect.industry ?? "—"}
                </td>

                <td style={{ padding: "0.5rem" }}>
                  {prospect.priority}/5
                </td>

                <td style={{ padding: "0.5rem" }}>
                  {prospect.status}
                </td>

                <td style={{ padding: "0.5rem" }}>
                  {prospect.score}/100
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default App;