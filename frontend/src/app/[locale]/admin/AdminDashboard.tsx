"use client";

import React, { useEffect, useState } from "react";

interface EmailItem {
  id:         string;
  uid:        number;
  from:       string;
  from_email: string;
  subject:    string;
  date:       string;
  snippet:    string;
  body:       string;
  seen:       boolean;
  importance: number;
  resume:     string;
  action:     string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPIs {
  demandes_actives:   number;
  devis_actifs:       number;
  paiements_attendus: number;
  ca_mois:            number;
}

interface Demande {
  id:              string;
  reference:       string;
  created_at:      string;
  statut:          string;
  secteur:         string;
  budget_min:      number | null;
  budget_max:      number | null;
  devise:          string;
  delai_souhaite:  string | null;
  description:     string;
  titre:           string;
  client_nom:      string;
  client_prenom:   string;
  client_email:    string;
  entreprise:      string;
  resume_ia:       string;
  scoring_urgence: number;
}

interface LigneDevis {
  id:               string;
  description:      string;
  quantite:         number;
  unite:            string;
  prix_unitaire_ht: number;
  tva_taux:         number;
}

interface Devis {
  id:                  string;
  reference:           string;
  created_at:          string;
  statut:              string;
  montant_ht:          number;
  montant_ttc:         number;
  tva:                 number;
  devise:              string;
  date_envoi:          string | null;
  date_expiration:     string | null;
  validite_jours:      number;
  notes:               string | null;
  objet:               string | null;
  lignes:              LigneDevis[];
  conditions_paiement: string | null;
  incoterms:           string | null;
  pays_livraison:      string | null;
  adresse_livraison:   string | null;
  demande_titre:       string;
  demande_id:          string;
  demande_secteur:     string | null;
  client_nom:          string;
  client_prenom:       string;
  client_email:        string;
  client_telephone:    string;
  client_entreprise:   string;
  client_adresse:      string;
  client_code_postal:  string;
  client_ville:        string;
  client_pays:         string;
  client_siret:        string;
  client_tva_intra:    string;
}

interface Facture {
  id:              string;
  reference:       string;
  date_emission:   string;
  date_echeance:   string | null;
  montant_ttc:     number;
  devise:          string;
  statut_paiement: string;
  methode_paiement:string | null;
  client_nom:      string;
  client_prenom:   string;
  client_email:    string;
  en_retard:       boolean;
}

interface CoutsMois {
  cout_mois_eur:  number;
  budget_eur:     number;
  nb_requetes:    number;
  taux_cache_pct: number;
  pct_haiku:      number;
  pct_sonnet:     number;
}

interface Fournisseur {
  id:                   string;
  nom:                  string;
  secteur:              string | null;
  ville:                string | null;
  region:               string | null;
  pays:                 string;
  certifications:       string[];
  moq_min:              number | null;
  moq_unite:            string | null;
  delai_production_min: number | null;
  delai_production_max: number | null;
  incoterms_acceptes:   string[];
  contact_nom:          string | null;
  contact_tel:          string | null;
  contact_email:        string | null;
  contact_langue:       string;
  note_qualite:         number | null;
  note_delais:          number | null;
  note_communication:   number | null;
  note_fiabilite:       number | null;
  nb_missions:          number;
  derniere_mission_date: string | null;
  notes_terrain:        string | null;
  actif:                boolean;
}

interface Livraison {
  id:                   string;
  demande_id:           string | null;
  fournisseur_id:       string | null;
  client_id:            string | null;
  mode_transport:       string | null;
  incoterm:             string | null;
  transitaire:          string | null;
  date_expedition:      string | null;
  date_arrivee_estimee: string | null;
  date_arrivee_reelle:  string | null;
  numero_tracking:      string | null;
  statut:               string;
  port_depart:          string | null;
  port_arrivee:         string | null;
  poids_kg:             number | null;
  volume_m3:            number | null;
  valeur_marchandise:   number | null;
  devise:               string;
  notes:                string | null;
  date_creation:        string;
  fournisseur_nom:      string | null;
  client_nom:           string | null;
  demande_titre:        string | null;
  docs_total:           number;
  docs_obtenus:         number;
}

interface ChecklistDoc {
  id:             string;
  livraison_id:   string;
  type_doc:       string;
  obligatoire:    boolean;
  obtenu:         boolean;
  date_obtention: string | null;
  notes:          string | null;
}

interface HistoriqueItem {
  id:          string;
  reference:   string;
  statut:      string;
  client_nom:  string;
  client_prenom?: string;
  titre?:       string;
  demande_titre?: string;
  montant_ttc?: number;
  devise?:      string;
  created_at?:  string;
  updated_at?:  string;
}

interface DemandeContexte {
  id:         string;
  reference:  string;
  titre:      string;
  statut:     string;
  secteur:    string | null;
  client_nom: string;
}

interface DashboardData {
  kpis:               KPIs;
  demandes:           Demande[];
  devis:              Devis[];
  factures:           Facture[];
  demandes_contexte:  DemandeContexte[];
  historique: {
    demandes: HistoriqueItem[];
    devis:    HistoriqueItem[];
    factures: HistoriqueItem[];
  };
  couts_mois: CoutsMois;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RED   = "#C0392B";
const GREEN = "#27AE60";
const ONG   = "#E67E22";

function money(n: number, currency = "EUR") {
  return n.toLocaleString("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 });
}

function dateStr(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
}

function UrgenceBadge({ score }: { score: number }) {
  const color = score >= 4 ? RED : score === 3 ? ONG : GREEN;
  const label = score >= 4 ? "Urgent" : score === 3 ? "Normal" : "Faible";
  return (
    <span style={{
      backgroundColor: color, color: "#fff",
      padding: "2px 10px", borderRadius: "20px",
      fontSize: "12px", fontWeight: 700,
    }}>{label}</span>
  );
}

function StatutPaiementBadge({ facture }: { facture: Facture }) {
  let color = GREEN, label = "Payée";
  if (facture.en_retard) { color = RED; label = "En retard"; }
  else if (facture.statut_paiement === "en_attente") { color = ONG; label = "En attente"; }
  else if (facture.statut_paiement === "partiel")    { color = ONG; label = "Partiel"; }
  else if (facture.statut_paiement === "litige")     { color = RED; label = "Litige"; }
  else if (facture.statut_paiement === "annulé")     { color = "#999"; label = "Annulée"; }
  return (
    <span style={{
      backgroundColor: color, color: "#fff",
      padding: "2px 10px", borderRadius: "20px",
      fontSize: "12px", fontWeight: 700,
    }}>{label}</span>
  );
}

function DevisStatutBadge({ statut }: { statut: string }) {
  const map: Record<string, [string, string]> = {
    brouillon: ["#888", "Brouillon"],
    "envoyé":  [ONG,    "Envoyé"],
    "accepté": [GREEN,  "Accepté"],
    "refusé":  [RED,    "Refusé"],
    "expiré":  ["#aaa", "Expiré"],
  };
  const [color, label] = map[statut] ?? ["#888", statut];
  return (
    <span style={{
      backgroundColor: color, color: "#fff",
      padding: "2px 10px", borderRadius: "20px",
      fontSize: "12px", fontWeight: 700,
    }}>{label}</span>
  );
}

function Spinner() {
  return (
    <span style={{
      width: "16px", height: "16px",
      border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "#fff", borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ─── RefinementBar ────────────────────────────────────────────────────────────
// Permet à Anna de demander des modifications par texte ou par voix.

function RefinementBar({
  context,
  content,
  onRefined,
  disabled,
}: {
  context:    "email" | "devis" | "general";
  content:    string;
  onRefined:  (newContent: string) => void;
  disabled?:  boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [listening,   setListening]   = useState(false);

  function startVoice() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
            || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { alert("Reconnaissance vocale non disponible sur ce navigateur."); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new (SR as any)();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      setInstruction(prev => (prev ? prev + " " : "") + transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function handleRefine() {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instruction: instruction.trim(), context }),
      });
      const json = await res.json();
      if (json.refined) {
        onRefined(json.refined);
        setInstruction("");
      }
    } catch {}
    setLoading(false);
  }

  return (
    <div style={{ marginTop: "10px", backgroundColor: "#f8f8f8", borderRadius: "12px", padding: "10px 12px", border: "1.5px solid #e8e8e8" }}>
      <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Demander une modification
      </p>
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
        <textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
          placeholder={`ex : "Raccourcis le message" · "Mets l'accent sur le délai" · "Sois plus formel"`}
          rows={2}
          style={{
            flex: 1, padding: "8px 10px",
            border: "1.5px solid #e0e0e0", borderRadius: "8px",
            fontSize: "13px", fontFamily: "inherit",
            resize: "none", outline: "none",
            backgroundColor: "#fff",
          }}
          disabled={disabled || loading}
        />
        <button
          onClick={startVoice}
          disabled={listening || loading || disabled}
          title="Dicter une instruction"
          style={{
            width: "40px", height: "40px", borderRadius: "50%", border: "none", cursor: "pointer",
            backgroundColor: listening ? RED : "#e8e8e8",
            color: listening ? "#fff" : "#555",
            fontSize: "18px", flexShrink: 0,
            transition: "background-color 0.2s",
          }}
        >
          🎤
        </button>
        <button
          onClick={handleRefine}
          disabled={!instruction.trim() || loading || disabled}
          style={{
            ...btnPrimary,
            padding: "0 14px", height: "40px", flexShrink: 0,
            opacity: (!instruction.trim() || loading || disabled) ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          {loading ? <><Spinner /> Modification…</> : "Modifier ↵"}
        </button>
      </div>
      {listening && (
        <p style={{ margin: "6px 0 0", fontSize: "12px", color: RED, fontWeight: 600 }}>
          ● Écoute en cours… (parlez maintenant)
        </p>
      )}
    </div>
  );

}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
      backgroundColor: type === "ok" ? GREEN : RED,
      color: "#fff", padding: "12px 20px", borderRadius: "12px",
      fontSize: "14px", fontWeight: 600, zIndex: 9999,
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      maxWidth: "90vw", textAlign: "center",
    }}>{msg}</div>
  );
}

// ─── Onglet Demandes ──────────────────────────────────────────────────────────

// ─── Onglet Emails ───────────────────────────────────────────────────────────

const IMPORT_COLORS: Record<number, string> = { 5: "#C0392B", 4: "#E67E22", 3: "#2980B9", 2: "#888", 1: "#bbb" };
const IMPORT_LABELS: Record<number, string> = { 5: "Urgent", 4: "Important", 3: "Normal", 2: "Info", 1: "Auto" };

function OngletEmails({
  emails,
  loading,
  onRefresh,
}: {
  emails:    EmailItem[];
  loading:   boolean;
  onRefresh: () => void;
}) {
  const [selected,    setSelected]    = useState<EmailItem | null>(null);
  const [draft,       setDraft]       = useState("");
  const [drafting,    setDrafting]    = useState(false);
  const [sending,     setSending]     = useState(false);
  const [sentIds,     setSentIds]     = useState<Set<string>>(new Set());
  const [filter,      setFilter]      = useState<"all" | "unread" | "important">("all");

  const visible = emails.filter(e => {
    if (filter === "unread")    return !e.seen;
    if (filter === "important") return e.importance >= 4;
    return true;
  });

  async function handleGenerateDraft(e: EmailItem) {
    setDrafting(true);
    setDraft("");
    try {
      const res = await fetch("/api/admin/emails/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: e.from, subject: e.subject, body: e.body }),
      });
      const json = await res.json();
      setDraft(json.draft ?? "");
    } catch {}
    setDrafting(false);
  }

  async function handleSend(e: EmailItem) {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: e.from_email, to_name: e.from, subject: e.subject, body: draft }),
      });
      if (res.ok) {
        setSentIds(s => new Set(s).add(e.id));
        setSelected(null);
        setDraft("");
      }
    } catch {}
    setSending(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ width: "32px", height: "32px", border: `3px solid ${RED}`, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#888", fontSize: "14px" }}>Chargement des emails…</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Barre d'outils ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "unread", "important"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none",
              background: filter === f ? RED : "#eee", color: filter === f ? "#fff" : "#555",
            }}>
              {f === "all" ? "Tous" : f === "unread" ? "Non lus" : "Importants"}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px" }} title="Actualiser">↻</button>
      </div>

      {visible.length === 0 && <EmptyState message="Aucun email dans cette catégorie" />}

      {/* ── Liste emails ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {visible.map(e => {
          const sent    = sentIds.has(e.id);
          const impColor = IMPORT_COLORS[e.importance] ?? "#888";
          return (
            <div
              key={e.id}
              onClick={() => { setSelected(e); setDraft(""); }}
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${impColor}`,
                opacity: e.seen ? 0.8 : 1,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: e.seen ? 500 : 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.from}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.subject}
                  </p>
                </div>
                <div style={{ marginLeft: "8px", textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "#aaa" }}>{new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: impColor }}>{IMPORT_LABELS[e.importance]}</span>
                </div>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888", lineHeight: "1.4" }}>{e.resume}</p>
              {e.action && (
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: impColor, fontWeight: 600 }}>→ {e.action}</p>
              )}
              {sent && <p style={{ margin: "4px 0 0", fontSize: "11px", color: GREEN, fontWeight: 700 }}>✓ Réponse envoyée</p>}
            </div>
          );
        })}
      </div>

      {/* ── Modal email ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => { setSelected(null); setDraft(""); }}
        >
          <div
            style={{ backgroundColor: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: "20px 20px 32px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>{selected.subject}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{selected.from} · {new Date(selected.date).toLocaleString("fr-FR")}</p>
              </div>
              <button onClick={() => { setSelected(null); setDraft(""); }} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888", marginLeft: "8px" }}>✕</button>
            </div>

            {/* Corps email */}
            <div style={{ backgroundColor: "#f9f9f9", borderRadius: "10px", padding: "14px", marginBottom: "16px", fontSize: "14px", lineHeight: "1.7", color: "#333", whiteSpace: "pre-wrap", maxHeight: "200px", overflowY: "auto" }}>
              {selected.body || selected.snippet}
            </div>

            {/* Résumé IA */}
            <div style={{ backgroundColor: "#f0f6ff", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 800, color: "#2980B9", textTransform: "uppercase" }}>Analyse IA</p>
              <p style={{ margin: 0, fontSize: "13px", color: "#333" }}>{selected.resume}</p>
              {selected.action && <p style={{ margin: "4px 0 0", fontSize: "12px", color: IMPORT_COLORS[selected.importance], fontWeight: 600 }}>→ {selected.action}</p>}
            </div>

            {/* Zone réponse */}
            {!draft && (
              <button
                onClick={() => handleGenerateDraft(selected)}
                disabled={drafting}
                style={{ ...btnPrimary, width: "100%", opacity: drafting ? 0.7 : 1 }}
              >
                {drafting ? <><Spinner /> Génération de la réponse…</> : "✦ Générer une réponse avec l'IA"}
              </button>
            )}

            {draft && (
              <>
                <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "#555" }}>RÉPONSE (modifiable)</p>
                <textarea
                  value={draft}
                  onChange={ev => setDraft(ev.target.value)}
                  rows={8}
                  style={{ width: "100%", padding: "12px", border: "1.5px solid #e0e0e0", borderRadius: "10px", fontSize: "14px", lineHeight: "1.6", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                />

                {/* ── Barre de raffinage IA ──────────────────────────────── */}
                <RefinementBar
                  context="email"
                  content={draft}
                  onRefined={setDraft}
                  disabled={drafting || sending}
                />

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button onClick={() => handleGenerateDraft(selected)} disabled={drafting} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #ddd", background: "#f5f5f5", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
                    ↻ Regénérer
                  </button>
                  <button
                    onClick={() => handleSend(selected)}
                    disabled={sending}
                    style={{ ...btnPrimary, flex: 2, opacity: sending ? 0.7 : 1 }}
                  >
                    {sending ? <><Spinner /> Envoi…</> : "Envoyer →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Onglet Demandes ──────────────────────────────────────────────────────────

function OngletDemandes({
  demandes,
  onCreateDevis,
  devisAcceptes,
  onDemarrerLivraison,
  onDelete,
  historique,
}: {
  demandes:            Demande[];
  onCreateDevis:       (demandeId: string) => Promise<void>;
  devisAcceptes:       Record<string, string>;
  onDemarrerLivraison: (demandeId: string) => void;
  onDelete:            (id: string) => Promise<void>;
  historique:          HistoriqueItem[];
}) {
  const [modal,         setModal]         = useState<Demande | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Demande | null>(null);
  const [loadingIds,    setLoadingIds]    = useState<Set<string>>(new Set());
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [showHisto,     setShowHisto]     = useState(false);

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await onDelete(deleteConfirm.id);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  }

  async function handleCreate(d: Demande) {
    setLoadingIds(prev => new Set(prev).add(d.id));
    await onCreateDevis(d.id);
    setLoadingIds(prev => { const s = new Set(prev); s.delete(d.id); return s; });
  }

  if (demandes.length === 0) {
    return <EmptyState message="Aucune demande pour le moment" />;
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {demandes.map(d => (
          <div key={d.id} style={cardStyle}>
            {/* En-tête carte */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "#1a1a1a" }}>
                  {d.client_nom} {d.client_prenom}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{d.client_email}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <UrgenceBadge score={d.scoring_urgence} />
                <button
                  onClick={() => setDeleteConfirm(d)}
                  title="Supprimer cette demande"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ccc", display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Infos */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
              {d.secteur && <Tag>{d.secteur}</Tag>}
              {(d.budget_min || d.budget_max) && (
                <Tag>
                  {d.budget_min ? money(d.budget_min, d.devise) : "?"} – {d.budget_max ? money(d.budget_max, d.devise) : "?"}
                </Tag>
              )}
              {d.delai_souhaite && <Tag>Délai : {dateStr(d.delai_souhaite)}</Tag>}
            </div>

            {/* Résumé IA */}
            {d.resume_ia && (
              <p style={{ fontSize: "13px", color: "#555", margin: "0 0 10px", lineHeight: "1.5" }}>
                {d.resume_ia}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => setModal(d)} style={btnSecondary}>
                Voir les détails
              </button>
              <button
                onClick={() => handleCreate(d)}
                disabled={loadingIds.has(d.id)}
                style={{ ...btnPrimary, opacity: loadingIds.has(d.id) ? 0.7 : 1 }}
              >
                {loadingIds.has(d.id) ? <Spinner /> : null}
                {loadingIds.has(d.id) ? "Création…" : "Créer le devis"}
              </button>
              {devisAcceptes[d.id] && (
                <button
                  onClick={() => onDemarrerLivraison(d.id)}
                  style={{ ...btnPrimary, backgroundColor: "#2980B9" }}
                >
                  Démarrer la livraison
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal détails */}
      {modal && (
        <div
          style={{
            position: "fixed", inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1000, display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              backgroundColor: "#fff", width: "100%",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>{modal.titre}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>

            <ModalRow label="Référence" value={modal.reference} />
            <ModalRow label="Client" value={`${modal.client_nom} ${modal.client_prenom}`} />
            <ModalRow label="Email" value={modal.client_email} />
            {modal.entreprise && <ModalRow label="Entreprise" value={modal.entreprise} />}
            <ModalRow label="Secteur" value={modal.secteur || "—"} />
            <ModalRow label="Budget" value={
              modal.budget_min || modal.budget_max
                ? `${modal.budget_min ? money(modal.budget_min, modal.devise) : "?"} – ${modal.budget_max ? money(modal.budget_max, modal.devise) : "?"}`
                : "—"
            } />
            <ModalRow label="Délai souhaité" value={dateStr(modal.delai_souhaite)} />
            <ModalRow label="Statut" value={modal.statut} />
            <ModalRow label="Date de réception" value={dateStr(modal.created_at)} />

            {modal.description && (
              <div style={{ marginTop: "12px" }}>
                <p style={{ fontSize: "12px", color: "#888", fontWeight: 700, marginBottom: "4px" }}>DESCRIPTION</p>
                <p style={{ fontSize: "14px", color: "#333", lineHeight: "1.6", margin: 0 }}>{modal.description}</p>
              </div>
            )}

            {modal.resume_ia && (
              <div style={{ marginTop: "12px", backgroundColor: "#f8f8f8", borderRadius: "10px", padding: "12px" }}>
                <p style={{ fontSize: "12px", color: "#888", fontWeight: 700, marginBottom: "4px" }}>ANALYSE IA</p>
                <p style={{ fontSize: "14px", color: "#333", lineHeight: "1.6", margin: 0 }}>{modal.resume_ia}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal suppression demande ──────────────────────────────────────── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Supprimer cette demande ?</h3>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#555" }}>
              Client : <strong>{deleteConfirm.client_nom} {deleteConfirm.client_prenom}</strong>
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#e74c3c", fontWeight: 600 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === deleteConfirm.id}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#e74c3c", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", opacity: deletingId === deleteConfirm.id ? 0.7 : 1 }}
              >
                {deletingId === deleteConfirm.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Historique ─────────────────────────────────────────────────────── */}
      {historique.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => setShowHisto(h => !h)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#888", padding: "0", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span style={{ fontSize: "16px" }}>{showHisto ? "▾" : "▸"}</span>
            Historique ({historique.length} clôturée{historique.length > 1 ? "s" : ""})
          </button>
          {showHisto && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {historique.map(h => {
                const statutColor = h.statut === "gagnée" ? GREEN : h.statut === "perdue" ? RED : "#888";
                return (
                  <div key={h.id} style={{ ...cardStyle, opacity: 0.75 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#333" }}>{h.titre}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{h.client_nom} · {h.reference}</p>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: statutColor, textTransform: "uppercase" }}>{h.statut}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Onglet Devis ─────────────────────────────────────────────────────────────

const CONDITIONS_PRESETS = [
  "50% à la signature du devis, 50% avant expédition",
  "100% à la signature du devis",
  "30% à la commande, 70% avant expédition",
  "Paiement à 30 jours date de facture",
];

const INCOTERMS_OPTIONS = ["FOB", "EXW", "CIF", "DAP", "DDP", "CFR"];

function newLigne(): LigneDevis {
  return { id: String(Date.now()), description: "", quantite: 1, unite: "forfait", prix_unitaire_ht: 0, tva_taux: 20 };
}

function OngletDevis({
  devis,
  onEnvoyer,
  onRefresh,
  onCreerLivraison,
  onDelete,
  historique,
}: {
  devis:            Devis[];
  onEnvoyer:        (devisId: string) => Promise<void>;
  onRefresh:        () => void;
  onCreerLivraison: (demandeId: string) => void;
  onDelete:         (id: string) => Promise<void>;
  historique:       HistoriqueItem[];
}) {
  const [modal,         setModal]         = useState<Devis | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Devis | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [lignes,        setLignes]        = useState<LigneDevis[]>([]);
  const [objet,         setObjet]         = useState("");
  const [condPmt,       setCondPmt]       = useState("");
  const [incoterms,     setIncoterms]     = useState("");
  const [paysLiv,       setPaysLiv]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);
  const [sending,       setSending]       = useState(false);
  const [showHisto,     setShowHisto]     = useState(false);

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await onDelete(deleteConfirm.id);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  }

  function openModal(d: Devis) {
    setModal(d);
    setLignes(d.lignes?.length ? d.lignes : [newLigne()]);
    setObjet(d.objet ?? "");
    setCondPmt(d.conditions_paiement ?? "");
    setIncoterms(d.incoterms ?? "FOB");
    setPaysLiv(d.pays_livraison ?? "France");
    setNotes(d.notes ?? "");
  }

  function updateLigne(idx: number, field: keyof LigneDevis, value: string | number) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  const totalHT  = lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire_ht), 0);
  const totalTVA = lignes.reduce((s, l) => s + Number(l.quantite) * Number(l.prix_unitaire_ht) * (Number(l.tva_taux) / 100), 0);
  const totalTTC = totalHT + totalTVA;

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    await fetch("/api/admin/devis/modifier", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        devis_id:            modal.id,
        lignes,
        objet:               objet || undefined,
        conditions_paiement: condPmt || undefined,
        incoterms:           incoterms || undefined,
        pays_livraison:      paysLiv || undefined,
        notes:               notes || undefined,
      }),
    });
    setSaving(false);
    setModal(null);
    onRefresh();
  }

  async function handleEnvoyer() {
    if (!modal) return;
    setSending(true);
    await onEnvoyer(modal.id);
    setSending(false);
    setModal(null);
  }

  if (devis.length === 0) return <EmptyState message="Aucun devis pour le moment" />;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {devis.map(d => (
          <div key={d.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
                  {d.client_entreprise || d.client_nom}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{d.reference}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <DevisStatutBadge statut={d.statut} />
                <button
                  onClick={() => setDeleteConfirm(d)}
                  title="Supprimer ce devis"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ccc", display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#555", margin: "0 0 6px", fontStyle: "italic" }}>
              {d.objet || d.demande_titre}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {d.montant_ttc > 0
                ? <Tag><strong>{money(d.montant_ttc, d.devise)}</strong> TTC ({d.lignes?.length ?? 0} ligne{(d.lignes?.length ?? 0) > 1 ? "s" : ""})</Tag>
                : <span style={{ backgroundColor: "#fef0ef", color: RED, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>Montant à définir</span>
              }
              {d.incoterms      && <Tag>{d.incoterms}</Tag>}
              {d.pays_livraison && <Tag>Livraison : {d.pays_livraison}</Tag>}
              {d.date_envoi     && <Tag>Envoyé le {dateStr(d.date_envoi)}</Tag>}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => openModal(d)} style={btnSecondary}>Voir / Modifier</button>
              {d.statut === "brouillon" && (
                <button onClick={() => { openModal(d); }} style={btnPrimary}>
                  Envoyer au client
                </button>
              )}
              {d.statut === "accepté" && (
                <button
                  onClick={() => onCreerLivraison(d.demande_id)}
                  style={{ ...btnPrimary, backgroundColor: "#2980B9" }}
                >
                  Créer la livraison
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal devis complet ──────────────────────────────────────────── */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => setModal(null)}
        >
          <div
            style={{ backgroundColor: "#f5f5f5", width: "100%", borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div style={{ backgroundColor: RED, color: "#fff", padding: "16px 20px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "16px" }}>{modal.reference}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.85 }}>
                  <DevisStatutBadge statut={modal.statut} />
                </p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", color: "#fff" }}>✕</button>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* ── Émetteur ──────────────────────────────────────────────── */}
              <Section titre="CNL Sourcing — Émetteur">
                <InfoRow label="Raison sociale" value="CNL Sourcing" />
                <InfoRow label="Email"          value="cnlsourcingvn@gmail.com" />
                <InfoRow label="Site"           value="cnlsourcing.com" />
              </Section>

              {/* ── Client ────────────────────────────────────────────────── */}
              <Section titre="Client">
                <InfoRow label="Entreprise"  value={modal.client_entreprise || "—"} />
                <InfoRow label="Contact"     value={`${modal.client_prenom} ${modal.client_nom}`.trim()} />
                <InfoRow label="Email"       value={modal.client_email} />
                {modal.client_telephone && <InfoRow label="Téléphone" value={modal.client_telephone} />}
                {(modal.client_adresse || modal.client_ville) && (
                  <InfoRow
                    label="Adresse"
                    value={[modal.client_adresse, modal.client_code_postal, modal.client_ville, modal.client_pays].filter(Boolean).join(", ")}
                  />
                )}
                {modal.client_siret    && <InfoRow label="SIRET"        value={modal.client_siret} />}
                {modal.client_tva_intra && <InfoRow label="N° TVA intra" value={modal.client_tva_intra} />}
              </Section>

              {/* ── Objet ─────────────────────────────────────────────────── */}
              <Section titre="Objet de la mission">
                <textarea
                  value={objet}
                  onChange={e => setObjet(e.target.value)}
                  placeholder="Ex : Mission de sourcing — identification et qualification de fournisseurs textile certifiés GOTS au Vietnam"
                  rows={2}
                  style={textareaStyle}
                />
              </Section>

              {/* ── Lignes de prestation ──────────────────────────────────── */}
              <Section titre={`Prestations (${lignes.length} ligne${lignes.length > 1 ? "s" : ""})`}>
                {lignes.map((l, idx) => (
                  <div key={l.id} style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", marginBottom: "8px", border: "1px solid #e8e8e8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#888" }}>LIGNE {idx + 1}</span>
                      {lignes.length > 1 && (
                        <button
                          onClick={() => setLignes(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
                        >✕</button>
                      )}
                    </div>

                    <label style={fieldLabel}>Description</label>
                    <input
                      value={l.description}
                      onChange={e => updateLigne(idx, "description", e.target.value)}
                      placeholder="Ex : Honoraires de sourcing fournisseurs"
                      style={{ ...inputStyle, marginBottom: "8px" }}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={fieldLabel}>Quantité</label>
                        <input type="number" min="0" step="0.01" value={l.quantite}
                          onChange={e => updateLigne(idx, "quantite", parseFloat(e.target.value) || 0)}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={fieldLabel}>Prix unitaire HT</label>
                        <input type="number" min="0" step="0.01" value={l.prix_unitaire_ht}
                          onChange={e => updateLigne(idx, "prix_unitaire_ht", parseFloat(e.target.value) || 0)}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={fieldLabel}>TVA %</label>
                        <select value={l.tva_taux}
                          onChange={e => updateLigne(idx, "tva_taux", parseFloat(e.target.value))}
                          style={{ ...inputStyle, padding: "10px 8px" }}>
                          <option value={0}>0%</option>
                          <option value={5.5}>5,5%</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                        </select>
                      </div>
                    </div>

                    <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#888", textAlign: "right" }}>
                      Sous-total : <strong>{money(l.quantite * l.prix_unitaire_ht, modal.devise)}</strong> HT
                    </p>
                  </div>
                ))}

                <button
                  onClick={() => setLignes(prev => [...prev, newLigne()])}
                  style={{ ...btnSecondary, width: "100%", justifyContent: "center", display: "flex" }}
                >
                  + Ajouter une ligne
                </button>

                {/* Récapitulatif financier */}
                <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px", marginTop: "8px", border: `1px solid ${RED}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>Total HT</span>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{money(totalHT, modal.devise)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                    <span style={{ fontSize: "14px", color: "#666" }}>TVA</span>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{money(totalTVA, modal.devise)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px", borderTop: "1px solid #eee", marginTop: "4px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: RED }}>Total TTC</span>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: RED }}>{money(totalTTC, modal.devise)}</span>
                  </div>
                </div>
              </Section>

              {/* ── Conditions ────────────────────────────────────────────── */}
              <Section titre="Conditions">
                <label style={fieldLabel}>Conditions de paiement</label>
                <select value={condPmt} onChange={e => setCondPmt(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }}>
                  <option value="">— Choisir —</option>
                  {CONDITIONS_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {!CONDITIONS_PRESETS.includes(condPmt) && (
                  <input value={condPmt} onChange={e => setCondPmt(e.target.value)}
                    placeholder="Ou saisir des conditions personnalisées…"
                    style={{ ...inputStyle, marginBottom: "8px" }} />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div>
                    <label style={fieldLabel}>Incoterms</label>
                    <select value={incoterms} onChange={e => setIncoterms(e.target.value)} style={inputStyle}>
                      <option value="">—</option>
                      {INCOTERMS_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Pays de livraison</label>
                    <input value={paysLiv} onChange={e => setPaysLiv(e.target.value)}
                      placeholder="France" style={inputStyle} />
                  </div>
                </div>

                <label style={fieldLabel}>Notes internes (non visibles par le client)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Remarques fournisseur, conditions particulières…"
                  rows={2} style={textareaStyle} />
              </Section>

              {/* ── Actions ───────────────────────────────────────────────── */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingBottom: "8px" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...btnSecondary, flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? <Spinner /> : null}
                  {saving ? "Sauvegarde…" : "Sauvegarder"}
                </button>
                {modal.statut === "brouillon" && (
                  <button
                    onClick={handleEnvoyer}
                    disabled={sending}
                    style={{ ...btnPrimary, flex: 1, justifyContent: "center", opacity: sending ? 0.7 : 1 }}
                  >
                    {sending ? <Spinner /> : null}
                    {sending ? "Envoi…" : "Envoyer au client"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal suppression devis ──────────────────────────────────────── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Supprimer ce devis ?</h3>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#555" }}>
              {deleteConfirm.objet || deleteConfirm.demande_titre} — <strong>{money(deleteConfirm.montant_ttc, deleteConfirm.devise)}</strong>
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#e74c3c", fontWeight: 600 }}>
              La facture associée ne sera pas supprimée.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deletingId === deleteConfirm.id}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#e74c3c", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", opacity: deletingId === deleteConfirm.id ? 0.7 : 1 }}>
                {deletingId === deleteConfirm.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Historique devis ──────────────────────────────────────────────── */}
      {historique.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => setShowHisto(h => !h)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#888", padding: "0", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span style={{ fontSize: "16px" }}>{showHisto ? "▾" : "▸"}</span>
            Historique ({historique.length} clôturé{historique.length > 1 ? "s" : ""})
          </button>
          {showHisto && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {historique.map(h => {
                const statutColor = h.statut === "accepté" ? GREEN : h.statut === "refusé" ? RED : "#888";
                return (
                  <div key={h.id} style={{ ...cardStyle, opacity: 0.75 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#333" }}>{h.demande_titre ?? h.titre}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                          {h.client_nom} · {h.reference}
                          {h.montant_ttc ? ` · ${money(h.montant_ttc, h.devise)}` : ""}
                        </p>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: statutColor, textTransform: "uppercase" }}>{h.statut}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Composants formulaire ────────────────────────────────────────────────────

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid #efefef" }}>
      <div style={{ backgroundColor: "#f8f8f8", borderBottom: "1px solid #efefef", padding: "10px 14px" }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{titre}</p>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f5f5f5" }}>
      <span style={{ fontSize: "13px", color: "#999", fontWeight: 600, minWidth: "110px" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#333", textAlign: "right", flex: 1 }}>{value}</span>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 700,
  color: "#666", marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1.5px solid #e0e0e0", borderRadius: "8px",
  fontSize: "14px", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
  backgroundColor: "#fafafa",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical" as const,
} as React.CSSProperties;

// ─── Onglet Factures ──────────────────────────────────────────────────────────

function OngletFactures({
  factures,
  onRelancer,
  onDelete,
  historique,
}: {
  factures:    Facture[];
  onRelancer:  (factureId: string) => Promise<string>;
  onDelete:    (id: string) => Promise<void>;
  historique:  HistoriqueItem[];
}) {
  const [loadingIds,    setLoadingIds]    = useState<Set<string>>(new Set());
  const [emailPreview,  setEmailPreview]  = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Facture | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [showHisto,     setShowHisto]     = useState(false);

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await onDelete(deleteConfirm.id);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  }

  async function handleRelancer(id: string) {
    setLoadingIds(prev => new Set(prev).add(id));
    const email = await onRelancer(id);
    setLoadingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    if (email) setEmailPreview(email);
  }

  if (factures.length === 0) {
    return <EmptyState message="Aucune facture pour le moment" />;
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {factures.map(f => (
          <div key={f.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>{f.client_nom}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{f.reference}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <StatutPaiementBadge facture={f} />
                <button
                  onClick={() => setDeleteConfirm(f)}
                  title="Supprimer cette facture"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ccc", display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              <Tag><strong>{money(f.montant_ttc, f.devise)}</strong></Tag>
              {f.date_echeance && <Tag>Échéance : {dateStr(f.date_echeance)}</Tag>}
              {f.date_emission && <Tag>Émise le : {dateStr(f.date_emission)}</Tag>}
            </div>

            {(f.statut_paiement === "en_attente" || f.en_retard) && (
              <button
                onClick={() => handleRelancer(f.id)}
                disabled={loadingIds.has(f.id)}
                style={{ ...btnPrimary, opacity: loadingIds.has(f.id) ? 0.7 : 1 }}
              >
                {loadingIds.has(f.id) ? <Spinner /> : null}
                {loadingIds.has(f.id) ? "Génération email…" : "Relancer le client"}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Modal suppression facture ──────────────────────────────────────── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Supprimer cette facture ?</h3>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#555" }}>
              {deleteConfirm.reference} — <strong>{money(deleteConfirm.montant_ttc, deleteConfirm.devise)}</strong>
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#e74c3c", fontWeight: 600 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deletingId === deleteConfirm.id}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#e74c3c", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", opacity: deletingId === deleteConfirm.id ? 0.7 : 1 }}>
                {deletingId === deleteConfirm.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal aperçu email de relance */}
      {emailPreview && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => setEmailPreview(null)}
        >
          <div
            style={{ backgroundColor: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Email envoyé</h3>
              <button onClick={() => setEmailPreview(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ backgroundColor: "#f0faf4", border: "1px solid #a8d5b8", borderRadius: "10px", padding: "16px" }}>
              <p style={{ fontSize: "12px", color: GREEN, fontWeight: 700, marginBottom: "8px" }}>EMAIL ENVOYÉ AU CLIENT</p>
              <p style={{ fontSize: "14px", lineHeight: "1.7", color: "#333", margin: 0, whiteSpace: "pre-wrap" }}>{emailPreview}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Historique factures payées ────────────────────────────────────── */}
      {historique.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={() => setShowHisto(h => !h)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#888", padding: "0", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span style={{ fontSize: "16px" }}>{showHisto ? "▾" : "▸"}</span>
            Payées ({historique.length} facture{historique.length > 1 ? "s" : ""})
          </button>
          {showHisto && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {historique.map(h => (
                <div key={h.id} style={{ ...cardStyle, opacity: 0.75 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#333" }}>{h.client_nom}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                        {h.reference}
                        {h.montant_ttc ? ` · ${money(h.montant_ttc, h.devise)}` : ""}
                      </p>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: GREEN, textTransform: "uppercase" }}>payé</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Onglet Coûts IA ──────────────────────────────────────────────────────────

function OngletCoutsIA({ couts }: { couts: CoutsMois }) {
  const pct     = Math.min(100, Math.round((couts.cout_mois_eur / couts.budget_eur) * 100));
  const alerte  = pct >= 80;
  const barColor = pct >= 80 ? RED : pct >= 60 ? ONG : GREEN;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {alerte && (
        <div style={{ backgroundColor: "#fef3f2", border: `1px solid ${RED}`, borderRadius: "12px", padding: "14px 16px" }}>
          <p style={{ margin: 0, color: RED, fontWeight: 700, fontSize: "14px" }}>
            Attention — {pct}% du budget mensuel utilisé
          </p>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: "13px" }}>
            Vous approchez de la limite de {couts.budget_eur}€ ce mois-ci.
          </p>
        </div>
      )}

      {/* Budget */}
      <div style={cardStyle}>
        <p style={labelStyle}>Budget IA ce mois</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
          <span style={{ fontSize: "28px", fontWeight: 800, color: barColor }}>
            {couts.cout_mois_eur.toFixed(2)} €
          </span>
          <span style={{ fontSize: "14px", color: "#888" }}>sur {couts.budget_eur} €</span>
        </div>
        {/* Barre de progression */}
        <div style={{ backgroundColor: "#f0f0f0", borderRadius: "20px", height: "12px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: "20px", transition: "width 0.6s ease" }} />
        </div>
        <p style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>{pct}% consommé</p>
      </div>

      {/* Répartition modèles */}
      <div style={cardStyle}>
        <p style={labelStyle}>Répartition des modèles IA</p>
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1, backgroundColor: "#f0faf4", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: GREEN }}>{couts.pct_haiku}%</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666" }}>Haiku (économique)</p>
          </div>
          <div style={{ flex: 1, backgroundColor: "#fef3f2", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: RED }}>{couts.pct_sonnet}%</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666" }}>Sonnet (avancé)</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <Tag>{couts.nb_requetes} conversations</Tag>
          <Tag>{couts.taux_cache_pct}% en cache</Tag>
        </div>
      </div>
    </div>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n} onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "28px", padding: "0 2px", color: n <= value ? "#F59E0B" : "#ddd" }}
        >★</button>
      ))}
    </div>
  );
}

// ─── Onglet Fournisseurs ──────────────────────────────────────────────────────

const SECTEUR_COLORS: Record<string, string> = {
  textile: "#8B5CF6", "agro-alimentaire": "#10B981", agro: "#10B981",
  artisanat: "#F59E0B", electronique: "#3B82F6", cosmetique: "#EC4899", meuble: "#6B7280",
};

function getSecteurColor(secteur: string | null) {
  if (!secteur) return "#999";
  return SECTEUR_COLORS[secteur.toLowerCase()] ?? "#2980B9";
}

function getInitiales(nom: string) {
  return nom.split(" ").map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function OngletFournisseurs({
  fournisseurs,
  demandes,
  onRefresh,
  onShowToast,
}: {
  fournisseurs: Fournisseur[];
  demandes:     DemandeContexte[];
  onRefresh:    () => void;
  onShowToast:  (msg: string, type: "ok" | "err") => void;
}) {
  const [search,        setSearch]        = useState("");
  const [filterSecteur, setFilterSecteur] = useState("");
  const [filterActif,   setFilterActif]   = useState<"actif" | "inactif" | "tous">("actif");
  const [editModal,     setEditModal]     = useState<Fournisseur | "new" | null>(null);
  const [notationModal, setNotationModal] = useState<Fournisseur | null>(null);
  const [associerModal, setAssocierModal] = useState<Fournisseur | null>(null);
  const [deleteModal,   setDeleteModal]   = useState<Fournisseur | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);

  // Form add/edit
  const emptyForm = { nom: "", secteur: "", ville: "", region: "", pays: "Vietnam",
    certifications: "", moq_min: "", moq_unite: "pièces",
    delai_production_min: "", delai_production_max: "",
    incoterms_acceptes: "", contact_nom: "", contact_tel: "",
    contact_email: "", contact_langue: "vi", notes_terrain: "", actif: true };
  const [form, setForm] = useState(emptyForm);

  // Form notation
  const [noteQualite, setNoteQualite] = useState(3);
  const [noteDelais,  setNoteDelais]  = useState(3);
  const [noteComm,    setNoteComm]    = useState(3);
  const [notesTerr,   setNotesTerr]   = useState("");

  function openEdit(f: Fournisseur | "new") {
    if (f === "new") {
      setForm(emptyForm);
    } else {
      setForm({
        nom: f.nom, secteur: f.secteur ?? "", ville: f.ville ?? "",
        region: f.region ?? "", pays: f.pays,
        certifications: (f.certifications ?? []).join(", "),
        moq_min: f.moq_min ? String(f.moq_min) : "", moq_unite: f.moq_unite ?? "pièces",
        delai_production_min: f.delai_production_min ? String(f.delai_production_min) : "",
        delai_production_max: f.delai_production_max ? String(f.delai_production_max) : "",
        incoterms_acceptes: (f.incoterms_acceptes ?? []).join(", "),
        contact_nom: f.contact_nom ?? "", contact_tel: f.contact_tel ?? "",
        contact_email: f.contact_email ?? "", contact_langue: f.contact_langue ?? "vi",
        notes_terrain: f.notes_terrain ?? "", actif: f.actif,
      });
    }
    setEditModal(f);
  }

  function openNotation(f: Fournisseur) {
    setNoteQualite(Math.round(f.note_qualite ?? 3));
    setNoteDelais(Math.round(f.note_delais ?? 3));
    setNoteComm(Math.round(f.note_communication ?? 3));
    setNotesTerr(f.notes_terrain ?? "");
    setNotationModal(f);
  }

  async function handleSave() {
    if (!form.nom) { onShowToast("Le nom est requis", "err"); return; }
    setSaving(true);
    try {
      const body = {
        nom: form.nom, secteur: form.secteur || null, ville: form.ville || null,
        region: form.region || null, pays: form.pays,
        certifications: form.certifications ? form.certifications.split(",").map(s => s.trim()).filter(Boolean) : [],
        moq_min: form.moq_min ? parseInt(form.moq_min) : null, moq_unite: form.moq_unite || null,
        delai_production_min: form.delai_production_min ? parseInt(form.delai_production_min) : null,
        delai_production_max: form.delai_production_max ? parseInt(form.delai_production_max) : null,
        incoterms_acceptes: form.incoterms_acceptes ? form.incoterms_acceptes.split(",").map(s => s.trim()).filter(Boolean) : [],
        contact_nom: form.contact_nom || null, contact_tel: form.contact_tel || null,
        contact_email: form.contact_email || null, contact_langue: form.contact_langue,
        notes_terrain: form.notes_terrain || null, actif: form.actif,
      };
      const isNew = editModal === "new";
      const url    = isNew ? "/api/admin/fournisseurs" : `/api/admin/fournisseurs/${(editModal as Fournisseur).id}`;
      const method = isNew ? "POST" : "PATCH";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json   = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast(isNew ? "Fournisseur créé" : "Fournisseur mis à jour", "ok");
      setEditModal(null);
      onRefresh();
    } finally { setSaving(false); }
  }

  async function handleNotation() {
    if (!notationModal) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/fournisseurs/${notationModal.id}/noter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_qualite: noteQualite, note_delais: noteDelais, note_communication: noteComm, notes_terrain: notesTerr || null }),
      });
      const json = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast("Notation enregistrée", "ok");
      setNotationModal(null);
      onRefresh();
    } finally { setSaving(false); }
  }

  async function handleDeleteFournisseur() {
    if (!deleteModal) return;
    setDeletingId(deleteModal.id);
    try {
      const res = await fetch(`/api/admin/fournisseurs/${deleteModal.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast("Fournisseur supprimé", "ok");
      setDeleteModal(null);
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  const secteurs = Array.from(new Set(fournisseurs.map(f => f.secteur).filter((s): s is string => !!s)));
  const filtered = fournisseurs.filter(f => {
    if (filterActif === "actif"   && !f.actif) return false;
    if (filterActif === "inactif" &&  f.actif) return false;
    if (filterSecteur && f.secteur !== filterSecteur) return false;
    if (search && !f.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Recherche + filtres */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur…" style={{ ...inputStyle, backgroundColor: "#fff" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          <select value={filterSecteur} onChange={e => setFilterSecteur(e.target.value)}
            style={{ ...inputStyle, flex: 1, padding: "8px 10px" }}>
            <option value="">Tous secteurs</option>
            {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterActif} onChange={e => setFilterActif(e.target.value as "actif" | "inactif" | "tous")}
            style={{ ...inputStyle, flex: 1, padding: "8px 10px" }}>
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
            <option value="tous">Tous</option>
          </select>
        </div>
        <button onClick={() => openEdit("new")} style={{ ...btnPrimary, justifyContent: "center" }}>
          + Ajouter un fournisseur
        </button>
      </div>

      {filtered.length === 0 && <EmptyState message="Aucun fournisseur trouvé" />}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.map(f => (
          <div key={f.id} style={cardStyle}>
            {/* En-tête */}
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
                backgroundColor: getSecteurColor(f.secteur),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: "15px",
              }}>
                {getInitiales(f.nom)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "#1a1a1a" }}>{f.nom}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                  {[f.ville, f.pays].filter(Boolean).join(", ")}
                </p>
              </div>
              {f.note_fiabilite !== null && (
                <div style={{ fontSize: "13px", color: "#F59E0B", whiteSpace: "nowrap", textAlign: "right" }}>
                  {"★".repeat(Math.round(f.note_fiabilite))}{"☆".repeat(5 - Math.round(f.note_fiabilite))}
                  <p style={{ margin: "1px 0 0", fontSize: "10px", color: "#aaa" }}>{f.nb_missions} mission{f.nb_missions !== 1 ? "s" : ""}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
              {f.secteur && <Tag>{f.secteur}</Tag>}
              {(f.certifications ?? []).map(c => (
                <span key={c} style={{ backgroundColor: "#EFF6FF", color: "#2563EB", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>{c}</span>
              ))}
              {f.moq_min ? <Tag>MOQ {f.moq_min} {f.moq_unite ?? ""}</Tag> : null}
              {(f.delai_production_min || f.delai_production_max) && (
                <Tag>{f.delai_production_min ?? "?"}-{f.delai_production_max ?? "?"}j prod.</Tag>
              )}
              {f.derniere_mission_date && <Tag>Dernière mission : {dateStr(f.derniere_mission_date)}</Tag>}
            </div>

            {f.notes_terrain && (
              <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px", lineHeight: "1.5", fontStyle: "italic" }}>
                {f.notes_terrain}
              </p>
            )}

            {/* Boutons */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => openEdit(f)} style={btnSecondary}>Modifier</button>
              <button onClick={() => openNotation(f)} style={{ ...btnSecondary, color: "#F59E0B" }}>★ Noter</button>
              <button onClick={() => setAssocierModal(f)} style={{ ...btnSecondary, fontSize: "13px" }}>Associer demande</button>
              <button
                onClick={() => setDeleteModal(f)}
                title="Supprimer ce fournisseur"
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ccc", display: "flex", alignItems: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal Add/Edit ──────────────────────────────────────────── */}
      {editModal !== null && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => setEditModal(null)}>
          <div style={{ backgroundColor: "#f5f5f5", width: "100%", borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ backgroundColor: RED, color: "#fff", padding: "16px 20px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "16px" }}>
                {editModal === "new" ? "Nouveau fournisseur" : `Modifier — ${(editModal as Fournisseur).nom}`}
              </p>
              <button onClick={() => setEditModal(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", color: "#fff" }}>✕</button>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <Section titre="Identification">
                <label style={fieldLabel}>Nom *</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Thanh Long Textile" style={{ ...inputStyle, marginBottom: "8px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>Secteur</label>
                    <input value={form.secteur} onChange={e => setForm(p => ({ ...p, secteur: e.target.value }))} placeholder="textile, agro…" style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Pays</label>
                    <input value={form.pays} onChange={e => setForm(p => ({ ...p, pays: e.target.value }))} style={inputStyle} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>Ville</label>
                    <input value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} placeholder="Hanoï" style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Région</label>
                    <input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} placeholder="Nord" style={inputStyle} /></div>
                </div>
                <label style={fieldLabel}>Certifications (séparées par virgules)</label>
                <input value={form.certifications} onChange={e => setForm(p => ({ ...p, certifications: e.target.value }))} placeholder="ISO9001, HACCP, BIO…" style={{ ...inputStyle, marginBottom: "8px" }} />
                <label style={fieldLabel}>Incoterms acceptés</label>
                <input value={form.incoterms_acceptes} onChange={e => setForm(p => ({ ...p, incoterms_acceptes: e.target.value }))} placeholder="FOB, EXW, CIF…" style={inputStyle} />
              </Section>

              <Section titre="Production">
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>MOQ minimum</label>
                    <input type="number" min="0" value={form.moq_min} onChange={e => setForm(p => ({ ...p, moq_min: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Unité</label>
                    <input value={form.moq_unite} onChange={e => setForm(p => ({ ...p, moq_unite: e.target.value }))} placeholder="pièces" style={inputStyle} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><label style={fieldLabel}>Délai min (jours)</label>
                    <input type="number" min="0" value={form.delai_production_min} onChange={e => setForm(p => ({ ...p, delai_production_min: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Délai max (jours)</label>
                    <input type="number" min="0" value={form.delai_production_max} onChange={e => setForm(p => ({ ...p, delai_production_max: e.target.value }))} style={inputStyle} /></div>
                </div>
              </Section>

              <Section titre="Contact">
                <label style={fieldLabel}>Nom du contact</label>
                <input value={form.contact_nom} onChange={e => setForm(p => ({ ...p, contact_nom: e.target.value }))} style={{ ...inputStyle, marginBottom: "8px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>Téléphone / WhatsApp</label>
                    <input value={form.contact_tel} onChange={e => setForm(p => ({ ...p, contact_tel: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Langue</label>
                    <select value={form.contact_langue} onChange={e => setForm(p => ({ ...p, contact_langue: e.target.value }))} style={{ ...inputStyle, padding: "10px 8px" }}>
                      <option value="vi">Vietnamien</option>
                      <option value="en">Anglais</option>
                      <option value="fr">Français</option>
                      <option value="zh">Chinois</option>
                    </select></div>
                </div>
                <label style={fieldLabel}>Email</label>
                <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} style={inputStyle} />
              </Section>

              <Section titre="Notes terrain">
                <textarea value={form.notes_terrain} onChange={e => setForm(p => ({ ...p, notes_terrain: e.target.value }))}
                  placeholder="Observations, points d'attention, retours de visite…" rows={3} style={textareaStyle} />
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", fontSize: "14px", color: "#444", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.actif} onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))} />
                  Fournisseur actif
                </label>
              </Section>

              <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
                <button onClick={() => setEditModal(null)} style={{ ...btnSecondary, flex: 1, justifyContent: "center" }}>Annuler</button>
                <button onClick={handleSave} disabled={saving || !form.nom}
                  style={{ ...btnPrimary, flex: 2, justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", opacity: (saving || !form.nom) ? 0.7 : 1 }}>
                  {saving ? <Spinner /> : null}
                  {saving ? "Sauvegarde…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Notation ──────────────────────────────────────────── */}
      {notationModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001, display: "flex", alignItems: "flex-end" }}
          onClick={() => setNotationModal(null)}>
          <div style={{ backgroundColor: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Noter la mission</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>{notationModal.nom}</p>
              </div>
              <button onClick={() => setNotationModal(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ ...fieldLabel, marginBottom: "8px" }}>Qualité des produits</label>
                <StarRating value={noteQualite} onChange={setNoteQualite} />
              </div>
              <div>
                <label style={{ ...fieldLabel, marginBottom: "8px" }}>Respect des délais</label>
                <StarRating value={noteDelais} onChange={setNoteDelais} />
              </div>
              <div>
                <label style={{ ...fieldLabel, marginBottom: "8px" }}>Communication / réactivité</label>
                <StarRating value={noteComm} onChange={setNoteComm} />
              </div>
              <div>
                <label style={fieldLabel}>Notes terrain</label>
                <textarea value={notesTerr} onChange={e => setNotesTerr(e.target.value)}
                  placeholder="Observations pour la prochaine mission…" rows={3} style={textareaStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => setNotationModal(null)} style={{ ...btnSecondary, flex: 1, justifyContent: "center" }}>Annuler</button>
              <button onClick={handleNotation} disabled={saving}
                style={{ ...btnPrimary, flex: 2, justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", opacity: saving ? 0.7 : 1 }}>
                {saving ? <Spinner /> : null}
                {saving ? "Enregistrement…" : "Enregistrer la note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Associer à demande ─────────────────────────────────── */}
      {associerModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001, display: "flex", alignItems: "flex-end" }}
          onClick={() => setAssocierModal(null)}>
          <div style={{ backgroundColor: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", maxHeight: "75vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Associer à une demande</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>{associerModal.nom}</p>
              </div>
              <button onClick={() => setAssocierModal(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            {demandes.filter(d => !["gagnée","perdue","annulée"].includes(d.statut)).length === 0
              ? <EmptyState message="Aucune demande en cours" />
              : demandes.filter(d => !["gagnée","perdue","annulée"].includes(d.statut)).map(d => (
                <div key={d.id} style={{ ...cardStyle, marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{d.titre}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{d.client_nom} · {d.secteur || "—"}</p>
                  </div>
                  <button onClick={() => setAssocierModal(null)} style={{ ...btnPrimary, fontSize: "12px", padding: "6px 12px" }}>
                    Sélectionner
                  </button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Modal suppression fournisseur ──────────────────────────────────── */}
      {deleteModal && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Supprimer ce fournisseur ?</h3>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#555" }}>
              <strong>{deleteModal.nom}</strong>
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#e74c3c", fontWeight: 600 }}>
              Attention : ses livraisons associées resteront en base.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteFournisseur}
                disabled={deletingId === deleteModal.id}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#e74c3c", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", opacity: deletingId === deleteModal.id ? 0.7 : 1 }}
              >
                {deletingId === deleteModal.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Onglet Livraisons ────────────────────────────────────────────────────────

const STATUTS_LIV = ["en_production", "expedie", "en_transit", "dedouanement", "livre"] as const;
const STATUTS_LIV_LABELS: Record<string, string> = {
  en_production: "Production", expedie: "Expédié",
  en_transit: "Transit", dedouanement: "Dédouanement", livre: "Livré",
};
const MODES_TRANSPORT = ["maritime", "aerien", "groupage"];

function LivraisonTimeline({ statut }: { statut: string }) {
  const currentIdx = STATUTS_LIV.indexOf(statut as typeof STATUTS_LIV[number]);
  return (
    <div style={{ display: "flex", alignItems: "center", margin: "10px 0 6px" }}>
      {STATUTS_LIV.map((step, idx) => (
        <React.Fragment key={step}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{
              width: "13px", height: "13px", borderRadius: "50%", flexShrink: 0,
              backgroundColor: idx < currentIdx ? GREEN : idx === currentIdx ? RED : "#ddd",
            }} />
            <p style={{ margin: "3px 0 0", fontSize: "9px", color: idx === currentIdx ? RED : "#999", textAlign: "center", fontWeight: idx === currentIdx ? 700 : 400, lineHeight: "1.2" }}>
              {STATUTS_LIV_LABELS[step]}
            </p>
          </div>
          {idx < STATUTS_LIV.length - 1 && (
            <div style={{ flex: 2, height: "2px", backgroundColor: idx < currentIdx ? GREEN : "#e0e0e0", marginBottom: "13px" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function OngletLivraisons({
  livraisons,
  fournisseurs,
  demandes,
  initDemandeId,
  onClearInitDemande,
  onRefresh,
  onShowToast,
}: {
  livraisons:         Livraison[];
  fournisseurs:       Fournisseur[];
  demandes:           DemandeContexte[];
  initDemandeId:      string | null;
  onClearInitDemande: () => void;
  onRefresh:          () => void;
  onShowToast:        (msg: string, type: "ok" | "err") => void;
}) {
  const [modalCreate,   setModalCreate]   = useState(false);
  const [modalStatut,   setModalStatut]   = useState<Livraison | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Livraison | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);
  const [checklist,     setChecklist]     = useState<Record<string, ChecklistDoc[]>>({});
  const [newStatut,     setNewStatut]     = useState("");
  const [loadingStatut, setLoadingStatut] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const emptyForm = {
    demande_id: "", fournisseur_id: "", mode_transport: "maritime",
    incoterm: "FOB", transitaire: "", date_expedition: "", date_arrivee_estimee: "",
    numero_tracking: "", port_depart: "Haiphong", port_arrivee: "Le Havre",
    poids_kg: "", volume_m3: "", valeur_marchandise: "", devise: "EUR", notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Auto-ouvre le modal si initDemandeId est défini (depuis onglet Demandes/Devis)
  useEffect(() => {
    if (initDemandeId) {
      setForm(p => ({ ...p, demande_id: initDemandeId }));
      setModalCreate(true);
      onClearInitDemande();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initDemandeId]);

  async function loadChecklist(livraisonId: string) {
    if (checklist[livraisonId]) return;
    const res = await fetch(`/api/admin/checklist/${livraisonId}`);
    if (res.ok) {
      const json = await res.json();
      setChecklist(p => ({ ...p, [livraisonId]: json.docs }));
    }
  }

  async function handleToggleDoc(doc: ChecklistDoc) {
    const res = await fetch(`/api/admin/checklist/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ obtenu: !doc.obtenu }),
    });
    if (res.ok) {
      setChecklist(p => ({
        ...p,
        [doc.livraison_id]: (p[doc.livraison_id] ?? []).map(d =>
          d.id === doc.id ? { ...d, obtenu: !d.obtenu, date_obtention: !d.obtenu ? new Date().toISOString() : null } : d
        ),
      }));
    }
  }

  async function handleCreate() {
    if (!form.demande_id) { onShowToast("Sélectionnez une demande", "err"); return; }
    setLoadingCreate(true);
    try {
      const res = await fetch("/api/admin/livraisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demande_id:          form.demande_id || null,
          fournisseur_id:      form.fournisseur_id || null,
          mode_transport:      form.mode_transport,
          incoterm:            form.incoterm || null,
          transitaire:         form.transitaire || null,
          date_expedition:     form.date_expedition || null,
          date_arrivee_estimee: form.date_arrivee_estimee || null,
          numero_tracking:     form.numero_tracking || null,
          port_depart:         form.port_depart || null,
          port_arrivee:        form.port_arrivee || null,
          poids_kg:            form.poids_kg ? parseFloat(form.poids_kg) : null,
          volume_m3:           form.volume_m3 ? parseFloat(form.volume_m3) : null,
          valeur_marchandise:  form.valeur_marchandise ? parseFloat(form.valeur_marchandise) : null,
          devise:              form.devise,
          notes:               form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast("Livraison créée — checklist initialisée", "ok");
      setModalCreate(false);
      setForm(emptyForm);
      onRefresh();
    } finally { setLoadingCreate(false); }
  }

  async function handleChangerStatut() {
    if (!modalStatut || !newStatut) return;
    setLoadingStatut(true);
    try {
      const res = await fetch(`/api/admin/livraisons/${modalStatut.id}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });
      const json = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast(`Statut : ${STATUTS_LIV_LABELS[newStatut]}`, "ok");
      setModalStatut(null);
      onRefresh();
    } finally { setLoadingStatut(false); }
  }

  async function handleDeleteLivraison() {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      const res  = await fetch(`/api/admin/livraisons/${deleteConfirm.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { onShowToast(json.error || "Erreur", "err"); return; }
      onShowToast("Livraison supprimée", "ok");
      setDeleteConfirm(null);
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  function isRetard(l: Livraison) {
    return !!(l.date_arrivee_estimee && !l.date_arrivee_reelle && l.statut !== "livre" &&
      new Date(l.date_arrivee_estimee) < new Date());
  }

  return (
    <>
      <button onClick={() => { setForm(emptyForm); setModalCreate(true); }}
        style={{ ...btnPrimary, justifyContent: "center", marginBottom: "12px", width: "100%" }}>
        + Nouvelle livraison
      </button>

      {livraisons.length === 0 && <EmptyState message="Aucune livraison en cours" />}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {livraisons.map(l => (
          <div key={l.id} style={{ ...cardStyle, borderTop: isRetard(l) ? `3px solid ${RED}` : "3px solid transparent" }}>
            {/* En-tête */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px" }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
                  {l.fournisseur_nom ?? "Fournisseur inconnu"}
                  {l.mode_transport && <span style={{ marginLeft: "6px", fontSize: "12px", color: "#888", fontWeight: 400 }}>({l.mode_transport})</span>}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>
                  {[l.client_nom, l.demande_titre].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {isRetard(l) && (
                  <span style={{ backgroundColor: RED, color: "#fff", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap" }}>Retard</span>
                )}
                <button
                  onClick={() => setDeleteConfirm(l)}
                  title="Supprimer cette livraison"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#ccc", display: "flex", alignItems: "center" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            <LivraisonTimeline statut={l.statut} />

            {/* Infos */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "8px" }}>
              {l.numero_tracking && <Tag>Track: {l.numero_tracking}</Tag>}
              {l.incoterm && <Tag>{l.incoterm}</Tag>}
              {l.date_arrivee_estimee && <Tag>Estimée : {dateStr(l.date_arrivee_estimee)}</Tag>}
              {l.date_arrivee_reelle && (
                <span style={{ backgroundColor: "#f0faf4", color: GREEN, padding: "2px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>
                  Livré le {dateStr(l.date_arrivee_reelle)}
                </span>
              )}
            </div>

            {/* Checklist */}
            {checklist[l.id] ? (
              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#888" }}>DOCUMENTS</p>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: checklist[l.id].some(d => d.obligatoire && !d.obtenu) ? RED : GREEN }}>
                    {checklist[l.id].filter(d => d.obtenu).length}/{checklist[l.id].length} obtenus
                  </span>
                </div>
                <div style={{ backgroundColor: "#f0f0f0", borderRadius: "20px", height: "5px", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{
                    width: `${Math.round(checklist[l.id].filter(d => d.obtenu).length / checklist[l.id].length * 100)}%`,
                    height: "100%", backgroundColor: GREEN, borderRadius: "20px",
                  }} />
                </div>
                {checklist[l.id].map(doc => {
                  const alerteDoc = doc.obligatoire && !doc.obtenu && l.date_expedition &&
                    new Date(l.date_expedition).getTime() - Date.now() < 7 * 24 * 3600 * 1000;
                  return (
                    <label key={doc.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0", cursor: "pointer" }}>
                      <input type="checkbox" checked={doc.obtenu} onChange={() => handleToggleDoc(doc)} />
                      <span style={{ fontSize: "12px", color: alerteDoc ? RED : doc.obtenu ? "#bbb" : "#444", textDecoration: doc.obtenu ? "line-through" : "none", fontWeight: alerteDoc ? 700 : 400 }}>
                        {doc.type_doc.replace(/_/g, " ")}
                        {doc.obligatoire && !doc.obtenu && <span style={{ color: RED }}> *</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <button onClick={() => loadChecklist(l.id)} style={{ ...btnSecondary, fontSize: "12px", padding: "6px 12px", marginBottom: "8px" }}>
                Voir les documents ({l.docs_obtenus}/{l.docs_total})
              </button>
            )}

            {/* Actions */}
            {l.statut !== "livre" && (
              <button onClick={() => { setNewStatut(l.statut); setModalStatut(l); }} style={btnSecondary}>
                Changer statut
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Modal suppression livraison ────────────────────────────────── */}
      {deleteConfirm && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "24px 20px", width: "100%", maxWidth: "380px" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: 700, color: "#1a1a1a" }}>Supprimer cette livraison ?</h3>
            <p style={{ margin: "0 0 4px", fontSize: "14px", color: "#555" }}>
              <strong>{deleteConfirm.fournisseur_nom ?? "Fournisseur inconnu"}</strong>
              {deleteConfirm.demande_titre ? ` — ${deleteConfirm.demande_titre}` : ""}
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "12px", color: "#e74c3c", fontWeight: 600 }}>
              Les événements et documents associés seront également archivés.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid #ddd", background: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#555" }}>
                Annuler
              </button>
              <button onClick={handleDeleteLivraison} disabled={deletingId === deleteConfirm.id}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#e74c3c", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", opacity: deletingId === deleteConfirm.id ? 0.7 : 1 }}>
                {deletingId === deleteConfirm.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Créer livraison ──────────────────────────────────── */}
      {modalCreate && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => setModalCreate(false)}>
          <div style={{ backgroundColor: "#f5f5f5", width: "100%", borderRadius: "20px 20px 0 0", maxHeight: "92vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ backgroundColor: RED, color: "#fff", padding: "16px 20px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: "16px" }}>Nouvelle livraison</p>
              <button onClick={() => setModalCreate(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "16px", cursor: "pointer", color: "#fff" }}>✕</button>
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <Section titre="Demande & Fournisseur">
                <label style={fieldLabel}>Demande *</label>
                <select value={form.demande_id} onChange={e => setForm(p => ({ ...p, demande_id: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: "8px", padding: "10px 8px" }}>
                  <option value="">— Sélectionner —</option>
                  {demandes.map(d => <option key={d.id} value={d.id}>{d.titre} ({d.client_nom})</option>)}
                </select>
                <label style={fieldLabel}>Fournisseur</label>
                <select value={form.fournisseur_id} onChange={e => setForm(p => ({ ...p, fournisseur_id: e.target.value }))}
                  style={{ ...inputStyle, padding: "10px 8px" }}>
                  <option value="">— Sélectionner —</option>
                  {fournisseurs.filter(f => f.actif).map(f => <option key={f.id} value={f.id}>{f.nom} ({f.ville ?? f.pays})</option>)}
                </select>
              </Section>

              <Section titre="Transport">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>Mode</label>
                    <select value={form.mode_transport} onChange={e => setForm(p => ({ ...p, mode_transport: e.target.value }))}
                      style={{ ...inputStyle, padding: "10px 8px" }}>
                      {MODES_TRANSPORT.map(m => <option key={m} value={m}>{m}</option>)}
                    </select></div>
                  <div><label style={fieldLabel}>Incoterm</label>
                    <select value={form.incoterm} onChange={e => setForm(p => ({ ...p, incoterm: e.target.value }))}
                      style={{ ...inputStyle, padding: "10px 8px" }}>
                      {INCOTERMS_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select></div>
                </div>
                <label style={fieldLabel}>Transitaire</label>
                <input value={form.transitaire} onChange={e => setForm(p => ({ ...p, transitaire: e.target.value }))}
                  placeholder="Nom du transitaire" style={{ ...inputStyle, marginBottom: "8px" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><label style={fieldLabel}>Port départ</label>
                    <input value={form.port_depart} onChange={e => setForm(p => ({ ...p, port_depart: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Port arrivée</label>
                    <input value={form.port_arrivee} onChange={e => setForm(p => ({ ...p, port_arrivee: e.target.value }))} style={inputStyle} /></div>
                </div>
              </Section>

              <Section titre="Dates & Tracking">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <div><label style={fieldLabel}>Date expédition</label>
                    <input type="date" value={form.date_expedition} onChange={e => setForm(p => ({ ...p, date_expedition: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Arrivée estimée</label>
                    <input type="date" value={form.date_arrivee_estimee} onChange={e => setForm(p => ({ ...p, date_arrivee_estimee: e.target.value }))} style={inputStyle} /></div>
                </div>
                <label style={fieldLabel}>Numéro de tracking</label>
                <input value={form.numero_tracking} onChange={e => setForm(p => ({ ...p, numero_tracking: e.target.value }))}
                  placeholder="Ex: COSU1234567890" style={inputStyle} />
              </Section>

              <Section titre="Marchandise">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div><label style={fieldLabel}>Poids (kg)</label>
                    <input type="number" min="0" step="0.1" value={form.poids_kg} onChange={e => setForm(p => ({ ...p, poids_kg: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Volume (m³)</label>
                    <input type="number" min="0" step="0.01" value={form.volume_m3} onChange={e => setForm(p => ({ ...p, volume_m3: e.target.value }))} style={inputStyle} /></div>
                  <div><label style={fieldLabel}>Valeur (EUR)</label>
                    <input type="number" min="0" step="0.01" value={form.valeur_marchandise} onChange={e => setForm(p => ({ ...p, valeur_marchandise: e.target.value }))} style={inputStyle} /></div>
                </div>
              </Section>

              <div style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
                <button onClick={() => setModalCreate(false)} style={{ ...btnSecondary, flex: 1, justifyContent: "center" }}>Annuler</button>
                <button onClick={handleCreate} disabled={loadingCreate}
                  style={{ ...btnPrimary, flex: 2, justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", opacity: loadingCreate ? 0.7 : 1 }}>
                  {loadingCreate ? <Spinner /> : null}
                  {loadingCreate ? "Création…" : "Créer la livraison"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Changer statut ─────────────────────────────────────── */}
      {modalStatut && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001, display: "flex", alignItems: "flex-end" }}
          onClick={() => setModalStatut(null)}>
          <div style={{ backgroundColor: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: "24px 20px 32px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>Changer le statut</h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#888" }}>{modalStatut.fournisseur_nom ?? "Livraison"}</p>
              </div>
              <button onClick={() => setModalStatut(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#888" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {STATUTS_LIV.map(s => (
                <button key={s} onClick={() => setNewStatut(s)}
                  style={{ ...btnSecondary, textAlign: "left", backgroundColor: newStatut === s ? RED : "#f2f2f2", color: newStatut === s ? "#fff" : "#444", padding: "12px 16px" }}>
                  {STATUTS_LIV_LABELS[s]}
                </button>
              ))}
            </div>
            <button onClick={handleChangerStatut}
              disabled={loadingStatut || !newStatut || newStatut === modalStatut.statut}
              style={{ ...btnPrimary, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", opacity: (loadingStatut || !newStatut || newStatut === modalStatut.statut) ? 0.7 : 1 }}>
              {loadingStatut ? <Spinner /> : null}
              {loadingStatut ? "Mise à jour…" : "Confirmer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Micro-composants ─────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      backgroundColor: "#f2f2f2", color: "#444",
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "12px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: "13px", color: "#888", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#333", textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
      <p style={{ fontSize: "40px", marginBottom: "12px" }}>📭</p>
      <p style={{ fontSize: "15px" }}>{message}</p>
    </div>
  );
}

// ─── Styles partagés ─────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fff",
  border:          "1px solid #efefef",
  borderRadius:    "14px",
  padding:         "16px",
  boxShadow:       "0 1px 4px rgba(0,0,0,0.05)",
};

const btnPrimary: React.CSSProperties = {
  backgroundColor: RED,
  color:           "#fff",
  border:          "none",
  borderRadius:    "10px",
  padding:         "10px 16px",
  fontSize:        "14px",
  fontWeight:      700,
  cursor:          "pointer",
  display:         "flex",
  alignItems:      "center",
  gap:             "6px",
};

const btnSecondary: React.CSSProperties = {
  backgroundColor: "#f2f2f2",
  color:           "#444",
  border:          "none",
  borderRadius:    "10px",
  padding:         "10px 16px",
  fontSize:        "14px",
  fontWeight:      600,
  cursor:          "pointer",
};

const labelStyle: React.CSSProperties = {
  fontSize:     "12px",
  fontWeight:   700,
  color:        "#888",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "8px",
  marginTop:    0,
};

// ─── Composant principal ──────────────────────────────────────────────────────

const TABS = ["Emails", "Demandes", "Devis", "Factures", "Fournisseurs", "Livraisons", "Coûts IA"] as const;
type Tab = typeof TABS[number];

export default function AdminDashboard() {
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Emails");
  const [toast,     setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [fournisseurs,            setFournisseurs]            = useState<Fournisseur[]>([]);
  const [livraisons,              setLivraisons]              = useState<Livraison[]>([]);
  const [initLivraisonDemandeId,  setInitLivraisonDemandeId]  = useState<string | null>(null);
  const [emails,                  setEmails]                  = useState<EmailItem[]>([]);
  const [emailsLoading,           setEmailsLoading]           = useState(false);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      showToast("Impossible de charger les données", "err");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFournisseurs() {
    try {
      const res = await fetch("/api/admin/fournisseurs");
      if (res.ok) { const j = await res.json(); setFournisseurs(j.fournisseurs ?? []); }
    } catch {}
  }

  async function fetchLivraisons() {
    try {
      const res = await fetch("/api/admin/livraisons");
      if (res.ok) { const j = await res.json(); setLivraisons(j.livraisons ?? []); }
    } catch {}
  }

  async function fetchEmails(force = false) {
    setEmailsLoading(true);
    try {
      const res = await fetch(`/api/admin/emails${force ? "?refresh=1" : ""}`);
      if (res.ok) { const j = await res.json(); setEmails(j.emails ?? []); }
    } catch {}
    setEmailsLoading(false);
  }

  useEffect(() => { fetchData(); fetchFournisseurs(); fetchLivraisons(); fetchEmails(); }, []);

  // ── PWA — enregistrement Service Worker ───────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleCreateDevis(demandeId: string) {
    try {
      const res = await fetch("/api/admin/devis/creer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ demande_id: demandeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Erreur lors de la création du devis", "err");
        return;
      }
      showToast(`Devis ${json.devis.reference} créé — visible dans l'onglet Devis`, "ok");
      setActiveTab("Devis");
      fetchData();
    } catch {
      showToast("Erreur réseau", "err");
    }
  }

  async function handleEnvoyerDevis(devisId: string) {
    try {
      const res = await fetch("/api/admin/devis/envoyer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ devis_id: devisId }),
      });
      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || "Erreur lors de l'envoi", "err");
        return;
      }
      showToast("Devis envoyé au client", "ok");
      fetchData();
    } catch {
      showToast("Erreur réseau", "err");
    }
  }

  async function handleRelancer(factureId: string): Promise<string> {
    try {
      const res = await fetch("/api/admin/facture/relancer", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ facture_id: factureId }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Erreur lors de la relance", "err");
        return "";
      }
      showToast("Email de relance envoyé", "ok");
      return json.email_contenu ?? "";
    } catch {
      showToast("Erreur réseau", "err");
      return "";
    }
  }

  function handleDemarrerLivraison(demandeId: string) {
    setInitLivraisonDemandeId(demandeId);
    setActiveTab("Livraisons");
  }

  async function handleDeleteDemande(id: string) {
    try {
      const res = await fetch(`/api/admin/demandes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Erreur", "err"); return; }
      showToast("Demande supprimée", "ok");
      fetchData();
    } catch {
      showToast("Erreur réseau", "err");
    }
  }

  async function handleDeleteDevis(id: string) {
    try {
      const res = await fetch(`/api/admin/devis/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Erreur", "err"); return; }
      showToast("Devis supprimé", "ok");
      fetchData();
    } catch {
      showToast("Erreur réseau", "err");
    }
  }

  async function handleDeleteFacture(id: string) {
    try {
      const res = await fetch(`/api/admin/factures/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { showToast(json.error || "Erreur", "err"); return; }
      showToast("Facture archivée", "ok");
      fetchData();
    } catch {
      showToast("Erreur réseau", "err");
    }
  }

  // ── Calcul badge urgences ─────────────────────────────────────────────────

  const hasUrgent = data
    ? data.demandes.some(d => d.scoring_urgence >= 4) ||
      data.factures.some(f => f.en_retard)
    : false;

  const devisAcceptes: Record<string, string> = {};
  if (data) {
    for (const d of data.historique.devis) {
      if (d.statut === "accepté") devisAcceptes[d.id] = d.id;
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px", height: "40px",
            border: `3px solid ${RED}`,
            borderTopColor: "transparent",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 0.8s linear infinite",
          }} />
          <p style={{ color: "#888", fontSize: "15px" }}>Chargement de votre tableau de bord…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return null;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 0 40px" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: RED, color: "#fff",
          padding: "24px 20px 20px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>Bonjour Anna</h1>
              <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.85, textTransform: "capitalize" }}>{today}</p>
            </div>
            {hasUrgent && (
              <span style={{
                backgroundColor: "#fff", color: RED,
                padding: "5px 12px", borderRadius: "20px",
                fontSize: "12px", fontWeight: 800,
              }}>
                Actions urgentes
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "16px" }}>

          {/* ── KPI Grid ───────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            <KpiCard
              label="Demandes à traiter"
              value={String(data.kpis.demandes_actives)}
              icon="📥"
              highlight={data.kpis.demandes_actives > 0}
            />
            <KpiCard
              label="Devis en cours"
              value={String(data.kpis.devis_actifs)}
              icon="📋"
              highlight={data.kpis.devis_actifs > 0}
            />
            <KpiCard
              label="Paiements attendus"
              value={money(data.kpis.paiements_attendus)}
              icon="⏳"
              highlight={data.kpis.paiements_attendus > 0}
            />
            <KpiCard
              label="CA ce mois"
              value={money(data.kpis.ca_mois)}
              icon="💶"
              positive
            />
          </div>

          {/* ── Navigation onglets ─────────────────────────────────────────── */}
          <div style={{
            display: "flex",
            borderBottom: "2px solid #e0e0e0",
            marginBottom: "16px",
            overflowX: "auto",
            gap: "0",
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab;
              const urgentFact  = data.factures.filter(f => f.en_retard).length;
              const unreadEmails = emails.filter(e => !e.seen && e.importance >= 3).length;
              const count = tab === "Emails"       ? (unreadEmails || null)
                : tab === "Demandes"     ? data.demandes.length
                : tab === "Devis"        ? data.devis.length
                : tab === "Factures"     ? (urgentFact > 0 ? urgentFact : data.factures.length || null)
                : tab === "Fournisseurs" ? fournisseurs.length
                : tab === "Livraisons"   ? livraisons.length
                : null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding:         "10px 14px",
                    border:          "none",
                    borderBottom:    active ? `3px solid ${RED}` : "3px solid transparent",
                    background:      "none",
                    fontSize:        "14px",
                    fontWeight:      active ? 700 : 500,
                    color:           active ? RED : "#888",
                    cursor:          "pointer",
                    whiteSpace:      "nowrap",
                    marginBottom:    "-2px",
                  }}
                >
                  {tab}
                  {count !== null && count > 0 && (
                    <span style={{
                      marginLeft: "5px",
                      backgroundColor: active ? RED : "#ddd",
                      color: active ? "#fff" : "#666",
                      borderRadius: "10px",
                      padding: "1px 7px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Contenu onglets ────────────────────────────────────────────── */}
          {activeTab === "Emails" && (
            <OngletEmails
              emails={emails}
              loading={emailsLoading}
              onRefresh={() => fetchEmails(true)}
            />
          )}
          {activeTab === "Demandes" && (
            <OngletDemandes
              demandes={data.demandes}
              onCreateDevis={handleCreateDevis}
              devisAcceptes={devisAcceptes}
              onDemarrerLivraison={handleDemarrerLivraison}
              onDelete={handleDeleteDemande}
              historique={data.historique.demandes}
            />
          )}
          {activeTab === "Devis" && (
            <OngletDevis
              devis={data.devis}
              onEnvoyer={handleEnvoyerDevis}
              onRefresh={fetchData}
              onCreerLivraison={handleDemarrerLivraison}
              onDelete={handleDeleteDevis}
              historique={data.historique.devis}
            />
          )}
          {activeTab === "Factures" && (
            <OngletFactures
              factures={data.factures}
              onRelancer={handleRelancer}
              onDelete={handleDeleteFacture}
              historique={data.historique.factures}
            />
          )}
          {activeTab === "Fournisseurs" && (
            <OngletFournisseurs
              fournisseurs={fournisseurs}
              demandes={data.demandes_contexte}
              onRefresh={fetchFournisseurs}
              onShowToast={showToast}
            />
          )}
          {activeTab === "Livraisons" && (
            <OngletLivraisons
              livraisons={livraisons}
              fournisseurs={fournisseurs}
              demandes={data.demandes_contexte}
              initDemandeId={initLivraisonDemandeId}
              onClearInitDemande={() => setInitLivraisonDemandeId(null)}
              onRefresh={fetchLivraisons}
              onShowToast={showToast}
            />
          )}
          {activeTab === "Coûts IA" && (
            <OngletCoutsIA couts={data.couts_mois} />
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

function KpiCard({
  label, value, icon, highlight = false, positive = false,
}: {
  label:      string;
  value:      string;
  icon:       string;
  highlight?: boolean;
  positive?:  boolean;
}) {
  return (
    <div style={{
      ...cardStyle,
      borderTop: highlight ? `3px solid ${RED}` : positive ? `3px solid ${GREEN}` : "3px solid transparent",
    }}>
      <p style={{ margin: "0 0 6px", fontSize: "20px" }}>{icon}</p>
      <p style={{
        margin: 0,
        fontSize: "20px",
        fontWeight: 800,
        color: highlight ? RED : positive ? GREEN : "#1a1a1a",
        lineHeight: 1,
      }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#888", lineHeight: "1.3" }}>{label}</p>
    </div>
  );
}
