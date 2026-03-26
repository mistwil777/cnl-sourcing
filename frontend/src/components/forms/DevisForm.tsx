"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Loader2, CheckCircle } from "lucide-react";

const devisSchema = z.object({
  nom:          z.string().min(2, "Nom requis"),
  prenom:       z.string().optional(),
  email:        z.string().email("Email invalide"),
  telephone:    z.string().optional(),
  entreprise:   z.string().optional(),
  titre:        z.string().min(5, "Décrivez votre besoin (min 5 caractères)"),
  description:  z.string().min(20, "Merci de détailler votre demande (min 20 caractères)"),
  categorie:    z.string().min(1, "Sélectionnez une catégorie"),
  budget_min:   z.coerce.number().positive().optional(),
  budget_max:   z.coerce.number().positive().optional(),
  quantite:     z.coerce.number().int().positive().optional(),
  delai:        z.string().optional(),
});

type DevisFormData = z.infer<typeof devisSchema>;

const categories = [
  "Textile & Mode",
  "Agroalimentaire (café, épices, produits secs)",
  "Artisanat & Décoration (bois, bambou)",
  "Autre (préciser dans la description)",
];

export default function DevisForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DevisFormData>({ resolver: zodResolver(devisSchema) });

  const onSubmit = async (data: DevisFormData) => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erreur serveur");
      }
      setStatus("success");
      reset();
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Une erreur est survenue");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h3 className="font-serif text-2xl font-bold text-brand-dark mb-2">
          Demande envoyée !
        </h3>
        <p className="text-gray-500 max-w-md">
          Nous avons bien reçu votre demande. Anna vous répondra sous 24h avec une première analyse.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="btn-secondary mt-6"
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Infos contact */}
      <div>
        <h3 className="font-semibold text-brand-dark mb-4 pb-2 border-b border-gray-100">
          Vos coordonnées
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom *" error={errors.nom?.message}>
            <input {...register("nom")} placeholder="Dupont" className="input" />
          </Field>
          <Field label="Prénom" error={errors.prenom?.message}>
            <input {...register("prenom")} placeholder="Marie" className="input" />
          </Field>
          <Field label="Email *" error={errors.email?.message}>
            <input {...register("email")} type="email" placeholder="marie@entreprise.fr" className="input" />
          </Field>
          <Field label="Téléphone" error={errors.telephone?.message}>
            <input {...register("telephone")} placeholder="+33 6 00 00 00 00" className="input" />
          </Field>
          <Field label="Entreprise" error={errors.entreprise?.message} className="sm:col-span-2">
            <input {...register("entreprise")} placeholder="Nom de votre société" className="input" />
          </Field>
        </div>
      </div>

      {/* Détails demande */}
      <div>
        <h3 className="font-semibold text-brand-dark mb-4 pb-2 border-b border-gray-100">
          Votre demande
        </h3>
        <div className="space-y-4">
          <Field label="Objet de la demande *" error={errors.titre?.message}>
            <input {...register("titre")} placeholder="Ex: 500 robes d'été coton bio" className="input" />
          </Field>

          <Field label="Description détaillée *" error={errors.description?.message}>
            <textarea
              {...register("description")}
              rows={5}
              placeholder="Décrivez votre produit, les spécifications techniques, les exigences qualité, les certifications souhaitées..."
              className="input resize-none"
            />
          </Field>

          <Field label="Catégorie *" error={errors.categorie?.message}>
            <select {...register("categorie")} className="input">
              <option value="">Sélectionner...</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Budget min (€)" error={errors.budget_min?.message}>
              <input {...register("budget_min")} type="number" placeholder="5000" className="input" />
            </Field>
            <Field label="Budget max (€)" error={errors.budget_max?.message}>
              <input {...register("budget_max")} type="number" placeholder="15000" className="input" />
            </Field>
            <Field label="Quantité" error={errors.quantite?.message}>
              <input {...register("quantite")} type="number" placeholder="500" className="input" />
            </Field>
          </div>

          <Field label="Délai souhaité" error={errors.delai?.message}>
            <input {...register("delai")} type="date" className="input" />
          </Field>
        </div>
      </div>

      {status === "error" && (
        <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full justify-center py-3 text-base"
      >
        {status === "loading" ? (
          <><Loader2 size={18} className="animate-spin" /> Envoi en cours...</>
        ) : (
          <><Send size={18} /> Envoyer ma demande</>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Vos données sont traitées confidentiellement. Aucun spam.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
