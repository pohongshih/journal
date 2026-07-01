import { User, TeacherData, StudentData } from '../types';
import { mockData } from './mockData';

const API_URL = import.meta.env.VITE_GAS_API_URL || '';

// Mock delay to simulate network
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function callApi(action: string, data: any = {}): Promise<any> {
  if (!API_URL) {
    console.log(`[Mock API] Action: ${action}`, data);
    await delay(600); // Simulate network latency
    return executeMockApi(action, data);
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, data }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight
      }
    });
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ----------------------------------------------------
// Mock Implementation (used when API_URL is not set)
// ----------------------------------------------------
function executeMockApi(action: string, data: any) {
  switch (action) {
    case 'login':
      const user = mockData.users.find(u => u.account === data.account && u.password === data.password);
      if (user) return { ...user, status: 'success' };
      const student = mockData.students.find(s => s.account === data.account && s.password === data.password);
      if (student) return { ...student, status: 'success', role: 'student', userId: student.studentId };
      return { status: 'error', message: '帳號或密碼錯誤' };
      
    case 'getAdminData':
      return mockData.users.filter(u => u.role === 'teacher');
      
    case 'adminAction':
      const userIdx = mockData.users.findIndex(u => u.userId === data.userId);
      if (userIdx !== -1) {
        if (data.subAction === 'activate') mockData.users[userIdx].status = 'active';
        if (data.subAction === 'suspend') mockData.users[userIdx].status = 'suspended';
        if (data.subAction === 'delete') mockData.users.splice(userIdx, 1);
        if (data.subAction === 'update') {
          mockData.users[userIdx] = { ...mockData.users[userIdx], ...data.payload };
        }
      }
      return { status: 'success' };
      
    case 'getTeacherData':
      const students = mockData.students.filter(s => String(s.class) === String(data.classId));
      const topics = mockData.topics;
      const journals = mockData.journals;
      return { students, topics, journals };

    case 'saveTopic':
      if (data.topicId) {
        const idx = mockData.topics.findIndex(t => t.topicId === data.topicId);
        if (idx !== -1) mockData.topics[idx] = { ...mockData.topics[idx], ...data };
      } else {
        mockData.topics.push({ ...data, topicId: 'TP' + Date.now(), createdAt: new Date().toISOString() });
      }
      return { status: 'success' };

    case 'deleteTopic':
      mockData.topics = mockData.topics.filter(t => t.topicId !== data.topicId);
      return { status: 'success' };

    case 'saveGrade':
      const jIdx = mockData.journals.findIndex(j => j.journalId === data.journalId);
      if (jIdx !== -1) {
        mockData.journals[jIdx].score = data.score;
        mockData.journals[jIdx].teacherComment = data.comment;
      }
      return { status: 'success' };

    case 'manageStudent':
      if (data.subAction === 'update' && data.payload.studentId) {
        const idx = mockData.students.findIndex(s => s.studentId === data.payload.studentId);
        if (idx !== -1) mockData.students[idx] = { ...mockData.students[idx], ...data.payload };
      } else if (data.subAction === 'create') {
        mockData.students.push({ ...data.payload, studentId: 'S' + Date.now(), status: 'active' });
      }
      return { status: 'success' };

    case 'getStudentData':
      const sUser = mockData.students.find(s => s.studentId === data.userId);
      const sJournals = mockData.journals.filter(j => j.studentId === data.userId);
      return { user: sUser, topics: mockData.topics, journals: sJournals };

    case 'submitJournal':
      const existIdx = mockData.journals.findIndex(j => j.topicId === data.topicId && j.studentId === data.studentId);
      if (existIdx !== -1) {
        mockData.journals[existIdx] = { ...mockData.journals[existIdx], content: data.content, status: data.status, submitTime: new Date().toISOString() };
      } else {
        mockData.journals.push({
          ...data,
          journalId: 'J' + Date.now(),
          submitTime: new Date().toISOString()
        });
      }
      return { status: 'success' };

    case 'generateAIComment':
      return { status: 'success', comment: '這是一段由AI模擬產生的鼓勵評語，寫得很好，請繼續保持！' };

    default:
      return { status: 'error', message: 'Unknown action' };
  }
}
