import React from 'react';
import { Link } from 'react-router-dom';
import { getScoreColor, getScoreHex, getStageBadge, formatCurrency } from '../../utils/dealHealth';
import { ChevronRight, Building2, DollarSign } from 'lucide-react';

const DealCard = ({ deal }) => {
  const score = deal.HEALTH_SCORE || 0;

  return (
    <Link to={`/deal/${deal.DEAL_ID}`}
      className="block bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {deal.CLIENT_NAME}
          </h3>
          {deal.CLIENT_COMPANY && (
            <div className="flex items-center gap-1 text-gray-400 text-sm mt-0.5">
              <Building2 size={13} />
              <span>{deal.CLIENT_COMPANY}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStageBadge(deal.STAGE)}`}>
            {deal.STAGE}
          </span>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>

      {/* Health Score Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-400">Deal Health</span>
          <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}/100</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: getScoreHex(score) }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {deal.DEAL_VALUE > 0 && (
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <DollarSign size={14} />
            <span>{formatCurrency(deal.DEAL_VALUE)}</span>
          </div>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {deal.MEETING_COUNT || 0} meeting{deal.MEETING_COUNT !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
};

export default DealCard;
