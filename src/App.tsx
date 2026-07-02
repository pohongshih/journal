/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './components/Login';
import AdminView from './components/AdminView';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import { LoadingOverlay } from './components/ui/Loading';
import { BookOpen, LogOut } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeRoleView, setActiveRoleView] = useState<'admin' | 'teacher' | 'student' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('journal_user');
    if (saved) {
      const parsedUser = JSON.parse(saved);
      setUser(parsedUser);
      setActiveRoleView(parsedUser.role);
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setActiveRoleView(u.role);
    localStorage.setItem('journal_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    setActiveRoleView(null);
    localStorage.removeItem('journal_user');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-blue-500/20">
      {/* Global Loading state */}
      <LoadingOverlay isLoading={isLoading} />

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">線上週記管理平台</span>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-slate-600 hidden sm:block">
                {user.name} <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500 border border-slate-200">{user.role}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 lg:p-8 flex-1">
        {!user && <Login onLogin={handleLogin} setLoading={setIsLoading} />}
        
        {user && activeRoleView === 'admin' && (
          <AdminView 
            setLoading={setIsLoading} 
            onNavigateToTeacher={() => setActiveRoleView('teacher')} 
          />
        )}
        
        {user && activeRoleView === 'teacher' && (
          <TeacherView 
            user={user} 
            setLoading={setIsLoading}
            onNavigateToAdmin={user.role === 'admin' ? () => setActiveRoleView('admin') : undefined}
          />
        )}
        
        {user && activeRoleView === 'student' && (
          <StudentView 
            user={user} 
            setLoading={setIsLoading} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-200 mt-auto flex-shrink-0">
        © 2026 施柏宏. All rights reserved.
      </footer>
    </div>
  );
}
