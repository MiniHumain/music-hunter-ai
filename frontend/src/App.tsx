import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  createCampaign,
  getCampaigns,
  getCampaignProspects,
  addProspectToCampaign,
  removeProspectFromCampaign,
  createOutreachMessage,
  getOutreachMessages,
  updateOutreachMessage,
  deleteOutreachMessage,
  sendOutreachMessage,
  createProspect,
  deleteProspect,
  enrichProspectsBatch,
  generateCampaignDrafts,
  generateOutreachDraft,
  generateFollowUpDraft,
  getProspects,
  importProspectsCsv,
  markProspectReplied,
  recalculateProspectScores,
  runWikidataCollector,
  updateProspect,
  type BatchEnrichmentResult,
  type ScoreRecalculationResult,
  type Campaign,
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
function formatIndustry(
  industry: string | null
): string {
  if (!industry) {
    return "—";
  }

  const normalized = industry
    .trim()
    .toLowerCase();

  if (
    normalized === "jeux vidéo" ||
    normalized === "jeux video" ||
    normalized === "jeu vidéo" ||
    normalized === "jeu video"
  ) {
    return "Jeu vidéo";
  }

  return industry;
}

function formatTrackingDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(
    value
  )
    ? value
    : `${value}Z`;

  return new Date(normalized).toLocaleString("fr-FR");
}

function needsFollowUp(
  prospect: Prospect
): boolean {
  if (!prospect.follow_up_at || prospect.replied_at) {
    return false;
  }

  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(
    prospect.follow_up_at
  )
    ? prospect.follow_up_at
    : `${prospect.follow_up_at}Z`;

  return new Date(normalized).getTime() <= Date.now();
}

