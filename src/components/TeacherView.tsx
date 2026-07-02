import React, { useState, useEffect } from 'react';
import { User, Topic, Journal, Student } from '../types';
import { callApi } from '../lib/api';
import { Users, PenTool, Megaphone, ArrowLeft, Download, Plus, Bot, FileText, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { Modal } from './ui/Modal';

interface TeacherViewProps {
  user: User;
  setLoading: (loading: boolean) => void;
  onNavigateToAdmin?: () => void;
}

export default function TeacherView({ user, setLoading, onNavigateToAdmin }: TeacherViewProps) {
  const [activeTab, setActiveTab] = useState<'grade' | 'publish' | 'students'>('grade');
  const [students, setStudents] = useState<Student[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  
  // Grade state
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [gradingJournal, setGradingJournal] = useState<{ student: Student, journal: Journal | null } | null>(null);
  const [gradeComment, setGradeComment] = useState('');

  // Publish state
  const [pubForm, setPubForm] = useState<Partial<Topic>>({ allowLate: true, minLength: 0 });
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicsPage, setTopicsPage] = useState(1);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(topics.length / itemsPerPage);

  // Sync topicsPage back to valid range when totalPages changes
  useEffect(() => {
    if (totalPages > 0 && topicsPage > totalPages) {
      setTopicsPage(totalPages);
    }
  }, [topics.length, totalPages, topicsPage]);

  // Auto-select first topic on load or update
  useEffect(() => {
    if (topics.length > 0 && (!selectedTopicId || !topics.some(t => t.topicId === selectedTopicId))) {
      setSelectedTopicId(topics[0].topicId);
    }
  }, [topics]);

  // Student manage state
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const targetClass = user.class || '101';

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await callApi('getTeacherData', { classId: targetClass, userId: user.userId, role: user.role });
      setStudents(data.students || []);
      const sortedTopics = (data.topics || []).sort((a: Topic, b: Topic) => {
        const dateA = new Date(a.publishDate).getTime();
        const dateB = new Date(b.publishDate).getTime();
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setTopics(sortedTopics);
      setJournals(data.journals || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Stats Calculation ---
  const pendingFeedbackCount = journals.filter(j => !j.teacherComment).length;

  const currentPage = Math.min(topicsPage, totalPages || 1);
  const displayedTopics = topics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Grading Logic ---
  const handleGradeSubmit = async () => {
    if (!gradingJournal?.journal) return;
    setLoading(true);
    try {
      await callApi('saveGrade', {
        journalId: gradingJournal.journal.journalId,
        comment: gradeComment
      });
      await fetchData();
      setGradingJournal(null);
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!gradingJournal?.journal?.content) return;
    setLoading(true);
    try {
      // Clean HTML before sending to AI
      const plainText = gradingJournal.journal.content.replace(/<[^>]*>/g, '');
      const res = await callApi('generateAIComment', { content: plainText });
      if (res.comment) {
        setGradeComment(res.comment);
      }
    } catch(e) {
      alert('AI 產生失敗');
    } finally {
      setLoading(false);
    }
  };

  // --- Publish Logic ---
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await callApi('saveTopic', { ...pubForm, teacherId: user.userId });
      await fetchData();
      setPubForm({ allowLate: true, minLength: 0, title: '', content: '', publishDate: '', dueDate: '' });
      setIsEditingTopic(false);
      alert('發布成功');
    } catch (e) {
      alert('發布失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicEdit = (t: Topic) => {
    const pubD = new Date(t.publishDate);
    const pubDateStr = pubD.toISOString().split('T')[0];
    
    const dueD = new Date(t.dueDate);
    const dueStr = dueD.getFullYear() + '-' + 
       String(dueD.getMonth()+1).padStart(2,'0') + '-' + 
       String(dueD.getDate()).padStart(2,'0') + 'T' + 
       String(dueD.getHours()).padStart(2,'0') + ':' + 
       String(dueD.getMinutes()).padStart(2,'0');

    setPubForm({
      ...t,
      publishDate: pubDateStr,
      dueDate: dueStr,
      allowLate: t.allowLate === true || t.allowLate === 'true'
    });
    setIsEditingTopic(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportExcel = () => {
    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
    html += '<head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body>';
    html += '<table border="1"><thead><tr><th>座號</th><th>姓名</th><th>週記標題</th><th>學生週記內容</th><th>老師評語</th></tr></thead><tbody>';
    
    const sortedStudents = [...students].sort((a,b)=> Number(a.seatNumber) - Number(b.seatNumber));
    const targetTopics = selectedTopicId ? topics.filter(t => t.topicId === selectedTopicId) : topics;

    sortedStudents.forEach(s => {
        targetTopics.forEach(t => {
            const j = journals.find(x => x.studentId === s.studentId && x.topicId === t.topicId);
            const studentContent = j ? j.content.replace(/<[^>]*>/g, '') : '(未交)';
            html += `<tr>
                <td>${s.seatNumber || ''}</td>
                <td>${s.name}</td>
                <td>${t.title}</td>
                <td style="white-space:pre-wrap">${studentContent}</td>
                <td style="white-space:pre-wrap">${j ? (j.teacherComment||'') : ''}</td>
            </tr>`;
        });
    });
    html += '</tbody></table></body></html>';
    
    const blob = new Blob([html], {type: "application/vnd.ms-excel"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `週記匯出_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWord = () => {
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Export</title>
    <style>
       body { font-family: "Microsoft JhengHei", sans-serif; }
       .entry { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
       .header { border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; color: #444; }
       .meta { font-size: 0.9em; color: #666; margin-bottom: 5px; }
       .content { white-space: pre-wrap; line-height: 1.5; font-size: 14px; }
       .comment { background-color: #f9f9f9; padding: 10px; margin-top: 10px; border-left: 3px solid #3498db; }
    </style>
    </head><body>`;
    
    html += `<h1 style="text-align:center">週記彙整報告</h1><p style="text-align:center">產出日期: ${new Date().toLocaleDateString()}</p>`;
    
    const sortedStudents = [...students].sort((a,b)=> Number(a.seatNumber) - Number(b.seatNumber));
    const targetTopics = selectedTopicId ? topics.filter(t => t.topicId === selectedTopicId) : topics;

    sortedStudents.forEach(s => {
       html += `<h2 style="background:#eee; padding:5px;">${s.seatNumber} - ${s.name}</h2>`;
       targetTopics.forEach(t => {
           const j = journals.find(x => x.studentId === s.studentId && x.topicId === t.topicId);
           if (!j) return;
           
           html += `<div class="entry">
               <div class="header"><strong>${t.title}</strong></div>
               <div class="meta"><strong>題目說明:</strong> ${t.content}</div>
               <hr/>
               <div class="content"><strong>學生內容:</strong><br/>${j.content}</div>
               ${j.teacherComment ? `<div class="comment"><strong>老師評語:</strong><br/>${j.teacherComment}</div>` : ''}
           </div>`;
       });
       html += "<br style='page-break-after:always;' />";
    });
    html += "</body></html>";
    
    const blob = new Blob([html], {type: "application/msword"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `週記彙整_${new Date().toISOString().slice(0,10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Student Logic ---
  const handleStudentSave = async () => {
    setLoading(true);
    try {
      await callApi('manageStudent', {
        subAction: editingStudent?.studentId ? 'update' : 'create',
        payload: { ...editingStudent, class: targetClass, teacherId: user.userId }
      });
      await fetchData();
      setEditingStudent(null);
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          {user.role === 'admin' && onNavigateToAdmin && (
            <button onClick={onNavigateToAdmin} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <PenTool className="h-7 w-7 text-emerald-600" />
              教師教學介面
            </h1>
            <p className="text-slate-500 mt-1">管理班級週記與學生學習狀況</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 font-medium shadow-sm">
          <Users className="h-5 w-5" />
          負責班級：{targetClass}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">班級學生數</p>
            <p className="text-2xl font-bold text-slate-800">{students.length} <span className="text-sm font-normal text-slate-400">人</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">已發布題目</p>
            <p className="text-2xl font-bold text-slate-800">{topics.length} <span className="text-sm font-normal text-slate-400">篇</span></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">待回饋週記</p>
            <p className="text-2xl font-bold text-slate-800">{pendingFeedbackCount} <span className="text-sm font-normal text-slate-400">份</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('grade')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'grade' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" /> 批改週記
        </button>
        <button
          onClick={() => setActiveTab('publish')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'publish' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Megaphone className="h-4 w-4" /> 發布題目
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'students' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Users className="h-4 w-4" /> 學生管理
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Grade Tab */}
        {activeTab === 'grade' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-2">選擇週記題目查看繳交狀況</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 font-medium"
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                  >
                    <option value="">-- 請選擇週次 --</option>
                    {topics.map(t => <option key={t.topicId} value={t.topicId}>{t.title}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                  <Download className="h-4 w-4" /> 匯出 Excel
                </button>
                <button onClick={handleExportWord} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-medium transition-colors">
                  <Download className="h-4 w-4" /> 匯出 Word
                </button>
              </div>
            </div>

            {selectedTopicId ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">座號</th>
                      <th className="px-6 py-4 font-medium">姓名</th>
                      <th className="px-6 py-4 font-medium">狀態</th>
                      <th className="px-6 py-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...students].sort((a,b)=> Number(a.seatNumber) - Number(b.seatNumber)).map(s => {
                      const j = journals.find(x => x.studentId === s.studentId && x.topicId === selectedTopicId);
                      return (
                        <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">{s.seatNumber}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                          <td className="px-6 py-4">
                            {j ? (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                j.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {j.status === 'late' ? '遲交' : '已交'}
                                {j.teacherComment && <CheckCircle2 className="h-3 w-3 ml-1 opacity-70" />}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">未交</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {j && (
                              <button 
                                onClick={() => {
                                  setGradingJournal({ student: s, journal: j });
                                  setGradeComment(j.teacherComment || '');
                                }}
                                className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-medium transition-colors"
                              >
                                <PenTool className="h-4 w-4" /> 批改
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">請先從上方選擇要批改的週記題目</p>
              </div>
            )}
          </div>
        )}

        {/* Publish Tab */}
        {activeTab === 'publish' && (
          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Form */}
            <div className="lg:w-1/3 p-6 bg-slate-50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-emerald-600" />
                  {isEditingTopic ? '編輯題目' : '發布新題目'}
                </h3>
                {isEditingTopic && (
                  <button onClick={() => {setIsEditingTopic(false); setPubForm({allowLate:true, minLength:0});}} className="text-xs text-slate-500 hover:text-slate-700 underline bg-white px-2 py-1 rounded-md border border-slate-200">
                    取消編輯
                  </button>
                )}
              </div>
              <form onSubmit={handlePublishSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">週記標題</label>
                  <input required type="text" value={pubForm.title || ''} onChange={e=>setPubForm({...pubForm, title: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="第一週 - 自我介紹" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">引導內容</label>
                  <textarea required rows={5} value={pubForm.content || ''} onChange={e=>setPubForm({...pubForm, content: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" placeholder="請輸入說明..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">最少字數限制</label>
                  <input type="number" min="0" value={pubForm.minLength || ''} onChange={e=>setPubForm({...pubForm, minLength: parseInt(e.target.value) || 0})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">發布日期</label>
                    <input required type="date" value={pubForm.publishDate || ''} onChange={e=>setPubForm({...pubForm, publishDate: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">截止時間</label>
                    <input required type="datetime-local" value={pubForm.dueDate || ''} onChange={e=>setPubForm({...pubForm, dueDate: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={!!pubForm.allowLate} onChange={e=>setPubForm({...pubForm, allowLate: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">允許過期補交 (將標記為遲交)</span>
                </label>
                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm">
                  {isEditingTopic ? '儲存變更' : '確認發布'}
                </button>
              </form>
            </div>
            {/* List */}
            <div className="lg:w-2/3 p-6">
              <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                已發布列表
              </h3>
              <div className="space-y-4">
                {displayedTopics.map(t => (
                  <div key={t.topicId} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm bg-white transition-all group">
                    <div className="flex-1 cursor-pointer" onClick={() => handleTopicEdit(t)}>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-slate-800 text-lg">{t.title}</h4>
                        {!t.allowLate && <span className="text-[10px] uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">不許補交</span>}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">{t.content}</p>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 inline-flex px-2.5 py-1 rounded-lg">
                        <Clock className="h-3.5 w-3.5" />
                        截止: {new Date(t.dueDate).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleTopicEdit(t)} className="w-full px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">編輯</button>
                      <button onClick={() => setTopicToDelete(t)} className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors">刪除</button>
                    </div>
                  </div>
                ))}
                {topics.length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-slate-500">尚無發布題目</p>
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-6 mt-6">
                  <span className="text-sm text-slate-500">
                    顯示第 {((currentPage - 1) * itemsPerPage) + 1} 至 {Math.min(currentPage * itemsPerPage, topics.length)} 筆題目，共 {topics.length} 筆
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setTopicsPage(currentPage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium transition-colors"
                    >
                      上一頁
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setTopicsPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setTopicsPage(currentPage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium transition-colors"
                    >
                      下一頁
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">班級學生名單</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowImportModal(true)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                  批次匯入
                </button>
                <button onClick={() => setEditingStudent({ password: '1234' })} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                  <Plus className="h-4 w-4" /> 新增學生
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium">座號</th>
                    <th className="px-6 py-4 font-medium">學號 (帳號)</th>
                    <th className="px-6 py-4 font-medium">姓名</th>
                    <th className="px-6 py-4 font-medium">預設密碼</th>
                    <th className="px-6 py-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...students].sort((a,b)=> Number(a.seatNumber) - Number(b.seatNumber)).map(s => (
                    <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">{s.seatNumber}</td>
                      <td className="px-6 py-4 font-medium">{s.account}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-400 bg-slate-50/50">{s.password}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setEditingStudent(s)} className="px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg font-medium text-sm transition-colors">編輯</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Grade Modal */}
      <Modal
        isOpen={!!gradingJournal}
        onClose={() => setGradingJournal(null)}
        title={
          <div className="flex items-center justify-between w-full pr-8">
            <span className="flex items-center gap-2"><PenTool className="h-5 w-5 text-emerald-600" /> 批改週記</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">座號 {gradingJournal?.student.seatNumber}</span>
              <span className="text-base font-bold text-slate-800">{gradingJournal?.student.name}</span>
            </div>
          </div>
        }
        size="lg"
        footer={
          <>
            <button onClick={() => setGradingJournal(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">取消</button>
            <button onClick={handleGradeSubmit} className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-sm font-medium transition-colors">儲存評語與成績</button>
          </>
        }
      >
        {gradingJournal?.journal && (
          <div className="space-y-6 pt-2 pb-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[250px] max-h-[45vh] overflow-y-auto">
              <div 
                className="prose prose-sm sm:prose max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: gradingJournal.journal.content }}
              />
            </div>
            
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 space-y-5 shadow-sm">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-bold text-emerald-900 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> 老師評語
                  </label>
                  <button onClick={handleGenerateAI} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 px-4 py-2 rounded-full transition-colors border border-blue-200 shadow-sm">
                    <Bot className="h-4 w-4" /> AI 建議評語
                  </button>
                </div>
                <textarea 
                  rows={4}
                  value={gradeComment}
                  onChange={e => setGradeComment(e.target.value)}
                  placeholder="給學生的回饋與鼓勵..."
                  className="w-full rounded-xl border border-emerald-200 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all text-slate-800"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Student Form Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title={editingStudent?.studentId ? '編輯學生資料' : '新增學生'}
        footer={
          <>
            <button onClick={() => setEditingStudent(null)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">取消</button>
            <button onClick={handleStudentSave} className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-sm font-medium">儲存</button>
          </>
        }
      >
        {editingStudent && (
          <div className="space-y-4 pt-2 pb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">學號 (作為登入帳號)</label>
              <input type="text" value={editingStudent.account || ''} onChange={e=>setEditingStudent({...editingStudent, account: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
              <input type="text" value={editingStudent.name || ''} onChange={e=>setEditingStudent({...editingStudent, name: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">座號</label>
                <input type="number" value={editingStudent.seatNumber || ''} onChange={e=>setEditingStudent({...editingStudent, seatNumber: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">登入密碼</label>
                <input type="text" value={editingStudent.password || ''} onChange={e=>setEditingStudent({...editingStudent, password: e.target.value})} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="批次匯入學生"
        footer={
          <>
            <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">取消</button>
            <button 
              onClick={async () => {
                const lines = importText.trim().split('\n');
                let count = 0;
                setLoading(true);
                try {
                  for(const line of lines) {
                    const parts = line.split(',');
                    if(parts.length >= 2) {
                      await callApi('manageStudent', {
                        subAction: 'create',
                        payload: { account: parts[0].trim(), name: parts[1].trim(), seatNumber: parts[2]?parts[2].trim():'', password: parts[3]?parts[3].trim():'1234', class: targetClass, teacherId: user.userId }
                      });
                      count++;
                    }
                  }
                  setShowImportModal(false);
                  alert(`成功匯入 ${count} 筆`);
                  fetchData();
                } catch(e) { alert('匯入中斷發生錯誤'); } finally { setLoading(false); }
              }} 
              className="px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl shadow-sm font-medium"
            >開始匯入</button>
          </>
        }
      >
        <div className="space-y-4 pt-2 pb-4">
          <div className="text-sm text-slate-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
            請貼上 CSV 內容，每行一筆，格式為：<br/>
            <code className="font-mono text-xs bg-white px-2 py-1 rounded border border-blue-200 mt-2 inline-block font-bold text-slate-800">學號,姓名,座號,預設密碼</code>
          </div>
          <textarea rows={10} value={importText} onChange={e=>setImportText(e.target.value)} placeholder="11201,陳小明,01,1234&#10;11202,王美美,02,1234" className="w-full rounded-xl border border-slate-300 p-4 font-mono text-sm leading-relaxed focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
        </div>
      </Modal>

      {/* Delete Topic Confirmation Modal */}
      <Modal
        isOpen={!!topicToDelete}
        onClose={() => setTopicToDelete(null)}
        title="確定要刪除此題目嗎？"
        footer={
          <>
            <button
              onClick={() => setTopicToDelete(null)}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={async () => {
                if (!topicToDelete) return;
                setLoading(true);
                try {
                  await callApi('deleteTopic', { topicId: topicToDelete.topicId });
                  setTopicToDelete(null);
                  await fetchData();
                } catch (e) {
                  console.error(e);
                  alert('刪除失敗');
                } finally {
                  setLoading(false);
                }
              }}
              className="px-6 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-sm font-medium transition-colors"
            >
              確定刪除
            </button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-slate-600 leading-relaxed">
            刪除後此題目的學生週記內容與評語將會一併被刪除，且無法還原。<br />
            您確定要刪除「<span className="font-semibold text-slate-900">{topicToDelete?.title}</span>」嗎？
          </p>
        </div>
      </Modal>
    </div>
  );
}
