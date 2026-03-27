"use client";

import React, { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPIs {
  demandes_semaine:   number;
  devis_brouillon:    number;
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

interface DashboardData {
  kpis:       KPIs;
  demandes:   Demande[];
  devis:      Devis[];
  factures:   Facture[];
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

function OngletDemandes({
  demandes,
  onCreateDevis,
}: {
  demandes: Demande[];
  onCreateDevis: (demandeId: string) => Promise<void>;
}) {
  const [modal,      setModal]      = useState<Demande | null>(null);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

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
              <UrgenceBadge score={d.scoring_urgence} />
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
}: {
  devis:     Devis[];
  onEnvoyer: (devisId: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [modal,       setModal]       = useState<Devis | null>(null);
  const [lignes,      setLignes]      = useState<LigneDevis[]>([]);
  const [objet,       setObjet]       = useState("");
  const [condPmt,     setCondPmt]     = useState("");
  const [incoterms,   setIncoterms]   = useState("");
  const [paysLiv,     setPaysLiv]     = useState("");
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [sending,     setSending]     = useState(false);

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
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>
                  {d.client_entreprise || d.client_nom}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{d.reference}</p>
              </div>
              <DevisStatutBadge statut={d.statut} />
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
}: {
  factures: Facture[];
  onRelancer: (factureId: string) => Promise<string>;
}) {
  const [loadingIds, setLoadingIds]       = useState<Set<string>>(new Set());
  const [emailPreview, setEmailPreview]   = useState<string | null>(null);

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
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "15px" }}>{f.client_nom}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#888" }}>{f.reference}</p>
              </div>
              <StatutPaiementBadge facture={f} />
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

const TABS = ["Demandes", "Devis", "Factures", "Coûts IA"] as const;
type Tab = typeof TABS[number];

export default function AdminDashboard() {
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Demandes");
  const [toast,     setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);

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

  useEffect(() => { fetchData(); }, []);

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

  // ── Calcul badge urgences ─────────────────────────────────────────────────

  const hasUrgent = data
    ? data.demandes.some(d => d.scoring_urgence >= 4) ||
      data.factures.some(f => f.en_retard)
    : false;

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
              label="Demandes cette semaine"
              value={String(data.kpis.demandes_semaine)}
              icon="📥"
            />
            <KpiCard
              label="Devis à valider"
              value={String(data.kpis.devis_brouillon)}
              icon="📋"
              highlight={data.kpis.devis_brouillon > 0}
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
              const count = tab === "Demandes" ? data.demandes.length
                : tab === "Devis"    ? data.devis.length
                : tab === "Factures" ? data.factures.length
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
          {activeTab === "Demandes" && (
            <OngletDemandes demandes={data.demandes} onCreateDevis={handleCreateDevis} />
          )}
          {activeTab === "Devis" && (
            <OngletDevis devis={data.devis} onEnvoyer={handleEnvoyerDevis} onRefresh={fetchData} />
          )}
          {activeTab === "Factures" && (
            <OngletFactures factures={data.factures} onRelancer={handleRelancer} />
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
