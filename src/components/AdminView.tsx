import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { callApi } from '../lib/api';
import { Settings, ShieldCheck, Play, Pause, Trash2, Edit2 } from 'lucide-react';
import { Modal } from './ui/Modal';

interface AdminViewProps {
  setLoading: (loading: boolean) => void;
  onNavigateToTeacher: () => void;
}

export default function AdminView({ setLoading, onNavigateToTeacher }: AdminViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await callApi('getAdminData');
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (action: string, userId: string, payload: any = {}) => {
    if (action === 'delete' && !window.confirm('確定要刪除此帳號？')) return;
    
    setLoading(true);
    try {
      await callApi('adminAction', { subAction: action, userId, payload });
      await fetchUsers();
      setEditUser(null);
    } catch (e) {
      console.error(e);
      alert('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            管理者後台
          </h1>
          <p className="text-slate-500 mt-1">管理教師帳號與系統權限</p>
        </div>
        <button 
          onClick={onNavigateToTeacher}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          進入教學介面
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-800">老師帳號管理</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">姓名</th>
                <th className="px-6 py-3 font-medium">帳號</th>
                <th className="px-6 py-3 font-medium">班級</th>
                <th className="px-6 py-3 font-medium">狀態</th>
                <th className="px-6 py-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map(u => (
                <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4">{u.account}</td>
                  <td className="px-6 py-4">{u.class || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.status === 'active' ? '啟用中' : '已停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setEditUser(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      
                      {u.status === 'active' ? (
                        <button 
                          onClick={() => handleAction('suspend', u.userId)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="停用"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAction('activate', u.userId)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="啟用"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleAction('delete', u.userId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    尚無教師資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="編輯老師資料"
        footer={
          <>
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button 
              onClick={() => handleAction('update', editUser!.userId, editUser)} 
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
            >
              儲存更新
            </button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">帳號</label>
              <input 
                type="text" 
                value={editUser.account}
                onChange={e => setEditUser({...editUser, account: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
              <input 
                type="text" 
                value={editUser.name}
                onChange={e => setEditUser({...editUser, name: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">負責班級</label>
              <input 
                type="text" 
                value={editUser.class || ''}
                onChange={e => setEditUser({...editUser, class: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
              <input 
                type="text" 
                value={editUser.password}
                onChange={e => setEditUser({...editUser, password: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
