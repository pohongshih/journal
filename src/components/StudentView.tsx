import React, { useState, useEffect } from 'react';
import { User, Topic, Journal } from '../types';
import { callApi } from '../lib/api';
import { BookOpen, Send, Clock, CheckCircle2, AlertCircle, Sparkles, Edit2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { RichEditor } from './ui/RichEditor';

interface StudentViewProps {
  user: User;
  setLoading: (loading: boolean) => void;
}

export default function StudentView({ user, setLoading }: StudentViewProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [journals, setJournals] = useState<Journal[]>([]);
  
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [journalContent, setJournalContent] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [originalContent, setOriginalContent] = useState('');

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const data = await callApi('getStudentData', { userId: user.userId });
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
    fetchStudentData();
  }, []);

  const openWriteModal = (topic: Topic) => {
    const existingJ = journals.find(j => j.topicId === topic.topicId);
    const initial = existingJ ? existingJ.content : '';
    setJournalContent(initial);
    setOriginalContent(initial);
    setCharCount(initial.replace(/<[^>]*>/g, '').replace(/\s/g, '').length);
    setActiveTopic(topic);
  };

  const handleCloseClick = () => {
    const isActuallyEmpty = (content: string) => !content || content.replace(/<[^>]*>/g, '').trim() === '';
    
    const wasEmpty = isActuallyEmpty(originalContent);
    const isEmpty = isActuallyEmpty(journalContent);
    let isDirty = false;
    
    if (wasEmpty && isEmpty) {
      isDirty = false;
    } else if (wasEmpty && !isEmpty) {
      isDirty = true;
    } else if (!wasEmpty && isEmpty) {
      isDirty = true;
    } else {
      isDirty = journalContent !== originalContent;
    }
    
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      setActiveTopic(null);
    }
  };

  const submitJournal = async () => {
    if (!activeTopic) return;
    
    if (charCount < (activeTopic.minLength || 0)) {
      alert(`尚未達到最少字數要求 (${activeTopic.minLength} 字)`);
      return;
    }

    const existingJ = journals.find(j => j.topicId === activeTopic.topicId);
    const now = new Date();
    const due = new Date(activeTopic.dueDate);
    const isLate = now > due;

    const finalStatus = existingJ ? existingJ.status : (isLate ? 'late' : 'submitted');

    setLoading(true);
    try {
      await callApi('submitJournal', {
        topicId: activeTopic.topicId,
        studentId: user.userId,
        content: journalContent,
        status: finalStatus
      });
      await fetchStudentData();
      setActiveTopic(null);
    } catch (e) {
      console.error(e);
      alert('提交失敗');
    } finally {
      setLoading(false);
    }
  };

  const isEnough = activeTopic ? charCount >= (activeTopic.minLength || 0) : true;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-sky-500" />
            我的週記本
          </h1>
          <p className="text-slate-500 mt-1">紀錄你的學習與成長</p>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          學號：{user.account}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {topics.map(t => {
          const j = journals.find(x => x.topicId === t.topicId);
          const now = new Date();
          const due = new Date(t.dueDate);
          const isLate = now > due;
          
          let statusColor = "bg-slate-100 text-slate-600";
          let statusText = "未寫";
          let statusIcon = <Clock className="h-4 w-4 mr-1" />;
          let canWrite = true;
          let btnText = "撰寫週記";
          
          if (j) {
            statusColor = j.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
            statusText = j.status === 'late' ? '遲交' : '已交';
            statusIcon = <CheckCircle2 className="h-4 w-4 mr-1" />;
            btnText = "修改週記";
          } else if (isLate && !t.allowLate) {
            statusColor = "bg-red-100 text-red-800";
            statusText = "已截止";
            statusIcon = <AlertCircle className="h-4 w-4 mr-1" />;
            canWrite = false;
            btnText = "無法作答";
          } else if (isLate && t.allowLate) {
            statusColor = "bg-orange-100 text-orange-800";
            statusText = "補交中";
          }

          return (
            <div key={t.topicId} className={`flex flex-col h-full rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
              j ? 'border-emerald-200' : (isLate && !t.allowLate ? 'border-red-200 opacity-75' : 'border-slate-200')
            }`}>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-medium text-slate-400">{new Date(t.publishDate).toLocaleDateString()}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
                    {statusIcon}
                    {statusText}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-1">{t.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{t.content}</p>
                
                <div className="flex items-center text-xs text-slate-500 mb-4">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  截止：{new Date(t.dueDate).toLocaleString()}
                </div>
                
                {j?.teacherComment && (
                  <div className="rounded-xl bg-blue-50/50 p-4 text-sm border border-blue-100 mb-2 flex-1 flex flex-col">
                    <div className="font-semibold text-blue-800 flex items-center gap-1.5 mb-2 shrink-0">
                      <Sparkles className="h-4 w-4" /> 老師評語
                    </div>
                    <p className="text-blue-900 leading-relaxed overflow-y-auto">{j.teacherComment}</p>
                  </div>
                )}
              </div>
              
              <div className="p-5 pt-0 mt-auto">
                <button
                  onClick={() => openWriteModal(t)}
                  disabled={!canWrite}
                  className={`w-full rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 transition-colors ${
                    !canWrite 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : j 
                        ? 'bg-white border-2 border-sky-500 text-sky-600 hover:bg-sky-50' 
                        : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                  }`}
                >
                  {j ? <Edit2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {btnText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!activeTopic}
        onClose={handleCloseClick}
        title={<div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-sky-500" /> {activeTopic?.title}</div>}
        size="full"
        footer={
          <>
            <button onClick={handleCloseClick} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">
              取消
            </button>
            <button 
              onClick={submitJournal}
              disabled={!isEnough}
              className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                isEnough 
                  ? 'bg-sky-500 text-white hover:bg-sky-600 hover:shadow-md' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="h-4 w-4" /> 提交週記
            </button>
          </>
        }
      >
        {activeTopic && (
          <div className="pt-2 pb-4 h-full flex flex-col gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 shrink-0">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-sky-500" /> 題目說明
              </h4>
              <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{activeTopic.content}</p>
              {activeTopic.minLength > 0 && (
                <div className="mt-3 text-xs font-medium text-slate-500 bg-white inline-block px-2 py-1 rounded border border-slate-200">
                  字數要求：至少 {activeTopic.minLength} 字
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-end mb-2 shrink-0">
                <label className="block text-sm font-semibold text-slate-700">內容撰寫區</label>
                <span className={`text-xs font-medium ${isEnough ? 'text-slate-500' : 'text-red-500'}`}>
                  目前字數：{charCount} {activeTopic.minLength > 0 ? `/ ${activeTopic.minLength}` : ''}
                </span>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <RichEditor 
                  initialContent={journalContent} 
                  onChange={(html) => setJournalContent(html)}
                  onTextChange={(text) => setCharCount(text.replace(/\s/g, '').length)}
                />
              </div>
              
              {!isEnough && charCount > 0 && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1 shrink-0">
                  <AlertCircle className="h-4 w-4" /> 尚未達到最少字數要求
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        title={<div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /> 確定要關閉嗎？</div>}
        size="sm"
        zIndex={50}
        footer={
          <>
            <button onClick={() => setShowConfirmClose(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">
              繼續編輯
            </button>
            <button 
              onClick={() => {
                setShowConfirmClose(false);
                setActiveTopic(null);
              }}
              className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-xl font-medium transition-colors"
            >
              確定放棄
            </button>
          </>
        }
      >
        <p className="text-slate-600 pb-2">
          您有尚未儲存的內容，確定要放棄這些變更並關閉視窗嗎？
        </p>
      </Modal>
    </div>
  );
}
