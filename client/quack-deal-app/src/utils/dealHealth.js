export const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-lime-500';
  if (score >= 40) return 'text-amber-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-red-500';
};

export const getScoreBg = (score) => {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 60) return 'bg-lime-50 border-lime-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  if (score >= 20) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

export const getScoreHex = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

export const getScoreLabel = (score) => {
  if (score >= 80) return 'Hot 🔥';
  if (score >= 60) return 'Warm ✅';
  if (score >= 40) return 'Lukewarm ⚠️';
  if (score >= 20) return 'Cold 🧊';
  return 'At Risk ❌';
};

export const getStageBadge = (stage) => {
  const map = {
    discovery:   'bg-blue-100 text-blue-700',
    proposal:    'bg-purple-100 text-purple-700',
    negotiation: 'bg-yellow-100 text-yellow-700',
    closing:     'bg-orange-100 text-orange-700',
    won:         'bg-green-100 text-green-700',
    lost:        'bg-red-100 text-red-700',
  };
  return map[stage] || 'bg-gray-100 text-gray-700';
};

export const formatCurrency = (val) => {
  if (!val) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};
