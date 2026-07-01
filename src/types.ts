export interface User {
  userId: string;
  account: string;
  password?: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  class?: string;
  status: 'active' | 'suspended' | 'pending';
}

export interface Student extends User {
  studentId: string;
  seatNumber: string;
  teacherId: string;
}

export interface Topic {
  topicId: string;
  title: string;
  content: string;
  publishDate: string;
  dueDate: string;
  allowLate: boolean | string;
  teacherId: string;
  createdAt: string;
  minLength: number;
}

export interface Journal {
  journalId: string;
  topicId: string;
  studentId: string;
  content: string;
  submitTime: string;
  status: 'submitted' | 'late';
  score?: number;
  teacherComment?: string;
}

export interface TeacherData {
  students: Student[];
  topics: Topic[];
  journals: Journal[];
}

export interface StudentData {
  user: Student;
  topics: Topic[];
  journals: Journal[];
}
