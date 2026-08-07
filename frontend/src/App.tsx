import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createProspect,
  deleteProspect,
  getProspects,
  importProspectsCsv,
  runWikidataCollector,
  updateProspect,
  type CollectorResult,
  type ImportResult,
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
  const [formData, setFormData] =
    useState<ProspectCreate>(initialForm);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] =
    useState<string | null>(null);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportResult | null>(null);

  const [collectorCountry, setCollectorCountry] =
    useState("France");

  const [collectorIndustry, setCollectorIndustry] =
    useState("jeux vidéo");

  const [collectorLimit, setCollectorLimit] =
    useState(20);

  const [collecting, setCollecting] =
    useState(false);

  const [collectorResult, setCollectorResult] =
    useState<CollectorResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProspects()
      .then((data) => {
        if (!cancelled) {
          setProspects(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les prospects."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: prospects.length,

      toContact: prospects.filter(
        (prospect) =>
          prospect.status === "À contacter"
      ).length,

      contacted: prospects.filter(
        (prospect) =>
          prospect.status === "Contacté"
      ).length,

      clients: prospects.filter(
        (prospect) =>
          prospect.status === "Client"
      ).length,
    };
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return prospects;
    }

    return prospects.filter((prospect) =>
      [
        prospect.company_name,
        prospect.country,
        prospect.city,
        prospect.industry,
        prospect.status,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        )
    );
  }, [prospects, search]);

  function updateField<
    K extends keyof ProspectCreate
  >(
    field: K,
    value: ProspectCreate[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setFormData(initialForm);
    setEditingId(null);
    setFormError(null);
    setShowForm(false);
  }

  function handleEdit(prospect: Prospect) {
    setEditingId(prospect.id);

    setFormData({
      company_name: prospect.company_name,
      country: prospect.country ?? "",
      city: prospect.city ?? "",
      website: prospect.website ?? "",
      linkedin: prospect.linkedin ?? "",
      public_email: prospect.public_email ?? "",
      public_phone: prospect.public_phone ?? "",
      industry: prospect.industry ?? "",
      priority: prospect.priority,
      status: prospect.status,
      score: prospect.score,
    });

    setFormError(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(
    prospect: Prospect
  ) {
    const confirmed = window.confirm(
      `Supprimer "${prospect.company_name}" ?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);

      await deleteProspect(prospect.id);

      setProspects((current) =>
        current.filter(
          (item) =>
            item.id !== prospect.id
        )
      );

      if (editingId === prospect.id) {
        resetForm();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de supprimer le prospect."
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const companyName =
      formData.company_name.trim();

    if (!companyName) {
      setFormError(
        "Le nom de l’entreprise est obligatoire."
      );

      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const cleanData: ProspectCreate = {
        ...formData,
        company_name: companyName,
      };

      if (editingId !== null) {
        const updated =
          await updateProspect(
            editingId,
            cleanData
          );

        setProspects((current) =>
          current.map((prospect) =>
            prospect.id === editingId
              ? updated
              : prospect
          )
        );
      } else {
        const created =
          await createProspect(
            cleanData
          );

        setProspects((current) => [
          created,
          ...current,
        ]);
      }

      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Impossible d’enregistrer le prospect."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFileImport(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);
      setError(null);

      const result =
        await importProspectsCsv(file);

      setImportResult(result);

      const refreshed =
        await getProspects();

      setProspects(refreshed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’importer le fichier."
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function handleCollectorSearch() {
    try {
      setCollecting(true);
      setCollectorResult(null);
      setError(null);

      const result =
        await runWikidataCollector({
          country: collectorCountry,
          industry: collectorIndustry,
          limit: collectorLimit,
        });

      setCollectorResult(result);

      const refreshed =
        await getProspects();

      setProspects(refreshed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de rechercher des prospects."
      );
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <h1 className="brand">
            Music Hunter AI
          </h1>

          <p className="brand-subtitle">
            Prospection musicale
          </p>
        </div>

        <nav className="navigation">
          <button className="nav-item active">
            Dashboard
          </button>

          <button className="nav-item">
            Prospects
          </button>

          <button className="nav-item">
            Campagnes
          </button>

          <button className="nav-item">
            Statistiques
          </button>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              CRM
            </p>

            <h2>
              Dashboard
            </h2>

            <p className="subtitle">
              Pilote ta prospection et transforme
              les opportunités en clients.
            </p>
          </div>

          <div className="topbar-actions">
            <label className="secondary-button import-button">
              {importing
                ? "Import en cours..."
                : "Importer CSV / Excel"}

              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileImport}
                disabled={importing}
                hidden
              />
            </label>

            <button
              className="primary-button"
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
            >
              {showForm
                ? "Fermer"
                : "+ Ajouter un prospect"}
            </button>
          </div>
        </header>

        {importResult && (
          <div className="import-result">
            <strong>
              Import terminé :
            </strong>{" "}
            {importResult.imported} importé
            {importResult.imported !== 1
              ? "s"
              : ""}{" "}
            · {importResult.duplicates} doublon
            {importResult.duplicates !== 1
              ? "s"
              : ""}{" "}
            · {importResult.ignored} ignoré
            {importResult.ignored !== 1
              ? "s"
              : ""}
          </div>
        )}

        <section className="panel collector-panel">
          <div className="panel-header">
            <div>
              <h3>
                Rechercher des prospects
              </h3>

              <p>
                Recherche des entreprises via Wikidata.
              </p>
            </div>
          </div>

          <div className="collector-form">
            <label>
              Pays

              <select
                value={collectorCountry}
                onChange={(event) =>
                  setCollectorCountry(
                    event.target.value
                  )
                }
              >
                <option value="France">
                  France
                </option>

                <option value="Canada">
                  Canada
                </option>

                <option value="Royaume-Uni">
                  Royaume-Uni
                </option>

                <option value="Allemagne">
                  Allemagne
                </option>

                <option value="Espagne">
                  Espagne
                </option>

                <option value="Italie">
                  Italie
                </option>

                <option value="États-Unis">
                  États-Unis
                </option>

                <option value="Belgique">
                  Belgique
                </option>

                <option value="Suisse">
                  Suisse
                </option>
              </select>
            </label>

            <label>
              Secteur

              <select
                value={collectorIndustry}
                onChange={(event) =>
                  setCollectorIndustry(
                    event.target.value
                  )
                }
              >
                <option value="jeux vidéo">
                  Jeux vidéo
                </option>

                <option value="publicité">
                  Publicité
                </option>

                <option value="cinéma">
                  Cinéma
                </option>

                <option value="musique">
                  Musique
                </option>
              </select>
            </label>

            <label>
              Nombre de résultats

              <input
                type="number"
                min={1}
                max={200}
                value={collectorLimit}
                onChange={(event) =>
                  setCollectorLimit(
                    Number(
                      event.target.value
                    )
                  )
                }
              />
            </label>

            <div className="collector-action">
              <button
                className="primary-button"
                type="button"
                onClick={handleCollectorSearch}
                disabled={collecting}
              >
                {collecting
                  ? "Recherche en cours..."
                  : "Rechercher"}
              </button>
            </div>
          </div>

          {collectorResult && (
            <div className="collector-result">
              <strong>
                Recherche terminée :
              </strong>{" "}
              {collectorResult.collected} trouvé
              {collectorResult.collected !== 1
                ? "s"
                : ""}{" "}
              · {collectorResult.imported} nouveau
              {collectorResult.imported !== 1
                ? "x"
                : ""}{" "}
              · {collectorResult.duplicates} doublon
              {collectorResult.duplicates !== 1
                ? "s"
                : ""}{" "}
              · {collectorResult.ignored} ignoré
              {collectorResult.ignored !== 1
                ? "s"
                : ""}
            </div>
          )}
        </section>

        {showForm && (
          <section className="panel prospect-form-panel">
            <div className="panel-header">
              <div>
                <h3>
                  {editingId !== null
                    ? "Modifier le prospect"
                    : "Nouveau prospect"}
                </h3>

                <p>
                  {editingId !== null
                    ? "Modifie les informations du prospect."
                    : "Ajoute une entreprise à ton CRM."}
                </p>
              </div>
            </div>

            <form
              className="prospect-form"
              onSubmit={handleSubmit}
            >
              <label>
                Entreprise *

                <input
                  value={
                    formData.company_name
                  }
                  onChange={(event) =>
                    updateField(
                      "company_name",
                      event.target.value
                    )
                  }
                  placeholder="Ex. Studio Nova"
                />
              </label>

              <label>
                Pays

                <input
                  value={
                    formData.country ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "country",
                      event.target.value
                    )
                  }
                  placeholder="France"
                />
              </label>

              <label>
                Ville

                <input
                  value={
                    formData.city ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value
                    )
                  }
                  placeholder="Paris"
                />
              </label>

              <label>
                Secteur

                <input
                  value={
                    formData.industry ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "industry",
                      event.target.value
                    )
                  }
                  placeholder="Jeux vidéo"
                />
              </label>

              <label>
                Site web

                <input
                  value={
                    formData.website ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "website",
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label>
                LinkedIn

                <input
                  value={
                    formData.linkedin ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "linkedin",
                      event.target.value
                    )
                  }
                  placeholder="https://linkedin.com/..."
                />
              </label>

              <label>
                Email public

                <input
                  type="email"
                  value={
                    formData.public_email ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "public_email",
                      event.target.value
                    )
                  }
                  placeholder="contact@entreprise.com"
                />
              </label>

              <label>
                Téléphone public

                <input
                  value={
                    formData.public_phone ?? ""
                  }
                  onChange={(event) =>
                    updateField(
                      "public_phone",
                      event.target.value
                    )
                  }
                  placeholder="+33..."
                />
              </label>

              <label>
                Priorité

                <select
                  value={
                    formData.priority ?? 3
                  }
                  onChange={(event) =>
                    updateField(
                      "priority",
                      Number(
                        event.target.value
                      )
                    )
                  }
                >
                  <option value={1}>
                    1 - Faible
                  </option>

                  <option value={2}>
                    2
                  </option>

                  <option value={3}>
                    3 - Moyenne
                  </option>

                  <option value={4}>
                    4
                  </option>

                  <option value={5}>
                    5 - Haute
                  </option>
                </select>
              </label>

              <label>
                Statut

                <select
                  value={
                    formData.status ??
                    "À contacter"
                  }
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value
                    )
                  }
                >
                  <option value="À contacter">
                    À contacter
                  </option>

                  <option value="Contacté">
                    Contacté
                  </option>

                  <option value="Répondu">
                    Répondu
                  </option>

                  <option value="Client">
                    Client
                  </option>
                </select>
              </label>

              <label>
                Score

                <input
                  type="number"
                  min={0}
                  max={100}
                  value={
                    formData.score ?? 0
                  }
                  onChange={(event) =>
                    updateField(
                      "score",
                      Number(
                        event.target.value
                      )
                    )
                  }
                />
              </label>

              {formError && (
                <p className="form-error">
                  {formError}
                </p>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId !== null
                      ? "Enregistrer les modifications"
                      : "Créer le prospect"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="stats-grid">
          <StatCard
            label="Prospects"
            value={stats.total}
          />

          <StatCard
            label="À contacter"
            value={stats.toContact}
          />

          <StatCard
            label="Contactés"
            value={stats.contacted}
          />

          <StatCard
            label="Clients"
            value={stats.clients}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>
                Prospects
              </h3>

              <p>
                {filteredProspects.length} résultat
                {filteredProspects.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <input
              className="search-input"
              type="search"
              placeholder="Rechercher une entreprise..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          {loading && (
            <div className="message">
              Chargement des prospects...
            </div>
          )}

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            filteredProspects.length === 0 && (
              <div className="message">
                Aucun prospect trouvé.
              </div>
            )}

          {!loading &&
            !error &&
            filteredProspects.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>
                        Entreprise
                      </th>

                      <th>
                        Pays
                      </th>

                      <th>
                        Secteur
                      </th>

                      <th>
                        Priorité
                      </th>

                      <th>
                        Statut
                      </th>

                      <th>
                        Score
                      </th>

                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProspects.map(
                      (prospect) => (
                        <tr key={prospect.id}>
                          <td>
                            <strong>
                              {
                                prospect.company_name
                              }
                            </strong>

                            <span className="secondary-text">
                              {prospect.city ??
                                "Ville inconnue"}
                            </span>
                          </td>

                          <td>
                            {prospect.country ??
                              "—"}
                          </td>

                          <td>
                            {prospect.industry ??
                              "—"}
                          </td>

                          <td>
                            <span className="priority">
                              {
                                prospect.priority
                              }
                              /5
                            </span>
                          </td>

                          <td>
                            <span className="status">
                              {
                                prospect.status
                              }
                            </span>
                          </td>

                          <td>
                            <strong>
                              {
                                prospect.score
                              }
                            </strong>
                            /100
                          </td>

                          <td>
                            <div className="actions">
                              <button
                                className="edit-button"
                                onClick={() =>
                                  handleEdit(
                                    prospect
                                  )
                                }
                              >
                                Modifier
                              </button>

                              <button
                                className="delete-button"
                                onClick={() =>
                                  handleDelete(
                                    prospect
                                  )
                                }
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
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
      <p>
        {label}
      </p>

      <strong>
        {value}
      </strong>
    </article>
  );
}

export default App;