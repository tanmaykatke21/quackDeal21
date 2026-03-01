import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { LayoutDashboard, PlusCircle, BarChart3, LogOut } from 'lucide-react';
import ReminderBell from '../ReminderBell';

const Navbar = ({ user }) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
    { path: '/new',       label: 'New Analysis', icon: PlusCircle },
    { path: '/analytics', label: 'Analytics',    icon: BarChart3 },
  ];

  return (
    <nav className="bg-slate-900 text-white h-screen w-60 fixed left-0 top-0 flex flex-col p-4 z-50">
      <div className="flex items-center justify-between mb-8 px-2 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          </div>
          <span className="font-bold text-lg">quackDeal</span>
        </div>
        <div className="text-slate-400">
          <ReminderBell />
        </div>
      </div>
      <ul className="flex-1 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <Link
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${location.pathname === path
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <img
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email}`}
            alt="avatar"
            className="w-8 h-8 rounded-full"
          />
          <div className="overflow-hidden">
            <p className="text-xs text-white font-medium truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

    </nav>
  );
};

export default Navbar;