import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';

const OfficeDuckSVG = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="19" width="14" height="11" rx="2" fill="#1e3a5f"/>
    <rect x="13" y="19" width="6" height="11" fill="white"/>
    <polygon points="15.5,21 16.5,21 17,26 16,27.5 15,26" fill="#ef4444"/>
    <rect x="15.2" y="20.5" width="1.6" height="1.2" rx="0.3" fill="#b91c1c"/>
    <polygon points="9,19 13,19 11,24" fill="#162d4a"/>
    <polygon points="23,19 19,19 21,24" fill="#162d4a"/>
    <circle cx="16" cy="12" r="6.5" fill="#facc15"/>
    <circle cx="18" cy="11" r="1.5" fill="#1e293b"/>
    <circle cx="18.5" cy="10.4" r="0.5" fill="white"/>
    <path d="M21 12 L25 11.5 L25 13 L21 13 Z" fill="#f97316"/>
    <line x1="21.5" y1="12.3" x2="24.5" y2="12" stroke="white" strokeWidth="0.4" opacity="0.6"/>
    <rect x="12" y="18" width="8" height="2" rx="1" fill="white"/>
    <ellipse cx="13" cy="30" rx="3" ry="1.2" fill="#f97316"/>
    <ellipse cx="19" cy="30" rx="3" ry="1.2" fill="#f97316"/>
  </svg>
);

