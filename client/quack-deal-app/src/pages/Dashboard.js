import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getDeals, getAnalytics } from '../services/api';
import DealCard from '../components/Deal/DealCard';
import StatsCard from '../components/Dashboard/StatsCard';
import { PlusCircle, RefreshCw, Bot, Send, ChevronDown, MessageSquare } from 'lucide-react';
import { formatCurrency } from '../utils/dealHealth';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001' });

const FILTERS = [
  { key: 'all',       label: 'All Deals',           emoji: '📋', description: null },
  { key: 'confirmed', label: 'Confirmed Customers',  emoji: '🟢', description: 'Score 70–100' },
  { key: 'potential', label: 'Potential Customers',  emoji: '🟡', description: 'Score 40–69' },
  { key: 'uncertain', label: 'Uncertain Customers',  emoji: '🔴', description: 'Score 0–39'  },
];

const getCategory = (score) => {
  if (score >= 70) return 'confirmed';
  if (score >= 40) return 'potential';
  return 'uncertain';
};

const FILTER_STYLES = {
  all:       { active: 'bg-gray-900 text-white border-gray-900',       inactive: 'bg-white text-gray-600 border-gray-200 hover:border-gray-400' },
  confirmed: { active: 'bg-green-600 text-white border-green-600',     inactive: 'bg-white text-gray-600 border-gray-200 hover:border-green-400' },
  potential: { active: 'bg-amber-500 text-white border-amber-500',     inactive: 'bg-white text-gray-600 border-gray-200 hover:border-amber-400' },
  uncertain: { active: 'bg-red-500 text-white border-red-500',         inactive: 'bg-white text-gray-600 border-gray-200 hover:border-red-400'   },
};

const EMPTY_MESSAGES = {
  confirmed: { emoji: '🏆', title: 'No confirmed customers yet', sub: 'Deals scoring 70+ will appear here' },
  potential: { emoji: '🎯', title: 'No potential customers yet', sub: 'Deals scoring 40–69 will appear here' },
  uncertain: { emoji: '❄️', title: 'No uncertain customers yet', sub: 'Deals scoring below 40 will appear here' },
};

const SUGGESTED_QUESTIONS = [
  'Which deals are at risk?',
  'Who has the highest health score?',
  'What are the top objections across all deals?',
  'Which deals need follow-up?',
  'Summarize the pipeline',
];

// Generated dynamically based on real deal data
const getSuggestedQuestions = (deals) => {
  if (!deals || deals.length === 0) return ['Summarize the pipeline'];

  const industries   = [...new Set(deals.map(d => d.INDUSTRY).filter(Boolean))];
  const clientNames  = deals.map(d => d.CLIENT_NAME).filter(Boolean);
  const companies    = deals.map(d => d.CLIENT_COMPANY).filter(Boolean);
  const stages       = [...new Set(deals.map(d => d.STAGE).filter(Boolean))];
  const atRisk       = deals.filter(d => (d.HEALTH_SCORE || 0) < 40);
  const topDeal      = deals.sort((a,b) => (b.DEAL_VALUE||0) - (a.DEAL_VALUE||0))[0];

  const suggestions = [
    'Summarize the pipeline',
    'Which deals are at risk?',
    'Which deals need follow-up?',
    'Who has the highest health score?',
    'What are the top objections across all deals?',
  ];

  // Add industry-specific questions
  if (industries.length > 0) {
    const industry = industries[0];
    suggestions.push(`Show me all ${industry} deals`);
  }
  if (industries.length > 1) {
    suggestions.push(`Compare ${industries[0]} vs ${industries[1]} deals`);
  }

  // Add client-specific questions
  if (clientNames.length > 0) {
    suggestions.push(`What is the status of ${clientNames[0]}?`);
  }
  if (clientNames.length > 1) {
    suggestions.push(`What are the objections raised by ${clientNames[1]}?`);
  }

  // Add company-specific questions
  if (companies.length > 0) {
    suggestions.push(`Tell me about the deal with ${companies[0]}`);
  }

  // Add stage-specific questions
  if (stages.includes('negotiation')) suggestions.push('Which deals are in negotiation?');
  if (stages.includes('proposal'))    suggestions.push('Which deals are in proposal stage?');
  if (stages.includes('closing'))     suggestions.push('Which deals are closing soon?');

  // Add value/risk questions
  if (topDeal) suggestions.push(`What is the next best action for ${topDeal.CLIENT_NAME}?`);
  if (atRisk.length > 0) suggestions.push(`Why is ${atRisk[0].CLIENT_NAME} at risk?`);

  // Return top 6 most useful ones
  return suggestions.slice(0, 6);
};

