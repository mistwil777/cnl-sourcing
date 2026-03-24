"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Send, Loader2, CheckCircle } from "lucide-react";

const contactSchema = z.object({
  nom:     z.string().min(2),
  email:   z.string().email(),
  sujet:   z.string().min(2),
  message: z.string().min(10),
});

type ContactData = z.infer<typeof contactSchema>;

export default function ContactForm() {
  const t = useTranslations("contact_page");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactData) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle size={48} className="text-green-500 mb-3" />
        <p className="font-semibold text-brand-dark">{t("formSuccess")}</p>
        <p className="text-gray-500 text-sm mt-1">{t("formSuccessText")}</p>
        <button onClick={() => setStatus("idle")} className="btn-secondary mt-4 text-sm py-2">
          ← Nouveau message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("formName")}</label>
        <input {...register("nom")} placeholder={t("formNamePlaceholder")} className="input" />
        {errors.nom && <p className="text-red-500 text-xs mt-1">{errors.nom.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("formEmail")}</label>
        <input {...register("email")} type="email" placeholder={t("formEmailPlaceholder")} className="input" />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("formSubject")}</label>
        <input {...register("sujet")} placeholder={t("formSubjectPlaceholder")} className="input" />
        {errors.sujet && <p className="text-red-500 text-xs mt-1">{errors.sujet.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("formMessage")}</label>
        <textarea {...register("message")} rows={5} placeholder={t("formMessagePlaceholder")} className="input resize-none" />
        {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
      </div>

      {status === "error" && (
        <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{t("formError")}</p>
      )}

      <button type="submit" disabled={status === "loading"} className="btn-primary w-full justify-center py-2.5">
        {status === "loading"
          ? <><Loader2 size={16} className="animate-spin" /> {t("formSubmitting")}</>
          : <><Send size={16} /> {t("formSubmit")}</>
        }
      </button>

      <p className="text-xs text-gray-400 text-center">{t("chatHint")}</p>
    </form>
  );
}
