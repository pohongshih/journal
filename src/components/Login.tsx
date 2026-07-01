import React, { useState } from 'react';
import { BookOpen, LogIn } from 'lucide-react';
import { callApi } from '../lib/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export default function Login({ onLogin, setLoading }: LoginProps) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await callApi('login', { account, password });
      if (res.status === 'success') {
        onLogin(res);
      } else {
        setError(res.message || '登入失敗');
      }
    } catch (err) {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-100">
        <div className="bg-slate-50 px-8 pt-10 pb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">高中線上週記管理平台</h2>
          <p className="text-slate-500 mt-2">士林高商資料處理科</p>
        </div>
        
        <div className="px-8 pb-10 pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                帳號
              </label>
              <input
                type="text"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="學號"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                密碼
              </label>
              <input
                type="password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="身分證字號"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
            >
              <LogIn className="h-5 w-5" />
              登入系統
            </button>
          
          </form>
        </div>
      </div>
    </div>
  );
}
