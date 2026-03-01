import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDeal, analyzeText, analyzeFile, generateFollowUp } from '../services/api';
import HealthGauge from '../components/Deal/HealthGauge';
import { Upload, FileText, Mic, Image, Loader2, ChevronRight, Sparkles, Mail, Square, Circle, Volume2, VolumeX } from 'lucide-react';
import { getScoreBg } from '../utils/dealHealth';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001' });

const STAGES = ['discovery', 'proposal', 'negotiation', 'closing'];
const INPUT_TYPES = [
  { id: 'text',  label: 'Paste Transcript', icon: FileText, desc: 'Paste meeting notes or transcript' },
  { id: 'audio', label: 'Record Audio',      icon: Mic,      desc: 'Record meeting live with your mic' },
  { id: 'image', label: 'Screenshot',        icon: Image,    desc: 'Upload screenshot of email/chat' },
];

// ── Convert file to base64 ────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]); // strip data:...;base64,
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const NewAnalysis = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [inputType, setInputType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingTarget, setSpeakingTarget] = useState(null); // 'email' | 'summary' | 'action'
  const [error, setError] = useState('');

  // Form state
  const [dealForm, setDealForm] = useState({
    clientName: '', clientCompany: '', clientEmail: '',
    dealValue: '', industry: '', stage: 'discovery',
  });
  const [transcriptText, setTranscriptText] = useState('');
  const [file, setFile] = useState(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioStatus, setAudioStatus] = useState('');
  const recognitionRef = useRef(null);

  // Results state
  const [results, setResults] = useState(null);
  const [followUpEmail, setFollowUpEmail] = useState(null);
  const [dealId, setDealId] = useState(null);

  // ── Step 1: Create Deal ──────────────────────────────────────
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!dealForm.clientName.trim()) { setError('Client name is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await createDeal({ ...dealForm, dealValue: parseFloat(dealForm.dealValue) || 0 });
      setDealId(res.data.dealId);
      setStep(2);
    } catch (err) {
      setError('Failed to create deal. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Audio: Live Recording via Web Speech API ─────────────────
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAudioStatus('⚠️ Your browser does not support live recording. Please upload an audio file instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let fullTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) fullTranscript += t + ' ';
        else interim = t;
      }
      setAudioTranscript(fullTranscript + interim);
    };
    recognition.onerror = (e) => {
      setAudioStatus(`Recording error: ${e.error}`);
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setAudioStatus('✅ Recording complete. Review transcript below then click Analyze.');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setAudioStatus('🎙️ Recording... speak clearly');
    setAudioTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  // ── Step 2: Analyze ──────────────────────────────────────────
  const handleAnalyze = async () => {
    setError('');

    // Determine what to send based on input type
    let payload = { dealId, inputType: 'text' };

    if (inputType === 'text') {
      if (!transcriptText.trim()) { setError('Please enter transcript text'); return; }
      payload.text = transcriptText;

    } else if (inputType === 'audio') {
      if (!audioTranscript.trim()) {
        setError('Please use the live recording button to record your meeting first.');
        return;
      }
      payload.text = audioTranscript;
      payload.inputType = 'text';

    } else if (inputType === 'image') {
      if (!file) { setError('Please upload a screenshot'); return; }
      try {
        setLoading(true);
        const base64 = await fileToBase64(file);
        payload = { dealId, inputType: 'image', imageBase64: base64, mediaType: file.type };
      } catch {
        setError('Failed to read image file.');
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await API.post('/api/analyze', payload);
      setResults(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Check your API keys and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Generate Follow-Up Email ─────────────────────────────────
  const handleGenerateFollowUp = async () => {
    setLoadingFollowUp(true);
    try {
      const res = await API.post('/api/analyze/followup', {
        dealId,
        meetingId: results.meetingId,
        clientName: dealForm.clientName,
        clientCompany: dealForm.clientCompany,
        healthScore: results.healthScore,
        geminiAnalysis: results.geminiAnalysis,
      });
      setFollowUpEmail(res.data.email);
    } catch (err) {
      setError('Follow-up generation failed.');
    } finally {
      setLoadingFollowUp(false);
    }
  };

  // ── Text to Speech ───────────────────────────────────────────
  const speak = (text, target) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeakingTarget(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.volume = 1;
    // Pick a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.name.includes('Karen'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => { setIsSpeaking(true); setSpeakingTarget(target); };
    utterance.onend = () => { setIsSpeaking(false); setSpeakingTarget(null); };
    utterance.onerror = () => { setIsSpeaking(false); setSpeakingTarget(null); };
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingTarget(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Meeting Analysis</h1>
        <p className="text-gray-400 text-sm mt-1">Analyze a meeting and get your deal health score instantly</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Deal Info', 'Meeting Input', 'Results'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all
              ${step === i + 1 ? 'bg-blue-100 text-blue-700' : step > i + 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* ── STEP 1: Deal Info ────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleCreateDeal} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 mb-2">Deal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Client Name *</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Sarah Chen" value={dealForm.clientName}
                onChange={e => setDealForm({...dealForm, clientName: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Acme Corp" value={dealForm.clientCompany}
                onChange={e => setDealForm({...dealForm, clientCompany: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deal Value ($)</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="50000" value={dealForm.dealValue}
                onChange={e => setDealForm({...dealForm, dealValue: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Technology" value={dealForm.industry}
                onChange={e => setDealForm({...dealForm, industry: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={dealForm.stage} onChange={e => setDealForm({...dealForm, stage: e.target.value})}>
                {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Continue to Meeting Input
          </button>
        </form>
      )}

      {/* ── STEP 2: Meeting Input ────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">How would you like to input the meeting?</h2>

          {/* Input Type Selector */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {INPUT_TYPES.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => { setInputType(id); setError(''); setAudioTranscript(''); setAudioStatus(''); setFile(null); }}
                className={`p-3 rounded-xl border-2 text-left transition-all
                  ${inputType === id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}>
                <Icon size={20} className={inputType === id ? 'text-blue-600' : 'text-gray-400'} />
                <p className={`text-sm font-medium mt-1.5 ${inputType === id ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          {/* ── Text Input ── */}
          {inputType === 'text' && (
            <textarea rows={12}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
              placeholder={`Paste your meeting transcript here...\n\nExample:\nRep: Thanks for taking the time today, Sarah.\nSarah: Of course! We've been evaluating a few options.\nRep: What's most important to you in this decision?\nSarah: Honestly, the budget is a bit tight right now...`}
              value={transcriptText}
              onChange={e => setTranscriptText(e.target.value)}
            />
          )}

          {/* ── Audio Input ── */}
          {inputType === 'audio' && (
            <div className="space-y-4">
              {/* Live recording */}
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">🎙️ Live Recording</p>
                <div className="flex gap-3">
                  {!isRecording ? (
                    <button onClick={startRecording}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                      <Circle size={14} className="fill-white" /> Start Recording
                    </button>
                  ) : (
                    <button onClick={stopRecording}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors animate-pulse">
                      <Square size={14} className="fill-white" /> Stop Recording
                    </button>
                  )}
                </div>
                {audioStatus && (
                  <p className="text-xs text-gray-500 mt-2">{audioStatus}</p>
                )}
                {audioTranscript && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Transcript preview:</p>
                    <textarea
                      rows={5}
                      value={audioTranscript}
                      onChange={e => setAudioTranscript(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none text-gray-700"
                    />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── Image Input ── */}
          {inputType === 'image' && (
            <div className="space-y-3">
              <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
                <Upload size={28} className="text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  {file ? `✅ ${file.name}` : 'Drop your screenshot here'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 20MB</p>
                <input type="file" className="hidden"
                  accept="image/*"
                  onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
              </label>
              {/* Preview */}
              {file && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-full max-h-48 object-contain rounded-xl border border-gray-200"
                />
              )}
            </div>
          )}

          <button onClick={handleAnalyze} disabled={loading}
            className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing with Claude AI...</>
            ) : (
              <><Sparkles size={16} /> Analyze Meeting</>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 3: Results ──────────────────────────────────── */}
      {step === 3 && results && (
        <div className="space-y-5">

          {/* Health Score Card */}
          <div className={`bg-white rounded-2xl border-2 p-6 ${getScoreBg(results.healthScore)}`}>
            <h2 className="font-semibold text-gray-800 mb-4">Deal Health Score</h2>
            <div className="flex items-center gap-8">
              <HealthGauge score={results.healthScore || 0} />
              <div className="flex-1">
                {results.scoreBreakdown && Object.entries(results.scoreBreakdown).map(([key, val]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 capitalize">{key}</span>
                      <span className="font-medium">{val}/25</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(val/25)*100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Claude Analysis */}
          {results.geminiAnalysis && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🤖</span> Claude Analysis
                </h2>
                <button
                  onClick={() => speak(
                    `Summary: ${results.geminiAnalysis.summary}. Next best action: ${results.geminiAnalysis.nextBestAction}`,
                    'summary'
                  )}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors
                    ${speakingTarget === 'summary'
                      ? 'bg-purple-100 text-purple-700 animate-pulse'
                      : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'}`}>
                  {speakingTarget === 'summary'
                    ? <><VolumeX size={13} /> Stop</>
                    : <><Volume2 size={13} /> Listen</>}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">{results.geminiAnalysis.summary}</p>

              <div className="grid grid-cols-2 gap-4">
                {results.geminiAnalysis.objections?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">⚠️ Objections Detected</p>
                    <ul className="space-y-1">
                      {results.geminiAnalysis.objections.map((o, i) => (
                        <li key={i} className="text-xs bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg">{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {results.geminiAnalysis.commitmentSignals?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">✅ Positive Signals</p>
                    <ul className="space-y-1">
                      {results.geminiAnalysis.commitmentSignals.map((c, i) => (
                        <li key={i} className="text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {results.geminiAnalysis.nextBestAction && (
                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Next Best Action</p>
                  <p className="text-sm text-blue-800">{results.geminiAnalysis.nextBestAction}</p>
                </div>
              )}
            </div>
          )}

          {/* Follow-Up Email Generator */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail size={18} className="text-blue-500" /> Generate Follow-Up Email
              </h2>
              <button onClick={handleGenerateFollowUp} disabled={loadingFollowUp}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                {loadingFollowUp ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loadingFollowUp ? 'Generating...' : 'Generate with Claude'}
              </button>
            </div>

            {followUpEmail ? (
              <div>
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Subject</p>
                  <p className="text-sm font-medium text-gray-800">{followUpEmail.subject}</p>
                </div>
                <textarea rows={10}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  defaultValue={followUpEmail.body?.replace(/\\n/g, '\n')} />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigator.clipboard.writeText(followUpEmail.body)}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2 rounded-xl text-sm font-medium transition-colors">
                    📋 Copy
                  </button>
                  <button
                    onClick={() => speak(`${followUpEmail.subject}. ${followUpEmail.body}`, 'email')}
                    className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                      ${speakingTarget === 'email'
                        ? 'bg-purple-100 text-purple-700 animate-pulse'
                        : 'border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`}>
                    {speakingTarget === 'email'
                      ? <><VolumeX size={14} /> Stop</>
                      : <><Volume2 size={14} /> Listen</>}
                  </button>
                  <button onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-medium transition-colors">
                    ✅ Done — View Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Click "Generate with Claude" to create a personalized follow-up email based on this meeting
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewAnalysis;