const Dashboard = ({ user }) => {
  const [deals, setDeals]         = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Chat state
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatHistory, setChatHistory]   = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [dealsRes, analyticsRes] = await Promise.all([
          getDeals(),
          getAnalytics(),
        ]);
        setDeals(dealsRes.data || []);
        setAnalytics(analyticsRes.data?.summary || null);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleAsk = async (question) => {
    const q = (question || chatInput).trim();
    if (!q || chatLoading) return;
    setChatInput('');

    const userMsg = { role: 'user', content: q };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await API.post('/api/chat', {
        question: q,
        conversationHistory: chatHistory,
      });
      const assistantMsg = { role: 'assistant', structured: res.data.structured };
      setChatMessages(prev => [...prev, assistantMsg]);
      setChatHistory(prev => [
        ...prev,
        { role: 'user', content: q },
        { role: 'assistant', content: res.data.structured?.summary || '' }
      ].slice(-12));
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        error: true,
        structured: { headline: 'Error', summary: 'Something went wrong. Please try again.', cards: [], action: null }
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Card style config
  const CARD_STYLES = {
    danger:  { bg: 'bg-red-50 border-red-200',    dot: 'bg-red-500',    title: 'text-red-700',   detail: 'text-red-600'   },
    warning: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500',  title: 'text-amber-700', detail: 'text-amber-600' },
    success: { bg: 'bg-green-50 border-green-200', dot: 'bg-green-500',  title: 'text-green-700', detail: 'text-green-600' },
    info:    { bg: 'bg-blue-50 border-blue-100',   dot: 'bg-blue-400',   title: 'text-blue-700',  detail: 'text-blue-600'  },
  };

  const StructuredResponse = ({ structured, error }) => {
    if (!structured) return null;
    const s = CARD_STYLES;
    return (
      <div className="space-y-2.5">
        {/* Headline + summary */}
        <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border shadow-sm ${error ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${error ? 'text-red-500' : 'text-blue-600'}`}>{structured.headline}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{structured.summary}</p>
        </div>

        {/* Cards */}
        {structured.cards?.length > 0 && (
          <div className="space-y-1.5 pl-1">
            {structured.cards.map((card, i) => {
              const style = s[card.type] || s.info;
              return (
                <div key={i} className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl border ${style.bg}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-semibold ${style.title}`}>{card.title}</p>
                      {card.value && <span className={`text-xs font-bold shrink-0 ${style.title}`}>{card.value}</span>}
                    </div>
                    <p className={`text-xs mt-0.5 leading-relaxed ${style.detail}`}>{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action */}
        {structured.action && (
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-gray-900 rounded-xl">
            <span className="text-sm shrink-0">🎯</span>
            <p className="text-xs text-gray-200 leading-relaxed"><span className="font-semibold text-white">Next step: </span>{structured.action}</p>
          </div>
        )}
      </div>
    );
  };

  const summary       = analytics || {};
  const filteredDeals = activeFilter === 'all'
    ? deals
    : deals.filter(deal => getCategory(deal.HEALTH_SCORE || 0) === activeFilter);

  const counts = {
    all:       deals.length,
    confirmed: deals.filter(d => getCategory(d.HEALTH_SCORE || 0) === 'confirmed').length,
    potential: deals.filter(d => getCategory(d.HEALTH_SCORE || 0) === 'potential').length,
    uncertain: deals.filter(d => getCategory(d.HEALTH_SCORE || 0) === 'uncertain').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.displayName?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">Here's your sales pipeline at a glance</p>
        </div>
        <Link to="/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <PlusCircle size={18} />
          New Analysis
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Total Deals"   value={summary.TOTAL_DEALS}                   icon="📋" color="blue"   />
        <StatsCard label="Active Deals"  value={summary.ACTIVE_DEALS}                  icon="⚡" color="amber"  />
        <StatsCard label="Deals Won"     value={summary.WON_DEALS}                     icon="🏆" color="green"  />
        <StatsCard label="Total Revenue" value={formatCurrency(summary.TOTAL_REVENUE)} icon="💰" color="purple" />
      </div>

      {/* ── AI CHAT PANEL ─────────────────────────────────────────── */}
      <div className="mb-8">
        {!chatOpen ? (
          /* Collapsed trigger bar */
          <button
            onClick={() => setChatOpen(true)}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-5 py-3.5 rounded-2xl transition-all shadow-sm group"
          >
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Ask Claude about your pipeline</p>
              <p className="text-xs text-blue-200">Ask about any client, deal status, risks, or next steps</p>
            </div>
            <MessageSquare size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          /* Expanded chat panel */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Bot size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pipeline AI</p>
                  <p className="text-xs text-blue-200">Knows all {deals.length} deals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => { setChatMessages([]); setChatHistory([]); }}
                    className="text-xs text-blue-200 hover:text-white px-2 py-1 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors">
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white hover:bg-opacity-10 text-blue-200 hover:text-white transition-colors">
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="h-72 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">

              {/* Welcome + suggestions */}
              {chatMessages.length === 0 && (
                <div>
                  <div className="flex gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm shadow-sm">
                      <p className="text-sm text-gray-700">
                        Hi! I have full access to all your deals and client data. Ask me anything about your pipeline.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-9">
                    {getSuggestedQuestions(deals).map(q => (
                      <button key={q} onClick={() => handleAsk(q)}
                        className="text-xs bg-white hover:bg-blue-50 hover:text-blue-600 text-gray-500 border border-gray-200 hover:border-blue-200 px-3 py-1.5 rounded-full transition-colors shadow-sm">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-blue-600" />
                    </div>
                  )}
                  {msg.role === 'user' ? (
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed shadow-sm bg-blue-600 text-white">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%]">
                      <StructuredResponse structured={msg.structured} error={msg.error} />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing dots */}
              {chatLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-blue-600" />
                  </div>
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-white">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Ask about any client or deal..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder-gray-300"
              />
              <button
                onClick={() => handleAsk()}
                disabled={chatLoading || !chatInput.trim()}
                className="flex items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl transition-colors">
                <Send size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deals Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-blue-500" size={28} />
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-gray-500 font-medium">No deals yet</p>
          <p className="text-gray-400 text-sm mb-4">Add your first deal and analyze a meeting transcript</p>
          <Link to="/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <PlusCircle size={16} /> Analyze Your First Meeting
          </Link>
        </div>
      ) : (
        <div>
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {FILTERS.map(f => {
              const isActive = activeFilter === f.key;
              const styles = FILTER_STYLES[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${isActive ? styles.active : styles.inactive}`}
                >
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white bg-opacity-25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active filter description */}
          {activeFilter !== 'all' && (
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {FILTERS.find(f => f.key === activeFilter)?.label}
              </p>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {FILTERS.find(f => f.key === activeFilter)?.description}
              </span>
            </div>
          )}

          {/* Deal cards or empty state */}
          {filteredDeals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-4xl mb-3">{EMPTY_MESSAGES[activeFilter]?.emoji}</p>
              <p className="text-gray-500 font-medium">{EMPTY_MESSAGES[activeFilter]?.title}</p>
              <p className="text-gray-400 text-sm">{EMPTY_MESSAGES[activeFilter]?.sub}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDeals.map(deal => <DealCard key={deal.DEAL_ID} deal={deal} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;