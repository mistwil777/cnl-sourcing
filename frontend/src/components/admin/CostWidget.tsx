"use client";

import { useEffect, useState } from "react";
import { TrendingDown, Zap, Database, AlertCircle } from "lucide-react";

interface CostStats {
  cout_mois_eur:        number;
  nb_requetes:          number;
  taux_cache_pct:       number;
  economie_vs_sonnet:   number;
  pct_haiku:            number;
  budget_eur:           number;
}

function StatusColor(cost: number, budget: number): string {
  const ratio = cost / budget;
  if (ratio < 0.70) return "text-green-600 bg-green-50";
  if (ratio < 0.90) return "text-orange-500 bg-orange-50";
  return "text-red-600 bg-red-50";
}

export default function CostWidget() {
  const [stats, setStats]   = useState<CostStats | null>(null);
  const [error, setError]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/cost-stats")
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card border border-red-100 bg-red-50">
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>Données de coûts indisponibles</span>
        </div>
      </div>
    );
  }

  const colorClass = StatusColor(stats.cout_mois_eur, stats.budget_eur);
  const budgetPct  = Math.min(100, Math.round((stats.cout_mois_eur / stats.budget_eur) * 100));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-bold text-brand-dark">Coûts IA ce mois</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}>
          {budgetPct}% du budget
        </span>
      </div>

      {/* Barre de budget */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>0€</span>
          <span>Budget : {stats.budget_eur}€/mois</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPct < 70 ? "bg-green-500" : budgetPct < 90 ? "bg-orange-400" : "bg-red-500"
            }`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
      </div>

      {/* 4 métriques */}
      <div className="grid grid-cols-2 gap-3">
        <Metric
          icon={<Zap size={16} className="text-brand-red" />}
          label="Coût total"
          value={`${stats.cout_mois_eur.toFixed(3)}€`}
          sub={`${stats.nb_requetes} requêtes`}
        />
        <Metric
          icon={<TrendingDown size={16} className="text-green-500" />}
          label="Économies"
          value={`${stats.economie_vs_sonnet.toFixed(2)}€`}
          sub="vs tout Sonnet"
        />
        <Metric
          icon={<Database size={16} className="text-blue-500" />}
          label="Cache Redis"
          value={`${stats.taux_cache_pct}%`}
          sub="taux de hit"
        />
        <Metric
          icon={<Zap size={16} className="text-purple-500" />}
          label="Haiku"
          value={`${stats.pct_haiku}%`}
          sub="des requêtes"
        />
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, sub,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  sub:   string;
}) {
  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-bold text-brand-dark text-lg leading-tight">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}
