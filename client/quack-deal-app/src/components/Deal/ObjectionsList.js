import React, { useState } from 'react';

const OBJECTION_CATEGORIES = {
  budget:    { label: 'Budget',     color: 'bg-red-100 text-red-700 border-red-200',     icon: '💰' },
  timing:    { label: 'Timing',     color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '⏰' },
  authority: { label: 'Authority',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '👔' },
  need:      { label: 'Need',       color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '❓' },
  other:     { label: 'Other',      color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: '⚠️' },
};

// Loosely categorize a phrase into BANT
const categorize = (phrase) => {
  const p = phrase.toLowerCase();
  if (/budget|expensive|cost|price|afford|discount/.test(p))        return 'budget';
  if (/time|quarter|year|hold|later|revisit|ready/.test(p))         return 'timing';
  if (/boss|approval|committee|sign.off|decision|call/.test(p))     return 'authority';
  if (/need|value|priority|already have|current/.test(p))           return 'need';
  return 'other';
};

const ObjectionsList = ({ objections = [], commitments = [], compact = false }) => {
  const [tab, setTab] = useState('objections');

  if (objections.length === 0 && commitments.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab('objections')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2
            ${tab === 'objections'
              ? 'bg-red-50 text-red-700 border-b-2 border-red-400'
              : 'text-gray-400 hover:text-gray-600'}`}
        >
          ⚠️ Objections
          {objections.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {objections.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('commitments')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2
            ${tab === 'commitments'
              ? 'bg-green-50 text-green-700 border-b-2 border-green-400'
              : 'text-gray-400 hover:text-gray-600'}`}
        >
          ✅ Signals
          {commitments.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
              {commitments.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4">
        {/* Objections tab */}
        {tab === 'objections' && (
          <>
            {objections.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                🎉 No objections detected in this meeting
              </p>
            ) : (
              <div className="space-y-2">
                {!compact && (
                  <p className="text-xs text-gray-400 mb-3">
                    These phrases were detected as objection signals. Address them in your follow-up.
                  </p>
                )}
                {objections.map((phrase, i) => {
                  const cat = categorize(phrase);
                  const { color, icon, label } = OBJECTION_CATEGORIES[cat];
                  return (
                    <div key={i}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${color}`}>
                      <span className="text-base shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">"{phrase}"</p>
                        {!compact && (
                          <p className="text-xs opacity-70 mt-0.5">{label} objection</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Coaching tip */}
                {!compact && objections.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 mb-1">💡 Coaching tip</p>
                    <p className="text-xs text-blue-600 leading-relaxed">
                      {objections.some(o => categorize(o) === 'budget')
                        ? 'Budget objections are rarely about money — they\'re about perceived value. In your follow-up, lead with ROI and concrete outcomes.'
                        : objections.some(o => categorize(o) === 'authority')
                          ? 'Ask to include the decision-maker in the next conversation rather than going through a gatekeeper.'
                          : 'Address objections directly and early in your follow-up. Ignoring them signals you weren\'t listening.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Commitments tab */}
        {tab === 'commitments' && (
          <>
            {commitments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No positive signals detected yet — keep nurturing the deal
              </p>
            ) : (
              <div className="space-y-2">
                {!compact && (
                  <p className="text-xs text-gray-400 mb-3">
                    These buying signals indicate genuine interest. Reinforce them in your follow-up.
                  </p>
                )}
                {commitments.map((phrase, i) => (
                  <div key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200">
                    <span className="text-base shrink-0">✅</span>
                    <p className="text-sm font-medium text-green-800">"{phrase}"</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ObjectionsList;
