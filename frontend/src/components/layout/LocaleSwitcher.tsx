"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const locales = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "vi", label: "VI" },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: string) => {
    // Remplace le préfixe de locale dans le pathname
    const segments = pathname.split("/");
    if (["fr", "en", "vi"].includes(segments[1])) {
      segments[1] = newLocale === "fr" ? "" : newLocale;
    } else {
      segments.splice(1, 0, newLocale === "fr" ? "" : newLocale);
    }
    const newPath = segments.join("/").replace("//", "/") || "/";
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            locale === code
              ? "bg-brand-red text-white"
              : "text-gray-500 hover:text-brand-red"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
