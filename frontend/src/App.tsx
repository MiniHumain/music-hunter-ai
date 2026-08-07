import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProspect,
  getProspects,
  type Prospect,
  type ProspectCreate,
} from "./services/api";
import "./App.css";

const initialForm: ProspectCreate = {
  company_name: "",
  country: "",
  city: "",
  website: "",
  linkedin: "",
  public_email: "",
  public_phone: "",
  industry: "",
  priority: 3,
  status: "À contacter",
  score: 0,
};

function App() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProspectCreate>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadProspects() {
    try {
      setError(null);
      const data = await getProspects();
      setProspects(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les prospects."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProspects();
  }, []);

  const stats = useMemo(() => {
    return {
      total: prospects.length,
      toContact: prospects.filter(
        (prospect) => prospect.status === "À contacter"
      ).length,
      contacted: prospects.filter(
        (prospect) => prospect.status === "Contacté"
      ).length,
      clients: prospects.filter(
        (prospect) => prospect.status === "Client"
      ).length,
    };
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return prospects;

    return prospects.filter((prospect) =>
      [
        prospect.company_name,
        prospect.country,
        prospect.city,
        prospect.industry,
        prospect.status,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [prospects, search]);

  function updateField<K extends keyof ProspectCreate>(
    field: K,
    value: ProspectCreate[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.company_name.trim()) {
      setFormError("Le nom de l’entreprise est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const created = await createProspect({
        ...formData,
        company_name: formData.company_name.trim(),
      });

      setProspects((current) => [created, ...current]);
      setFormData(initialForm);
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le prospect."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h1 className="brand">Music Hunter AI</h1>
          <p className="brand-subtitle">Prospection musicale</p>
        </div>

        <nav className="navigation">
          <button className="nav-item active">Dashboard</button>
          <button className="nav-item">Prospects</button>
          <button className="nav-item">Campagnes</button>
          <button className="nav-item">Statistiques</button>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">CRM</p>
            <h2>Dashboard</h2>
            <p className="subtitle">
              Pilote ta prospection et transforme les opportunités en clients.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => setShowForm((current) => !current)}
          >
            {showForm ? "Fermer" : "+ Ajouter un prospect"}
          </button>
        </header>

        {showForm && (
          <section className="panel prospect-form-panel">
            <div className="panel-header">
              <div>
                <h3>Nouveau prospect</h3>
                <p>Ajoute une entreprise à ton CRM.</p>
              </div>
            </div>

            <form className="prospect-form" onSubmit={handleSubmit}>
              <label>
                Entreprise *
                <input
                  value={formData.company_name}
                  onChange={(event) =>
                    updateField("company_name", event.target.value)
                  }
                  placeholder="Ex. Studio Nova"
                />
              </label>

              <label>
                Pays
                <input
                  value={formData.country ?? ""}
                  onChange={(event) =>
                    updateField("country", event.target.value)
                  }
                  placeholder="France"
                />
              </label>

              <label>
                Ville
                <input
                  value={formData.city ?? ""}
                  onChange={(event) =>
                    updateField("city", event.target.value)
                  }
                  placeholder="Paris"
                />
              </label>

              <label>
                Secteur
                <input
                  value={formData.industry ?? ""}
                  onChange={(event) =>
                    updateField("industry", event.target.value)
                  }
                  placeholder="Jeux vidéo"
                />
              </label>

              <label>
                Site web
                <input
                  value={formData.website ?? ""}
                  onChange={(event) =>
                    updateField("website", event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>

              <label>
                Email public
                <input
                  type="email"
                  value={formData.public_email ?? ""}
                  onChange={(event) =>
                    updateField("public_email", event.target.value)
                  }
                  placeholder="contact@entreprise.com"
                />
              </label>

              <label>
                Priorité
                <select
                  value={formData.priority ?? 3}
                  onChange={(event) =>
                    updateField("priority", Number(event.target.value))
                  }
                >
                  <option value={1}>1 - Faible</option>
                  <option value={2}>2</option>
                  <option value={3}>3 - Moyenne</option>
                  <option value={4}>4</option>
                  <option value={5}>5 - Haute</option>
                </select>
              </label>

              <label>
                Statut
                <select
                  value={formData.status ?? "À contacter"}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                >
                  <option value="À contacter">À contacter</option>
                  <option value="Contacté">Contacté</option>
                  <option value="Répondu">Répondu</option>
                  <option value="Client">Client</option>
                </select>
              </label>

              {formError && (
                <p className="form-error">{formError}</p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? "Enregistrement..." : "Créer le prospect"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="stats-grid">
          <StatCard label="Prospects" value={stats.total} />
          <StatCard label="À contacter" value={stats.toContact} />
          <StatCard label="Contactés" value={stats.contacted} />
          <StatCard label="Clients" value={stats.clients} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Prospects</h3>
              <p>
                {filteredProspects.length} résultat
                {filteredProspects.length !== 1 ? "s" : ""}
              </p>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading && (
            <div className="message">Chargement des prospects...</div>
          )}

          {error && <div className="message error">{error}</div>}

          {!loading && !error && filteredProspects.length === 0 && (
            <div className="message">Aucun prospect trouvé.</div>
          )}

          {!loading && !error && filteredProspects.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Entreprise</th>
                    <th>Pays</th>
                    <th>Secteur</th>
                    <th>Priorité</th>
                    <th>Statut</th>
                    <th>Score</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProspects.map((prospect) => (
                    <tr key={prospect.id}>
                      <td>
                        <strong>{prospect.company_name}</strong>
                        <span className="secondary-text">
                          {prospect.city ?? "Ville inconnue"}
                        </span>
                      </td>

                      <td>{prospect.country ?? "—"}</td>
                      <td>{prospect.industry ?? "—"}</td>

                      <td>
                        <span className="priority">
                          {prospect.priority}/5
                        </span>
                      </td>

                      <td>
                        <span className="status">
                          {prospect.status}
                        </span>
                      </td>

                      <td>
                        <strong>{prospect.score}</strong>/100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default App;