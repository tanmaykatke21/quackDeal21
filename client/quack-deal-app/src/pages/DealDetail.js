import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDeal, updateOutcome } from '../services/api';
import axios from 'axios';
import HealthGauge from '../components/Deal/HealthGauge';
import ObjectionsList from '../components/Deal/ObjectionsList';
import { getStageBadge, getScoreColor, formatCurrency } from '../utils/dealHealth';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  ArrowLeft, PlusCircle, Trophy, XCircle, RefreshCw, Building2,
  Mail, DollarSign, Calendar, ChevronDown, StickyNote, Save, Trash2,
  Pencil, X, Sparkles, Send, Bot, TrendingUp, AlertTriangle, Lightbulb, Zap
} from 'lucide-react';

const API = axios.create({ baseURL: 'http://localhost:5001' });

// ── Insight type config ───────────────────────────────────────
const INSIGHT_STYLES = {
  risk:        { bg: 'bg-red-50 border-red-100',    icon: <AlertTriangle size={14} className="text-red-500" />,   label: 'text-red-600' },
  warning:     { bg: 'bg-amber-50 border-amber-100', icon: <AlertTriangle size={14} className="text-amber-500" />, label: 'text-amber-600' },
  opportunity: { bg: 'bg-green-50 border-green-100', icon: <TrendingUp size={14} className="text-green-500" />,   label: 'text-green-600' },
  action:      { bg: 'bg-blue-50 border-blue-100',   icon: <Zap size={14} className="text-blue-500" />,           label: 'text-blue-600' },
};

const DealDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [deal, setDeal]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [updatingOutcome, setUpdatingOutcome] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState(null);

  // Notes state
  const [notes, setNotes]                 = useState([]);
  const [newNote, setNewNote]             = useState('');
  const [savingNote, setSavingNote]       = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // AI Chat state
  const [chatMessages, setChatMessages]   = useState([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const [chatHistory, setChatHistory]     = useState([]); // for multi-turn context

  // Insights state
  const [insights, setInsights]           = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getDeal(id);
        setDeal(res.data);
        setNotes(res.data.notes || []);
      } catch (err) {
        setError('Could not load deal. It may not exist or you may not have access.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleOutcome = async (outcome) => {
    setUpdatingOutcome(true);
    try {
      await updateOutcome(id, outcome);
      setDeal(d => ({ ...d, OUTCOME: outcome }));
    } catch {
      setError('Failed to update outcome');
    } finally {
      setUpdatingOutcome(false);
    }
  };

  // ── Notes handlers ────────────────────────────────────────────
  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await API.post(`/api/deals/${id}/notes`, { content: newNote });
      setNotes(prev => [...prev, {
        NOTE_ID: res.data.noteId,
        CONTENT: newNote.trim(),
        CREATED_AT: new Date().toISOString(),
        UPDATED_AT: new Date().toISOString(),
      }]);
      setNewNote('');
    } catch (err) {
      console.error('Save note error:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleEditSave = async (noteId) => {
    if (!editingContent.trim()) return;
    try {
      await API.put(`/api/deals/${id}/notes/${noteId}`, { content: editingContent });
      setNotes(prev => prev.map(n =>
        n.NOTE_ID === noteId
          ? { ...n, CONTENT: editingContent.trim(), UPDATED_AT: new Date().toISOString() }
          : n
      ));
      setEditingNoteId(null);
      setEditingContent('');
    } catch (err) {
      console.error('Update note error:', err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await API.delete(`/api/deals/${id}/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.NOTE_ID !== noteId));
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.NOTE_ID);
    setEditingContent(note.CONTENT);
  };

  // ── AI Chat handler ───────────────────────────────────────────
  const handleAskClaude = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput('');

    // Add user message to UI
    const userMsg = { role: 'user', content: question };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await API.post(`/api/deals/${id}/ask`, {
        question,
        conversationHistory: chatHistory,
      });

      const assistantMsg = { role: 'assistant', content: res.data.answer };
      setChatMessages(prev => [...prev, assistantMsg]);

      // Keep last 6 turns for context (avoid token bloat)
      setChatHistory(prev => {
        const updated = [...prev, userMsg, assistantMsg];
        return updated.slice(-12);
      });
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I couldn\'t process that. Please try again.',
        error: true,
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Insights handler ──────────────────────────────────────────
  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    setInsightsError('');
    try {
      const res = await API.get(`/api/deals/${id}/insights`);
      setInsights(res.data);
    } catch (err) {
      setInsightsError('Failed to generate insights. Try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-blue-500" size={28} />
    </div>
  );

  if (error || !deal) return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-medium mb-3">{error || 'Deal not found'}</p>
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const healthHistory = deal.healthHistory || [];
  const meetings      = deal.meetings || [];
  const followUps     = deal.followUps || [];
  const score         = deal.HEALTH_SCORE || 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Back nav */}
      <button onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* ── Deal Header ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{deal.CLIENT_NAME}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStageBadge(deal.STAGE)}`}>
                {deal.STAGE}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
              {deal.CLIENT_COMPANY && <span className="flex items-center gap-1"><Building2 size={14} />{deal.CLIENT_COMPANY}</span>}
              {deal.CLIENT_EMAIL && <span className="flex items-center gap-1"><Mail size={14} />{deal.CLIENT_EMAIL}</span>}
              {deal.DEAL_VALUE > 0 && (
                <span className="flex items-center gap-1 font-semibold text-gray-600">
                  <DollarSign size={14} />{formatCurrency(deal.DEAL_VALUE)}
                </span>
              )}
              {deal.INDUSTRY && <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{deal.INDUSTRY}</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <HealthGauge score={score} size={140} />
            {deal.OUTCOME === 'active' && (
              <div className="flex gap-2">
                <button onClick={() => handleOutcome('won')} disabled={updatingOutcome}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                  <Trophy size={13} /> Mark Won
                </button>
                <button onClick={() => handleOutcome('lost')} disabled={updatingOutcome}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                  <XCircle size={13} /> Mark Lost
                </button>
              </div>
            )}
            {deal.OUTCOME !== 'active' && (
              <div className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl
                ${deal.OUTCOME === 'won' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {deal.OUTCOME === 'won' ? '🏆 Won' : '❌ Lost'}
                <button onClick={() => handleOutcome('active')}
                  className="ml-1 text-xs opacity-60 hover:opacity-100 font-normal underline">reopen</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ───────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Health trend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">📈 Health Score Over Time</h2>
            {healthHistory.length < 2 ? (
              <div className="h-36 flex flex-col items-center justify-center text-gray-300">
                <p className="text-sm">Analyze more meetings to see trend</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={healthHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="CREATED_AT" tick={{ fontSize: 10 }}
                    tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}/100`, 'Health Score']} />
                  <Line type="monotone" dataKey="TOTAL_SCORE" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── AI CHAT ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Bot size={17} className="text-blue-500" />
              Ask Claude about this deal
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Ask anything — objections, next steps, client history, strategy
            </p>

            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={14} className="text-blue-600" />
                      </div>
                    )}
                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : msg.error
                          ? 'bg-red-50 text-red-600 border border-red-100 rounded-tl-sm'
                          : 'bg-gray-50 text-gray-700 border border-gray-100 rounded-tl-sm'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bot size={14} className="text-blue-600" />
                    </div>
                    <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Suggested questions */}
            {chatMessages.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  'What are the main objections?',
                  'What is the next best action?',
                  'Summarize the deal status',
                  'What did they say about budget?',
                ].map(q => (
                  <button key={q} onClick={() => setChatInput(q)}
                    className="text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-gray-500 border border-gray-200 hover:border-blue-200 px-3 py-1.5 rounded-full transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskClaude()}
                placeholder="Ask about this customer..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder-gray-300"
              />
              <button
                onClick={handleAskClaude}
                disabled={chatLoading || !chatInput.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <StickyNote size={17} className="text-amber-500" />
              Notes
              {notes.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-600 font-bold px-2 py-0.5 rounded-full">{notes.length}</span>
              )}
            </h2>

            {notes.length === 0 ? (
              <p className="text-sm text-gray-300 mb-4">No notes yet. Add one below.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {notes.map((note) => (
                  <div key={note.NOTE_ID}
                    className="group border border-gray-100 rounded-xl p-3.5 hover:border-amber-200 transition-colors bg-amber-50/30">
                    {editingNoteId === note.NOTE_ID ? (
                      <div className="space-y-2">
                        <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)} rows={3}
                          className="w-full text-sm text-gray-700 bg-white border border-amber-300 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(note.NOTE_ID)}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                            <Save size={12} /> Save
                          </button>
                          <button onClick={() => { setEditingNoteId(null); setEditingContent(''); }}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                            <X size={12} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.CONTENT}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-300">
                            {new Date(note.CREATED_AT).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {note.UPDATED_AT !== note.CREATED_AT && <span className="ml-1 italic">· edited</span>}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(note)}
                              className="p-1.5 rounded-lg hover:bg-amber-100 text-gray-400 hover:text-amber-600 transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteNote(note.NOTE_ID)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNote(); }}
                placeholder="Add a note... (Cmd+Enter to save)" rows={3}
                className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 placeholder-gray-300" />
              <button onClick={handleSaveNote} disabled={savingNote || !newNote.trim()}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                {savingNote ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Note
              </button>
            </div>
          </div>

          {/* Meetings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Meetings ({meetings.length})</h2>
              <Link to="/new" className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                <PlusCircle size={14} /> New Analysis
              </Link>
            </div>
            {meetings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300 text-sm mb-3">No meetings analyzed yet</p>
                <Link to="/new"
                  className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                  <PlusCircle size={13} /> Analyze First Meeting
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {meetings.map((m, i) => (
                  <div key={m.MEETING_ID || i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedMeeting(expandedMeeting === i ? null : i)}
                      className="w-full flex items-start justify-between p-3.5 text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Meeting {i + 1}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            {new Date(m.CREATED_AT).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {m.INPUT_TYPE && <span className="ml-1 capitalize">· {m.INPUT_TYPE}</span>}
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={16} className={`text-gray-300 mt-1 transition-transform ${expandedMeeting === i ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedMeeting === i && m.GEMINI_SUMMARY && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-50 bg-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed">{m.GEMINI_SUMMARY}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follow-ups */}
          {followUps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Follow-Up Emails ({followUps.length})</h2>
              <div className="space-y-3">
                {followUps.map((fu, i) => (
                  <div key={fu.FOLLOWUP_ID || i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-800">{fu.EMAIL_SUBJECT}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2
                        ${fu.STATUS === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {fu.STATUS}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{fu.EMAIL_BODY?.replace(/\\n/g, ' ')}</p>
                    <p className="text-xs text-gray-300 mt-2">{new Date(fu.CREATED_AT).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ──────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Score breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Score Breakdown</h2>
            {[
              { label: 'Sentiment',  key: 'SENTIMENT_SCORE',  max: 25, icon: '😊' },
              { label: 'Objections', key: 'OBJECTION_SCORE',  max: 25, icon: '🛡️' },
              { label: 'Commitment', key: 'COMMITMENT_SCORE', max: 25, icon: '✅' },
              { label: 'Engagement', key: 'ENGAGEMENT_SCORE', max: 25, icon: '⚡' },
            ].map(({ label, key, max, icon }) => {
              const val = healthHistory.length > 0 ? healthHistory[healthHistory.length - 1]?.[key] ?? 0 : 0;
              return (
                <div key={key} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{icon} {label}</span>
                    <span className={`font-semibold ${getScoreColor(val * 4)}`}>{val}/{max}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${(val / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── AI INSIGHTS ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Lightbulb size={17} className="text-yellow-500" />
                AI Insights
              </h2>
              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-xl transition-all disabled:opacity-50">
                {insightsLoading
                  ? <><RefreshCw size={12} className="animate-spin" /> Analyzing...</>
                  : <><Sparkles size={12} /> {insights ? 'Refresh' : 'Generate'}</>}
              </button>
            </div>

            {!insights && !insightsLoading && !insightsError && (
              <div className="text-center py-6">
                <Lightbulb size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Click Generate to get AI-powered insights based on all deal data — meetings, notes, and history.</p>
              </div>
            )}

            {insightsError && (
              <p className="text-xs text-red-500 text-center py-4">{insightsError}</p>
            )}

            {insights && (
              <div className="space-y-3">
                {/* Deal summary + win probability */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">{insights.dealSummary}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${insights.winProbability}%`,
                          backgroundColor: insights.winProbability >= 70 ? '#22c55e' : insights.winProbability >= 40 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 shrink-0">{insights.winProbability}% win</span>
                  </div>
                </div>

                {/* Individual insight cards */}
                {insights.insights?.map((insight, i) => {
                  const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.action;
                  return (
                    <div key={i} className={`border rounded-xl p-3 ${style.bg}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {style.icon}
                        <p className={`text-xs font-semibold ${style.label}`}>{insight.title}</p>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{insight.body}</p>
                    </div>
                  );
                })}

                {/* Recommended next step */}
                {insights.recommendedNextStep && (
                  <div className="bg-gray-900 rounded-xl p-3">
                    <p className="text-xs font-semibold text-white mb-1">🎯 Recommended Next Step</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{insights.recommendedNextStep}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Objections */}
          <ObjectionsList
            objections={healthHistory.length > 0 ? (healthHistory[healthHistory.length - 1]?.FLAGGED_PHRASES || []) : []}
            commitments={healthHistory.length > 0 ? (healthHistory[healthHistory.length - 1]?.COMMITMENT_SIGNALS || []) : []}
          />

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/new"
                className="flex items-center gap-2 w-full p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors">
                <PlusCircle size={16} /> Analyze New Meeting
              </Link>
              {deal.CLIENT_EMAIL && (
                <a href={`mailto:${deal.CLIENT_EMAIL}`}
                  className="flex items-center gap-2 w-full p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors">
                  <Mail size={16} /> Email {deal.CLIENT_NAME}
                </a>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DealDetail;
