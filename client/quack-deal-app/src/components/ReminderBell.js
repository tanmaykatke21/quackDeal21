import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Bell, X, CheckCheck, AlertTriangle, Clock, Mail, TrendingDown } from 'lucide-react';

const PRIORITY_STYLES = {
  urgent: { bg: 'bg-red-50 border-red-200',    badge: 'bg-red-500',    text: 'text-red-700',    icon: '🔴' },
  high:   { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-500',  text: 'text-amber-700',  icon: '🟡' },
  normal: { bg: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-400',   text: 'text-blue-700',   icon: '🔵' },
};

const TYPE_ICONS = {
  no_activity:   <Clock size={14} />,
  score_drop:    <TrendingDown size={14} />,
  draft_followup:<Mail size={14} />,
  stage_stuck:   <AlertTriangle size={14} />,
};

const TYPE_LABELS = {
  no_activity:    'No Activity',
  score_drop:     'Score Drop',
  draft_followup: 'Unsent Follow-up',
  stage_stuck:    'Stage Stuck',
};

const ReminderBell = () => {
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchReminders = async () => {
    try {
      const res = await API.get('/api/reminders');
      setReminders(res.data.reminders || []);
    } catch (err) {
      console.error('Fetch reminders error:', err);
    }
  };

  // Trigger a scan then fetch fresh reminders
  const scanAndFetch = async () => {
    setLoading(true);
    try {
      await API.post('/api/reminders/scan');
      await fetchReminders();
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    // Poll every 5 minutes
    const interval = setInterval(fetchReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDismiss = async (e, reminderId) => {
    e.stopPropagation();
    try {
      await API.patch(`/api/reminders/${reminderId}/dismiss`);
      setReminders(prev => prev.filter(r => r.REMINDER_ID !== reminderId));
    } catch (err) {
      console.error('Dismiss error:', err);
    }
  };

  const handleDismissAll = async () => {
    try {
      await API.patch('/api/reminders/dismiss-all/all');
      setReminders([]);
    } catch (err) {
      console.error('Dismiss all error:', err);
    }
  };

  const handleReminderClick = (reminder) => {
    setOpen(false);
    navigate(`/deals/${reminder.DEAL_ID}`);
  };

  const urgentCount = reminders.filter(r => r.PRIORITY === 'urgent').length;
  const totalCount  = reminders.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <Bell size={20} className={totalCount > 0 ? 'text-gray-700' : 'text-gray-400'} />
        {totalCount > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center
            text-white text-[10px] font-bold rounded-full px-1
            ${urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-12 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Reminders</span>
              {totalCount > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={scanAndFetch}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                {loading ? 'Scanning...' : 'Scan now'}
              </button>
              {totalCount > 0 && (
                <button
                  onClick={handleDismissAll}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
                  <CheckCheck size={13} /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Reminder list */}
          <div className="max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                <Bell size={28} className="mb-2" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No active reminders</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {reminders.map(reminder => {
                  const styles = PRIORITY_STYLES[reminder.PRIORITY] || PRIORITY_STYLES.normal;
                  return (
                    <div
                      key={reminder.REMINDER_ID}
                      onClick={() => handleReminderClick(reminder)}
                      className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer
                        hover:shadow-sm transition-all ${styles.bg}`}
                    >
                      {/* Priority dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${styles.badge}`} />

                      <div className="flex-1 min-w-0">
                        {/* Type badge */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`flex items-center gap-1 text-xs font-semibold ${styles.text}`}>
                            {TYPE_ICONS[reminder.TYPE]}
                            {TYPE_LABELS[reminder.TYPE]}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs font-medium text-gray-500 truncate">
                            {reminder.CLIENT_NAME}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                          {reminder.MESSAGE}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-300">
                            {new Date(reminder.CREATED_AT).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {reminder.HEALTH_SCORE != null && (
                            <span className="text-xs text-gray-400">
                              · Score: {reminder.HEALTH_SCORE}/100
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        onClick={(e) => handleDismiss(e, reminder.REMINDER_ID)}
                        className="shrink-0 p-1 rounded-lg hover:bg-white hover:shadow-sm text-gray-300 hover:text-gray-500 transition-all">
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderBell;