const TECH_TAGS = [
  { label: 'Claude AI',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Snowflake',   color: 'bg-blue-50   text-blue-700   border-blue-200'   },
  { label: 'Databricks',  color: 'bg-red-50    text-red-700    border-red-200'    },
  { label: 'Firebase',    color: 'bg-amber-50  text-amber-700  border-amber-200'  },
  { label: 'React',       color: 'bg-cyan-50   text-cyan-700   border-cyan-200'   },
  { label: 'Deal Health Score', color: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Express.js', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const FEATURES = [
  { icon: '🤖', title: 'Claude AI Analysis',      desc: 'Instant meeting analysis & insights'   },
  { icon: '📊', title: 'Deal Health Score',        desc: 'Real-time scoring across all deals'    },
  { icon: '❄️', title: 'Snowflake Data Warehouse', desc: 'Enterprise-grade data pipeline'        },
  { icon: '🔔', title: 'Smart Reminders',          desc: 'Never miss a follow-up again'          },
];

const TEAM = [
  {
    name: 'Tanmay Pradeep Katke',
    role: 'Backend & AI Design',
    isLeader: true,
    emoji: '🤖',
    badge: 'bg-blue-100 text-blue-700',
    avatarBg: 'bg-gradient-to-br from-blue-500 to-purple-600',
    initials: 'TK',
    description: 'Architected the backend systems and integrated Claude AI for meeting analysis, deal health scoring, and the intelligent reminder engine.',
    skills: ['Claude AI', 'Node.js', 'Snowflake', 'Databricks', 'Express'],
    linkedin: 'https://www.linkedin.com/in/tanmaykatke21/',
    email: 'katketanmay2102@gmail.com',
  },
  {
    name: 'Viraj Tapkir',
    role: 'Data Engineering',
    emoji: '❄️',
    badge: 'bg-cyan-100 text-cyan-700',
    avatarBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
    initials: 'VT',
    description: 'Built the data pipeline — Snowflake schema design, Databricks integration, and the 100-record seed dataset across 8 industries.',
    skills: ['Snowflake', 'Databricks', 'SQL', 'Data Pipeline'],
    linkedin: 'https://www.linkedin.com/in/virajtapkir/',
    email: 'virajvilastapkir@gmail.com',
  },
  {
    name: 'Abhishek Thakkar',
    role: 'Frontend Engineer',
    emoji: '🎨',
    badge: 'bg-green-100 text-green-700',
    avatarBg: 'bg-gradient-to-br from-green-500 to-teal-600',
    initials: 'AT',
    description: 'Crafted core UI components — deal cards, health gauge, objections list, and the analytics dashboard that brings data to life.',
    skills: ['React', 'Tailwind CSS', 'Recharts', 'UI/UX'],
    linkedin: 'https://www.linkedin.com/in/abhi-s-thakkar/',
    email: 'abhithakkar2001@gmail.com',
  },
  {
    name: 'Sai Bhavesh Karnam',
    role: 'Frontend Engineer',
    emoji: '⚡',
    badge: 'bg-amber-100 text-amber-700',
    avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    initials: 'SK',
    description: 'Engineered the analysis flow, audio/image input pipeline, follow-up email generator, and text-to-speech accessibility features.',
    skills: ['React', 'Firebase', 'Web APIs', 'TailwindCSS'],
    linkedin: 'https://www.linkedin.com/in/sai-bhavesh/',
    email: 'saibhaveshkarnam@gmail.com',
  },
];

const Login = () => {
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err) {
      setError('Sign-in failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── About Us View ───────────────────────────────────────────
  if (showAbout) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10 overflow-y-auto">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => setShowAbout(false)}
          className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold mb-6 transition-colors">
          ← Back to Sign In
        </button>

        {/* Hero */}
        <div className="relative bg-slate-800 bg-opacity-60 rounded-3xl p-10 mb-6 text-center overflow-hidden border border-slate-700">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-slate-600">
                <OfficeDuckSVG size={60} />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2">
              quack<span className="text-yellow-400">Deal</span>
            </h1>
            <p className="text-blue-200 text-lg mb-3 font-medium">AI-Powered Sales Intelligence Platform</p>
            <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
              Built in 24 hours for <span className="text-yellow-400 font-semibold">QuackHacks 2026</span> · ADP Challenge.
              quackDeal helps sales reps understand deal health, surface risks, and close more deals using Claude AI, Snowflake, and Databricks.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['🏆 QuackHacks 2026', '⚡ ADP Challenge', '🤖 Claude AI', '❄️ Snowflake'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-white bg-opacity-10 text-white text-xs font-medium rounded-full border border-white border-opacity-20">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* What we built */}
        <div className="bg-white rounded-2xl p-6 mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🚀 What We Built</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 leading-relaxed">
            <p>📊 <span className="font-semibold text-gray-800">Deal Health Scoring</span> — Real-time AI scoring across sentiment, objections, and engagement.</p>
            <p>🤖 <span className="font-semibold text-gray-800">Claude AI Analysis</span> — Analyze transcripts, screenshots, and live voice recordings.</p>
            <p>💬 <span className="font-semibold text-gray-800">Pipeline AI Chat</span> — Ask anything about your deals in plain English.</p>
            <p>🔔 <span className="font-semibold text-gray-800">Smart Reminders</span> — Automated alerts for stalled deals and overdue follow-ups.</p>
            <p>💡 <span className="font-semibold text-gray-800">AI Insights</span> — Win probability, risk flags, and recommended next steps.</p>
            <p>📧 <span className="font-semibold text-gray-800">Follow-Up Generator</span> — AI-written emails with text-to-speech playback.</p>
          </div>
        </div>

        {/* Tech stack */}
        <div className="bg-white rounded-2xl p-6 mb-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🛠️ Tech Stack</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Claude AI', color: 'bg-purple-100 text-purple-700' },
              { label: 'Snowflake', color: 'bg-blue-100 text-blue-700' },
              { label: 'Databricks', color: 'bg-red-100 text-red-700' },
              { label: 'Firebase', color: 'bg-amber-100 text-amber-700' },
              { label: 'React', color: 'bg-cyan-100 text-cyan-700' },
              { label: 'Node.js', color: 'bg-green-100 text-green-700' },
              { label: 'Tailwind CSS', color: 'bg-teal-100 text-teal-700' },
              { label: 'Recharts', color: 'bg-indigo-100 text-indigo-700' },
              { label: 'Express.js', color: 'bg-gray-100 text-gray-700' },
            ].map(t => (
              <span key={t.label} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${t.color}`}>{t.label}</span>
            ))}
          </div>
        </div>

        {/* Team */}
        <h2 className="text-lg font-bold text-white mb-4">👥 Meet the Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {TEAM.map(member => (
            <div key={member.name} className="bg-white rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl ${member.avatarBg} flex items-center justify-center text-white font-bold text-base shadow shrink-0`}>
                  {member.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                    {member.isLeader && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300">
                        👑 Team Lead
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${member.badge}`}>
                    {member.emoji} {member.role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">{member.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {member.skills.map(skill => (
                  <span key={skill} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{skill}</span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <a href={member.linkedin} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors">
                  🔗 LinkedIn
                </a>
                <a href={`mailto:${member.email}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl transition-colors">
                  ✉️ {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-slate-400 text-xs pb-4">
          Built with ❤️ at QuackHacks 2026 · ADP Challenge
        </div>
      </div>
    </div>
  );

  // ── Login View ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left: Branding */}
        <div className="text-white text-center lg:text-left">
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-20 h-20 bg-slate-700 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-slate-600">
              <OfficeDuckSVG size={60} />
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-3 tracking-tight">
            quack<span className="text-yellow-400">Deal</span>
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            AI-powered sales intelligence.<br/>
            Know your deal health before it's too late.
          </p>
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-lg shrink-0">{f.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-700 rounded-2xl mb-4 shadow-md">
              <OfficeDuckSVG size={44} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your sales dashboard</p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-6">
            {TECH_TAGS.map(tag => (
              <span key={tag.label} className={`px-2.5 py-1 text-xs font-medium rounded-full border ${tag.color}`}>
                {tag.label}
              </span>
            ))}
          </div>

          <div className="relative flex items-center mb-6">
            <div className="flex-1 border-t border-gray-100" />
            <span className="px-3 text-xs text-gray-400">continue with</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-md text-gray-700 font-semibold py-3.5 px-6 rounded-2xl transition-all duration-200 disabled:opacity-60 mb-4">
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

          <p className="text-gray-400 text-xs text-center mb-3">
            Built for <span className="font-semibold text-gray-500">QuackHacks 2026</span> · ADP Challenge
          </p>

          <button onClick={() => setShowAbout(true)}
            className="w-full text-xs text-blue-500 hover:text-blue-700 font-semibold hover:underline transition-colors">
            👥 Meet the Team & About This Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
