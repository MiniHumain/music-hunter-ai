import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createOutreachMessage,
  createProspect,
  deleteProspect,
  enrichProspectsBatch,
  getProspects,
  importProspectsCsv,
  recalculateProspectScores,
  runWikidataCollector,
  updateProspect,
  type BatchEnrichmentResult,
  type ScoreRecalculationResult,
  type CollectorResult,
  type ImportResult,
  type OutreachMessage,
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
  const [filterCountry, setFilterCountry] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmail, setFilterEmail] = useState<"all" | "with">("all");
  const [minimumScore, setMinimumScore] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "priority" | "name">("score");
  const [enrichmentLimit, setEnrichmentLimit] = useState(10);

  const [enriching, setEnriching] = useState(false);

  const [enrichmentResult, setEnrichmentResult] =
  useState<BatchEnrichmentResult | null>(null);

  const [recalculatingScores, setRecalculatingScores] =
    useState(false);

  const [scoreRecalculationResult, setScoreRecalculationResult] =
    useState<ScoreRecalculationResult | null>(null);

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

  const [messageProspect, setMessageProspect] =
    useState<Prospect | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);
  const [messageError, setMessageError] =
    useState<string | null>(null);
  const [savedMessage, setSavedMessage] =
    useState<OutreachMessage | null>(null);

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

  const availableCountries = useMemo(() => {
    return Array.from(
      new Set(
        prospects
          .map((prospect) => prospect.country)
          .filter((country): country is string => Boolean(country))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  const availableIndustries = useMemo(() => {
    return Array.from(
      new Set(
        prospects
          .map((prospect) => prospect.industry)
          .filter((industry): industry is string => Boolean(industry))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    const query = search.toLowerCase().trim();

    const filtered = prospects.filter((prospect) => {
      const matchesSearch =
        !query ||
        [
          prospect.company_name,
          prospect.country,
          prospect.city,
          prospect.industry,
          prospect.status,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesCountry =
        !filterCountry || prospect.country === filterCountry;
      const matchesIndustry =
        !filterIndustry || prospect.industry === filterIndustry;
      const matchesStatus =
        !filterStatus || prospect.status === filterStatus;
      const matchesEmail =
        filterEmail === "all" || Boolean(prospect.public_email?.trim());
      const matchesScore = prospect.score >= minimumScore;

      return (
        matchesSearch &&
        matchesCountry &&
        matchesIndustry &&
        matchesStatus &&
        matchesEmail &&
        matchesScore
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "priority") return b.priority - a.priority;
      return a.company_name.localeCompare(b.company_name);
    });
  }, [
    prospects,
    search,
    filterCountry,
    filterIndustry,
    filterStatus,
    filterEmail,
    minimumScore,
    sortBy,
  ]);

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

  async function handleBatchEnrichment() {
  try {
    setEnriching(true);
    setEnrichmentResult(null);
    setError(null);

    const result = await enrichProspectsBatch(
      enrichmentLimit
    );

    setEnrichmentResult(result);

    const refreshed = await getProspects();
    setProspects(refreshed);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Impossible d’enrichir les prospects."
    );
  } finally {
    setEnriching(false);
  }
}

  async function handleScoreRecalculation() {
    try {
      setRecalculatingScores(true);
      setScoreRecalculationResult(null);
      setError(null);

      const result =
        await recalculateProspectScores();

      setScoreRecalculationResult(result);

      const refreshed = await getProspects();
      setProspects(refreshed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de recalculer les scores."
      );
    } finally {
      setRecalculatingScores(false);
    }
  }

  function openMessageComposer(prospect: Prospect) {
    setMessageProspect(prospect);
    setMessageSubject(
      `Collaboration musicale - ${prospect.company_name}`
    );
    setMessageBody(
      `Bonjour,

Je vous contacte au sujet d’une possible collaboration musicale avec ${prospect.company_name}.

Je serais ravi d’échanger avec vous pour voir s’il existe des opportunités de collaboration autour de vos projets.

Bien cordialement`
    );
    setMessageError(null);
    setSavedMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeMessageComposer() {
    setMessageProspect(null);
    setMessageSubject("");
    setMessageBody("");
    setMessageError(null);
    setSavedMessage(null);
  }

  async function handleMessageSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!messageProspect) {
      return;
    }

    const subject = messageSubject.trim();
    const body = messageBody.trim();

    if (!subject || !body) {
      setMessageError(
        "Le sujet et le message sont obligatoires."
      );
      return;
    }

    try {
      setSavingMessage(true);
      setMessageError(null);

      const created = await createOutreachMessage({
        prospect_id: messageProspect.id,
        subject,
        body,
      });

      setSavedMessage(created);
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Impossible d’enregistrer le brouillon."
      );
    } finally {
      setSavingMessage(false);
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
        <section className="panel enrichment-panel">
  <div className="panel-header">
    <div>
      <h3>Enrichir les prospects</h3>

      <p>
        Recherche des emails professionnels publics
        sur les sites des prospects.
      </p>
    </div>
  </div>

  <div className="collector-form">
    <label>
      Nombre de prospects

      <input
        type="number"
        min={1}
        max={50}
        value={enrichmentLimit}
        onChange={(event) =>
          setEnrichmentLimit(
            Number(event.target.value)
          )
        }
      />
    </label>

    <div className="collector-action">
      <button
        className="primary-button"
        type="button"
        onClick={handleBatchEnrichment}
        disabled={enriching}
      >
        {enriching
          ? "Enrichissement en cours..."
          : "Enrichir les prospects"}
      </button>
    </div>
  </div>

  {enrichmentResult && (
    <div className="collector-result">
      <strong>
        Enrichissement terminé :
      </strong>{" "}
      {enrichmentResult.analyzed} analysé
      {enrichmentResult.analyzed !== 1 ? "s" : ""} ·{" "}
      {enrichmentResult.enriched} enrichi
      {enrichmentResult.enriched !== 1 ? "s" : ""} ·{" "}
      {enrichmentResult.unchanged} inchangé
      {enrichmentResult.unchanged !== 1 ? "s" : ""} ·{" "}
      {enrichmentResult.errors} erreur
      {enrichmentResult.errors !== 1 ? "s" : ""}
    </div>
  )}
</section>

        <section className="panel score-recalculation-panel">
          <div className="panel-header">
            <div>
              <h3>Recalculer les scores</h3>

              <p>
                Applique la grille de scoring actuelle à tous les prospects.
              </p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={handleScoreRecalculation}
              disabled={recalculatingScores}
            >
              {recalculatingScores
                ? "Recalcul en cours..."
                : "Recalculer les scores"}
            </button>
          </div>

          {scoreRecalculationResult && (
            <div className="collector-result">
              <strong>
                Recalcul terminé :
              </strong>{" "}
              {scoreRecalculationResult.analyzed} analysé
              {scoreRecalculationResult.analyzed !== 1 ? "s" : ""} ·{" "}
              {scoreRecalculationResult.updated} mis à jour
            </div>
          )}
        </section>

        {messageProspect && (
          <section className="panel prospect-form-panel">
            <div className="panel-header">
              <div>
                <h3>Préparer un message</h3>
                <p>
                  Brouillon pour {messageProspect.company_name}
                  {messageProspect.public_email
                    ? ` · ${messageProspect.public_email}`
                    : ""}
                </p>
              </div>
            </div>

            <form
              className="prospect-form"
              onSubmit={handleMessageSubmit}
            >
              <label>
                Sujet
                <input
                  value={messageSubject}
                  onChange={(event) =>
                    setMessageSubject(event.target.value)
                  }
                  placeholder="Objet du message"
                />
              </label>

              <label>
                Message
                <textarea
                  value={messageBody}
                  onChange={(event) =>
                    setMessageBody(event.target.value)
                  }
                  rows={10}
                  placeholder="Rédige ton message..."
                />
              </label>

              {messageError && (
                <p className="form-error">
                  {messageError}
                </p>
              )}

              {savedMessage && (
                <div className="import-result">
                  <strong>Brouillon enregistré.</strong>{" "}
                  ID #{savedMessage.id} · statut {savedMessage.status}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeMessageComposer}
                >
                  Fermer
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingMessage}
                >
                  {savingMessage
                    ? "Enregistrement..."
                    : "Enregistrer le brouillon"}
                </button>
              </div>
            </form>
          </section>
        )}

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

          <div className="filters-grid">
            <label>
              Pays
              <select
                value={filterCountry}
                onChange={(event) => setFilterCountry(event.target.value)}
              >
                <option value="">Tous</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Secteur
              <select
                value={filterIndustry}
                onChange={(event) => setFilterIndustry(event.target.value)}
              >
                <option value="">Tous</option>
                {availableIndustries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Statut
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">Tous</option>
                <option value="À contacter">À contacter</option>
                <option value="Contacté">Contacté</option>
                <option value="Répondu">Répondu</option>
                <option value="Client">Client</option>
              </select>
            </label>

            <label>
              Email
              <select
                value={filterEmail}
                onChange={(event) =>
                  setFilterEmail(event.target.value as "all" | "with")
                }
              >
                <option value="all">Tous</option>
                <option value="with">Avec email</option>
              </select>
            </label>

            <label>
              Score minimum
              <input
                type="number"
                min={0}
                max={100}
                value={minimumScore}
                onChange={(event) =>
                  setMinimumScore(Number(event.target.value))
                }
              />
            </label>

            <label>
              Trier par
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as "score" | "priority" | "name"
                  )
                }
              >
                <option value="score">Score</option>
                <option value="priority">Priorité</option>
                <option value="name">Nom</option>
              </select>
            </label>

            <div className="filter-reset">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch("");
                  setFilterCountry("");
                  setFilterIndustry("");
                  setFilterStatus("");
                  setFilterEmail("all");
                  setMinimumScore(0);
                  setSortBy("score");
                }}
              >
                Réinitialiser
              </button>
            </div>
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
                        Site web
                      </th>

                      <th>
                        LinkedIn
                      </th>

                      <th>
                        Email public
                      </th>

                      

                      <th>
                        Contact
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
                            {prospect.website ? (
                              <a
                                href={prospect.website}
                                target="_blank"
                                rel="noreferrer"
                                className="website-link"
                              >
                                Ouvrir
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            {prospect.linkedin ? (
                              <a
                                href={prospect.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="website-link"
                              >
                                Ouvrir
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            {prospect.public_email ? (
                              <a
                                href={`mailto:${prospect.public_email}`}
                                className="email-link"
                              >
                                {prospect.public_email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                prospect.public_email
                                  ? "contact-badge contactable"
                                  : "contact-badge to-enrich"
                              }
                            >
                              {prospect.public_email
                                ? "Contactable"
                                : "À enrichir"}
                            </span>
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
                              {prospect.public_email && (
                                <button
                                  className="edit-button"
                                  onClick={() =>
                                    openMessageComposer(prospect)
                                  }
                                >
                                  Préparer un message
                                </button>
                              )}

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