function App() {
  const [activePage, setActivePage] = useState<
  "dashboard" | "prospects" | "messages" | "campaigns" | "stats"
>("dashboard");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmail, setFilterEmail] = useState<"all" | "with">("all");
  const [filterFollowUp, setFilterFollowUp] = useState<"all" | "follow-up">("all");
  const [minimumScore, setMinimumScore] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "priority" | "name">("score");
  const [enrichmentLimit, setEnrichmentLimit] = useState(10);

  const [enriching, setEnriching] = useState(false);

  const [enrichmentResult, setEnrichmentResult] =
  useState<BatchEnrichmentResult | null>(null);

  const [recalculatingScores, setRecalculatingScores] =
    useState(false);

  const [generatingCampaignDrafts, setGeneratingCampaignDrafts] =
  useState(false);

  const [campaignDraftResult, setCampaignDraftResult] =
  useState<{
    prospects: number;
    created: number;
    skipped: number;
  } | null>(null);

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
  const [generatingMessageDraft, setGeneratingMessageDraft] =
    useState(false);
  const [campaigns, setCampaigns] =
  useState<Campaign[]>([]);

  const [campaignName, setCampaignName] =
  useState("");
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<number | null>(null);
  const [campaignProspects, setCampaignProspects] =
    useState<Prospect[]>([]);
  const [campaignProspectId, setCampaignProspectId] =
    useState("");
  const [loadingCampaignProspects, setLoadingCampaignProspects] =
    useState(false);
  const [campaignProspectsError, setCampaignProspectsError] =
    useState<string | null>(null);
  const [messageError, setMessageError] =
    useState<string | null>(null);
  const [savedMessage, setSavedMessage] =
    useState<OutreachMessage | null>(null);
  const [outreachMessages, setOutreachMessages] =
    useState<OutreachMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] =
    useState<OutreachMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState(false);
  const [editingMessageSubject, setEditingMessageSubject] = useState("");
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const [updatingMessage, setUpdatingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [sendingMessageId, setSendingMessageId] = useState<number | null>(null);
  const [messageToSend, setMessageToSend] = useState<OutreachMessage | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCampaigns()
      .then((data) => {
        if (!cancelled) {
          setCampaigns(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les campagnes."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activePage !== "messages") {
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      setMessagesError(null);

      try {
        const data = await getOutreachMessages();

        if (!cancelled) {
          setOutreachMessages(data);
        }
      } catch (err) {
        if (!cancelled) {
          setMessagesError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les brouillons."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activePage]);

  useEffect(() => {
    if (selectedCampaignId === null) {
     
      return;
    }

    let cancelled = false;

    const loadCampaignProspects = async () => {
      try {
        setLoadingCampaignProspects(true);
        setCampaignProspectsError(null);

        const data = await getCampaignProspects(selectedCampaignId);

        if (!cancelled) {
          setCampaignProspects(data);
        }
      } catch (err) {
        if (!cancelled) {
          setCampaignProspectsError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les prospects de la campagne."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCampaignProspects(false);
        }
      }
    };

    void loadCampaignProspects();

    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  async function handleAddCampaignProspect() {
    if (selectedCampaignId === null) {
      return;
    }


    const prospectId = Number(campaignProspectId);

    if (!Number.isInteger(prospectId) || prospectId <= 0) {
      setCampaignProspectsError("Choisis un prospect à ajouter.");
      return;
    }
    

    try {
      setCampaignProspectsError(null);

      await addProspectToCampaign(
        selectedCampaignId,
        prospectId
      );

      const refreshed = await getCampaignProspects(
        selectedCampaignId
      );

      setCampaignProspects(refreshed);
      setCampaignProspectId("");
    } catch (err) {
      setCampaignProspectsError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter le prospect à la campagne."
      );
    }
  }
      async function handleGenerateCampaignDrafts() {
  if (selectedCampaignId === null) {
    return;
  }

  try {
    setGeneratingCampaignDrafts(true);
    setCampaignDraftResult(null);
    setCampaignProspectsError(null);

    const result = await generateCampaignDrafts(
      selectedCampaignId
    );

    setCampaignDraftResult(result);
  } catch (err) {
    setCampaignProspectsError(
      err instanceof Error
        ? err.message
        : "Impossible de générer les brouillons."
    );
  } finally {
    setGeneratingCampaignDrafts(false);
  }
}

  async function handleRemoveCampaignProspect(
    prospectId: number
  ) {
    if (selectedCampaignId === null) {
      return;
    }

    try {
      setCampaignProspectsError(null);

      await removeProspectFromCampaign(
        selectedCampaignId,
        prospectId
      );

      setCampaignProspects((current) =>
        current.filter(
          (prospect) => prospect.id !== prospectId
        )
      );
    } catch (err) {
      setCampaignProspectsError(
        err instanceof Error
          ? err.message
          : "Impossible de retirer le prospect de la campagne."
      );
    }
  }

  async function handleCreateCampaign(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = campaignName.trim();

    if (!name) {
      return;
    }

    try {
      setError(null);

      const created = await createCampaign({
        name,
      });

      setCampaigns((current) => [
        created,
        ...current,
      ]);

      setCampaignName("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la campagne."
      );
    }
  }


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

      followUps: prospects.filter(
  (prospect) => needsFollowUp(prospect)
).length,

drafts: outreachMessages.filter(
  (message) =>
    message.status === "draft"
).length,
    };
  }, [prospects, outreachMessages]);

  const availableCountries = useMemo(() => {
    return Array.from(
      new Set(
        prospects
          .map((prospect) => prospect.country)
          .filter((country): country is string => Boolean(country))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [prospects,]);
  const availableIndustries = useMemo(() => {
    return Array.from(
      new Set(
        prospects
          .map((prospect) => formatIndustry(prospect.industry))
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
        const matchesFollowUp =
  filterFollowUp === "all" ||
  needsFollowUp(prospect);
      const matchesScore = prospect.score >= minimumScore;

      return (
        matchesSearch &&
        matchesCountry &&
        matchesIndustry &&
        matchesStatus &&
        matchesEmail &&
        matchesFollowUp &&
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
    filterFollowUp,
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
  async function handleMarkReplied(
  prospect: Prospect
) {
  try {
    const updatedProspect =
      await markProspectReplied(
        prospect.id
      );

    setProspects((current) =>
      current.map((item) =>
        item.id === updatedProspect.id
          ? updatedProspect
          : item
      )
    );
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Impossible d'enregistrer la réponse."
    );
  }
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

  async function openMessageComposer(
    prospect: Prospect
  ) {
    setMessageProspect(prospect);
    setMessageSubject("");
    setMessageBody("");
    setMessageError(null);
    setSavedMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    try {
      setGeneratingMessageDraft(true);

      const draft = await generateOutreachDraft(
        prospect.id
      );

      setMessageSubject(draft.subject);
      setMessageBody(draft.body);
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Impossible de générer le brouillon."
      );
    } finally {
      setGeneratingMessageDraft(false);
    }
  }

  async function openFollowUpComposer(
    prospect: Prospect
  ) {
    setMessageProspect(prospect);
    setMessageSubject("");
    setMessageBody("");
    setMessageError(null);
    setSavedMessage(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    try {
      setGeneratingMessageDraft(true);

      const draft = await generateFollowUpDraft(
        prospect.id
      );

      setMessageSubject(draft.subject);
      setMessageBody(draft.body);
    } catch (err) {
      setMessageError(
        err instanceof Error
          ? err.message
          : "Impossible de générer la relance."
      );
    } finally {
      setGeneratingMessageDraft(false);
    }
  }

  function closeMessageComposer() {
    setMessageProspect(null);
    setMessageSubject("");
    setMessageBody("");
    setMessageError(null);
    setSavedMessage(null);
  }

  function openSavedMessage(message: OutreachMessage) {
    setSelectedMessage(message);
    setEditingMessage(false);
    setEditingMessageSubject(message.subject);
    setEditingMessageBody(message.body);
  }

  function startEditingMessage(message: OutreachMessage) {
    setSelectedMessage(message);
    setEditingMessage(true);
    setEditingMessageSubject(message.subject);
    setEditingMessageBody(message.body);
  }

  async function handleSavedMessageUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMessage) return;
    const subject = editingMessageSubject.trim();
    const body = editingMessageBody.trim();
    if (!subject || !body) {
      setMessagesError("Le sujet et le message sont obligatoires.");
      return;
    }
    try {
      setUpdatingMessage(true);
      setMessagesError(null);
      const updated = await updateOutreachMessage(selectedMessage.id, { subject, body });
      setOutreachMessages((current) =>
        current.map((message) => message.id === updated.id ? updated : message)
      );
      setSelectedMessage(updated);
      setEditingMessage(false);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Impossible de modifier le brouillon.");
    } finally {
      setUpdatingMessage(false);
    }
  }

  async function handleSavedMessageDelete(message: OutreachMessage) {
    if (!window.confirm(`Supprimer le brouillon "${message.subject}" ?`)) return;
    try {
      setDeletingMessageId(message.id);
      setMessagesError(null);
      await deleteOutreachMessage(message.id);
      setOutreachMessages((current) => current.filter((item) => item.id !== message.id));
      if (selectedMessage?.id === message.id) {
        setSelectedMessage(null);
        setEditingMessage(false);
      }
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Impossible de supprimer le brouillon.");
    } finally {
      setDeletingMessageId(null);
    }
  }

  function requestSavedMessageSend(message: OutreachMessage) {
    if (message.status === "sent") return;

    const prospect = prospects.find((item) => item.id === message.prospect_id);

    if (!prospect?.public_email) {
      setMessagesError("Ce prospect ne possède pas d'email public.");
      return;
    }

    setMessagesError(null);
    setMessageToSend(message);
  }

  async function confirmSavedMessageSend() {
    if (!messageToSend || messageToSend.status === "sent") return;

    const message = messageToSend;
    const prospect = prospects.find((item) => item.id === message.prospect_id);

    if (!prospect?.public_email) {
      setMessagesError("Ce prospect ne possède pas d'email public.");
      setMessageToSend(null);
      return;
    }

    try {
      setSendingMessageId(message.id);
      setMessagesError(null);

      const sent = await sendOutreachMessage(message.id);

      setOutreachMessages((current) =>
        current.map((item) => item.id === sent.id ? sent : item)
      );

      if (selectedMessage?.id === sent.id) {
        setSelectedMessage(sent);
        setEditingMessage(false);
      }

      setMessageToSend(null);
      setProspects(await getProspects());
    } catch (err) {
      setMessagesError(
        err instanceof Error ? err.message : "Impossible d'envoyer l'e-mail."
      );
    } finally {
      setSendingMessageId(null);
    }
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
  <button
    className={`nav-item ${
      activePage === "dashboard" ? "active" : ""
    }`}
    onClick={() => setActivePage("dashboard")}
  >
    Dashboard
  </button>

  <button
    className={`nav-item ${
      activePage === "prospects" ? "active" : ""
    }`}
    onClick={() => setActivePage("prospects")}
  >
    Prospects
  </button>

  <button
    className={`nav-item ${
      activePage === "messages" ? "active" : ""
    }`}
    onClick={() => setActivePage("messages")}
  >
    Messages
  </button>

  <button
    className={`nav-item ${
      activePage === "campaigns" ? "active" : ""
    }`}
    onClick={() => setActivePage("campaigns")}
  >
    Campagnes
  </button>

  <button
    className={`nav-item ${
      activePage === "stats" ? "active" : ""
    }`}
    onClick={() => setActivePage("stats")}
  >
    Statistiques
  </button>
        </nav>
      </aside>

      <main className="content">

        {activePage === "campaigns" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">CRM</p>
                <h2>Campagnes</h2>
                <p className="subtitle">
                  Crée et organise tes campagnes de prospection.
                </p>
              </div>
            </header>

            <section className="panel prospect-form-panel">
              <div className="panel-header">
                <div>
                  <h3>Nouvelle campagne</h3>
                  <p>Donne un nom à ta campagne pour commencer.</p>
                </div>
              </div>

              <form
                className="prospect-form"
                onSubmit={handleCreateCampaign}
              >
                <label>
                  Nom de la campagne
                  <input
                    value={campaignName}
                    onChange={(event) =>
                      setCampaignName(event.target.value)
                    }
                    placeholder="Ex. Studios jeux vidéo France"
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={!campaignName.trim()}
                  >
                    Créer la campagne
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Campagnes</h3>
                  <p>
                    {campaigns.length} campagne
                    {campaigns.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {error && (
                <div className="message error">{error}</div>
              )}

              {campaigns.length === 0 ? (
                <div className="message">
                  Aucune campagne enregistrée.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Statut</th>
                        <th>Créée le</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id}>
                          <td>{campaign.name}</td>
                          <td>
                            <span className="status">
                              {campaign.status}
                            </span>
                          </td>
                          <td>
                            {new Date(
                              campaign.created_at
                            ).toLocaleDateString("fr-FR")}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                setSelectedCampaignId(campaign.id)
                              }
                            >
                              {selectedCampaignId === campaign.id
                                ? "Sélectionnée"
                                : "Gérer"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedCampaignId !== null && (
              <section className="panel prospect-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>
                      Prospects ·{" "}
                      {campaigns.find(
                        (campaign) =>
                          campaign.id === selectedCampaignId
                      )?.name ?? `Campagne #${selectedCampaignId}`}
                    </h3>
                    <p>
                      Ajoute ou retire des prospects de cette campagne.
                    </p>
                  </div>
                </div>
                        <div className="form-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleGenerateCampaignDrafts}
            disabled={
              generatingCampaignDrafts ||
              campaignProspects.length === 0
            }
          >
            {generatingCampaignDrafts
              ? "Génération en cours..."
              : "Générer les brouillons"}
          </button>
        </div>

        {campaignDraftResult && (
          <div className="import-result">
            <strong>Génération terminée :</strong>{" "}
            {campaignDraftResult.created} brouillon
            {campaignDraftResult.created !== 1 ? "s" : ""} généré
            {campaignDraftResult.created !== 1 ? "s" : ""}
            {" · "}
            {campaignDraftResult.skipped} ignoré
            {campaignDraftResult.skipped !== 1 ? "s" : ""}
          </div>
        )}

                <div className="prospect-form">
                  <label>
                    Prospect à ajouter
                    <select
                      value={campaignProspectId}
                      onChange={(event) =>
                        setCampaignProspectId(event.target.value)
                      }
                    >
                      <option value="">Choisir un prospect</option>
                      {prospects
                        .filter(
                          (prospect) =>
                            !campaignProspects.some(
                              (item) => item.id === prospect.id
                            )
                        )
                        .map((prospect) => (
                          <option
                            key={prospect.id}
                            value={prospect.id}
                          >
                            {prospect.company_name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!campaignProspectId}
                      onClick={handleAddCampaignProspect}
                    >
                      Ajouter à la campagne
                    </button>
                  </div>
                </div>

                {campaignProspectsError && (
                  <div className="message error">
                    {campaignProspectsError}
                  </div>
                )}

                {loadingCampaignProspects ? (
                  <div className="message">
                    Chargement des prospects...
                  </div>
                ) : campaignProspects.length === 0 ? (
                  <div className="message">
                    Aucun prospect dans cette campagne.
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Entreprise</th>
                          <th>Pays</th>
                          <th>Score</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignProspects.map((prospect) => (
                          <tr key={prospect.id}>
                            <td>{prospect.company_name}</td>
                            <td>{prospect.country ?? "—"}</td>
                            <td>{prospect.score}</td>
                            <td>
                              <button
                                type="button"
                                className="delete-button"
                                onClick={() =>
                                  handleRemoveCampaignProspect(
                                    prospect.id
                                  )
                                }
                              >
                                Retirer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        ) : activePage === "messages" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">CRM</p>
                <h2>Messages</h2>
                <p className="subtitle">
                  Retrouve les brouillons préparés pour tes prospects.
                </p>
              </div>
            </header>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Brouillons</h3>
                  <p>{outreachMessages.length} message{outreachMessages.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {loadingMessages && (
                <div className="message">Chargement des brouillons...</div>
              )}

              {messagesError && (
                <div className="message error">{messagesError}</div>
              )}

              {!loadingMessages && !messagesError && outreachMessages.length === 0 && (
                <div className="message">Aucun brouillon enregistré.</div>
              )}

              {!loadingMessages && !messagesError && outreachMessages.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Entreprise</th>
                        <th>E-mail</th>
                        <th>Sujet</th>
                        <th>Statut</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outreachMessages.map((message) => {
                        const prospect = prospects.find(
                          (item) => item.id === message.prospect_id
                        );

                        return (
                          <tr key={message.id}>
                            <td>{prospect?.company_name ?? `Prospect #${message.prospect_id}`}</td>
                            <td>
                              {prospect?.public_email ? (
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
                            <td>{message.subject}</td>
                            <td>
                              <span className="status">{message.status}</span>
                            </td>
                            <td><td>
  {message.status === "sent" && message.sent_at
    ? new Date(`${message.sent_at}Z`).toLocaleString("fr-FR")
    : new Date(message.created_at).toLocaleDateString("fr-FR")}
</td></td>
                            <td>
                              <div className="actions">
                                <button type="button" className="edit-button" onClick={() => openSavedMessage(message)}>
                                  Consulter
                                </button>
                                <button
                                  type="button"
                                  className="edit-button"
                                  disabled={message.status === "sent"}
                                  onClick={() => startEditingMessage(message)}
                                >
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  className="primary-button"
                                  disabled={
                                    message.status === "sent" ||
                                    sendingMessageId === message.id ||
                                    !prospect?.public_email
                                  }
                                  onClick={() => requestSavedMessageSend(message)}
                                >
                                  {message.status === "sent"
                                    ? "Envoyé"
                                    : sendingMessageId === message.id
                                      ? "Envoi..."
                                      : "Envoyer"}
                                </button>
                                <button
                                  type="button"
                                  className="delete-button"
                                  disabled={
                                    deletingMessageId === message.id ||
                                    sendingMessageId === message.id
                                  }
                                  onClick={() => handleSavedMessageDelete(message)}
                                >
                                  {deletingMessageId === message.id ? "Suppression..." : "Supprimer"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedMessage && (
              <section className="panel prospect-form-panel">
                <div className="panel-header">
                  <div>
                    <h3>{selectedMessage.subject}</h3>
                    <p>
                      {prospects.find((p) => p.id === selectedMessage.prospect_id)
                        ?.company_name ?? `Prospect #${selectedMessage.prospect_id}`}
                    </p>
                  </div>
                </div>

                {editingMessage ? (
                  <form className="prospect-form" onSubmit={handleSavedMessageUpdate}>
                    <label>
                      Sujet
                      <input
                        value={editingMessageSubject}
                        onChange={(event) => setEditingMessageSubject(event.target.value)}
                      />
                    </label>
                    <label>
                      Message
                      <textarea
                        value={editingMessageBody}
                        onChange={(event) => setEditingMessageBody(event.target.value)}
                        rows={12}
                      />
                    </label>
                    <div className="form-actions">
  <button
    type="button"
    className="primary-button"
    onClick={handleGenerateCampaignDrafts}
    disabled={
      generatingCampaignDrafts ||
      campaignProspects.length === 0
    }
  >
    {generatingCampaignDrafts
      ? "Génération en cours..."
      : "Générer les brouillons"}
  </button>
</div>

{campaignDraftResult && (
  <div className="import-result">
    <strong>Génération terminée :</strong>{" "}
    {campaignDraftResult.created} brouillon
    {campaignDraftResult.created !== 1 ? "s" : ""} généré
    {campaignDraftResult.created !== 1 ? "s" : ""}
    {" · "}
    {campaignDraftResult.skipped} ignoré
    {campaignDraftResult.skipped !== 1 ? "s" : ""}
  </div>
)}
                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setEditingMessage(false)}>
                        Annuler
                      </button>
                      <button type="submit" className="primary-button" disabled={updatingMessage}>
                        {updatingMessage ? "Enregistrement..." : "Enregistrer les modifications"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="prospect-form">
                    <label>
                      Message
                      <textarea value={selectedMessage.body} rows={12} readOnly />
                    </label>
                    <div className="form-actions">
                      <button type="button" className="secondary-button" onClick={() => setSelectedMessage(null)}>
                        Fermer
                      </button>
                      {selectedMessage.status !== "sent" && (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditingMessage(selectedMessage)}
                        >
                          Modifier
                        </button>
                      )}
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          selectedMessage.status === "sent" ||
                          sendingMessageId === selectedMessage.id ||
                          !prospects.find((p) => p.id === selectedMessage.prospect_id)?.public_email
                        }
                        onClick={() => requestSavedMessageSend(selectedMessage)}
                      >
                        {selectedMessage.status === "sent"
                          ? "Envoyé"
                          : sendingMessageId === selectedMessage.id
                            ? "Envoi..."
                            : "Envoyer"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {messageToSend && (() => {
              const sendProspect = prospects.find(
                (p) => p.id === messageToSend.prospect_id
              );

              return (
                <div
                  className="send-confirmation-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="send-confirmation-title"
                >
                  <div className="send-confirmation-modal">
                    <p className="eyebrow">CONFIRMATION D'ENVOI</p>
                    <h3 id="send-confirmation-title">Vérifier avant d'envoyer</h3>

                    <div className="send-confirmation-details">
                      <p>
                        <strong>Entreprise :</strong>{" "}
                        {sendProspect?.company_name ?? `Prospect #${messageToSend.prospect_id}`}
                      </p>
                      <p>
                        <strong>Destinataire :</strong>{" "}
                        {sendProspect?.public_email ?? "—"}
                      </p>
                      <p>
                        <strong>Sujet :</strong> {messageToSend.subject}
                      </p>
                    </div>

                    <label className="send-confirmation-preview">
                      Message
                      <textarea
                        value={messageToSend.body}
                        rows={12}
                        readOnly
                      />
                    </label>

                    <p className="send-confirmation-warning">
                      Attention : confirmer déclenchera l'envoi réel de cet e-mail.
                    </p>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={sendingMessageId === messageToSend.id}
                        onClick={() => setMessageToSend(null)}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={sendingMessageId === messageToSend.id}
                        onClick={confirmSavedMessageSend}
                      >
                        {sendingMessageId === messageToSend.id
                          ? "Envoi..."
                          : "Confirmer l'envoi"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <>
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
                <h3>
                  {messageSubject.startsWith("Petit suivi -")
                    ? "Préparer une relance"
                    : "Préparer un message"}
                </h3>
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
                  disabled={savingMessage || generatingMessageDraft}
                >
                  {generatingMessageDraft
                    ? "Génération..."
                    : savingMessage
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
          <StatCard
  label="À relancer"
  value={stats.followUps}
/>

<StatCard
  label="Brouillons"
  value={stats.drafts}
/>
        </section>
        <section className="panel">
  <div className="panel-header">
    <div>
      <h3>Actions du jour</h3>
      <p>Prospects à relancer maintenant.</p>
    </div>
  </div>

  <div className="panel-header">
  <div>
    <h3>Brouillons prêts à envoyer</h3>
    <div className="panel-header">
  <div>
    <h3>Prospects prioritaires à contacter</h3>
    <p>
      Meilleurs prospects encore à contacter.
    </p>
  </div>
</div>

{prospects.filter(
  (prospect) =>
    prospect.status === "À contacter"
).length === 0 ? (
  <div className="message">
    Aucun prospect à contacter.
  </div>
) : (
  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Entreprise</th>
          <th>Score</th>
          <th>Priorité</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {prospects
          .filter(
            (prospect) =>
              prospect.status === "À contacter"
          )
          .sort(
            (a, b) => b.score - a.score
          )
          .slice(0, 5)
          .map((prospect) => (
            <tr key={prospect.id}>
              <td>
                {prospect.company_name}
              </td>

              <td>
                {prospect.score}/100
              </td>

              <td>
                {prospect.priority}
              </td>

              <td>
                <button
                  type="button"
                  className="edit-button"
                  onClick={() => {
                    void openMessageComposer(
                      prospect
                    );
                  }}
                >
                  Préparer un message
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)}
    <p>Messages enregistrés mais pas encore envoyés.</p>
  </div>
</div>

{outreachMessages.filter(
  (message) => message.status === "draft"
).length === 0 ? (
  <div className="message">
    Aucun brouillon en attente.
  </div>
) : (
  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Entreprise</th>
          <th>Sujet</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {outreachMessages
          .filter(
            (message) => message.status === "draft"
          )
          .map((message) => {
            const prospect = prospects.find(
              (item) =>
                item.id === message.prospect_id
            );

            return (
              <tr key={message.id}>
                <td>
                  {prospect?.company_name ??
                    `Prospect #${message.prospect_id}`}
                </td>

                <td>{message.subject}</td>

                <td>
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => {
                      setActivePage("messages");
                      openSavedMessage(message);
                    }}
                  >
                    Vérifier le brouillon
                  </button>
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  </div>
)}

  {prospects.filter((prospect) => needsFollowUp(prospect)).length === 0 ? (
    <div className="message">
      Aucune relance à faire aujourd’hui.
    </div>
  ) : (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Entreprise</th>
            <th>E-mail</th>
            <th>Relance prévue</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {prospects
            .filter((prospect) => needsFollowUp(prospect))
            .map((prospect) => (
              <tr key={prospect.id}>
                <td>{prospect.company_name}</td>

                <td>
                  {prospect.public_email ?? "—"}
                </td>

                <td>
                  {formatTrackingDate(
                    prospect.follow_up_at
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => {
                      void openFollowUpComposer(
                        prospect
                      );
                    }}
                  >
                    Préparer une relance
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )}
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
  Relance
  <select
    value={filterFollowUp}
    onChange={(event) =>
      setFilterFollowUp(
        event.target.value as
          | "all"
          | "follow-up"
      )
    }
  >
    <option value="all">
      Toutes
    </option>
    <option value="follow-up">
      À relancer
    </option>
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
                        Suivi
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
                            {formatIndustry(prospect.industry)}
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
                            <div className="prospect-tracking">
                              <span>
                                <strong>Dernier contact :</strong>{" "}
                                {formatTrackingDate(prospect.last_contacted_at)}
                              </span>
                              <span>
                                <strong>Réponse :</strong>{" "}
                                {formatTrackingDate(prospect.replied_at)}
                              </span>
                              <span>
                                <strong>Relance :</strong>{" "}
                                {formatTrackingDate(prospect.follow_up_at)}
                              </span>
                              {needsFollowUp(prospect) && (
                                <>
                                  <span className="status">
                                    À relancer
                                  </span>

                                  <button
                                    type="button"
                                    className="edit-button"
                                    onClick={() => {
                                      void openFollowUpComposer(prospect);
                                    }}
                                  >
                                    Préparer une relance
                                  </button>
                                </>
                              )}

                              {!prospect.replied_at && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleMarkReplied(prospect);
                                  }}
                                >
                                  Réponse reçue
                                </button>
                              )}
                            </div>
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

          </>
        )}
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