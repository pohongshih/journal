export const mockData = {
  users: [
    { account: 'admin', password: 'password', role: 'admin', name: '管理員', userId: 'ADMIN', status: 'active' },
    { account: 'teacher1', password: 'password', role: 'teacher', name: '王老師', userId: 'T1', class: '101', status: 'active' }
  ],
  students: [
    { studentId: 'S1', account: '11201', password: 'password', name: '陳小明', class: '101', seatNumber: '1', status: 'active', teacherId: 'T1' },
    { studentId: 'S2', account: '11202', password: 'password', name: '李大華', class: '101', seatNumber: '2', status: 'active', teacherId: 'T1' },
    { studentId: 'S3', account: '11203', password: 'password', name: '林美美', class: '101', seatNumber: '3', status: 'active', teacherId: 'T1' }
  ],
  topics: [
    {
      topicId: 'TP1',
      title: '第一週 - 自我介紹',
      content: '請介紹一下你自己，你的興趣是什麼？對高中生活有什麼期待？',
      publishDate: '2023-09-01',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      allowLate: true,
      teacherId: 'T1',
      createdAt: '2023-09-01T00:00:00Z',
      minLength: 300
    },
    {
      topicId: 'TP2',
      title: '第二週 - 學習心得',
      content: '這週學到了什麼？有哪些困難？',
      publishDate: '2023-09-08',
      dueDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago (overdue)
      allowLate: true,
      teacherId: 'T1',
      createdAt: '2023-09-08T00:00:00Z',
      minLength: 200
    }
  ],
  journals: [
    {
      journalId: 'J1',
      topicId: 'TP1',
      studentId: 'S1',
      content: '大家好，我是陳小明。我喜歡打籃球和看書。對高中生活充滿期待，希望能交到很多好朋友，並且在學業上也有所進步。我的目標是考上一所理想的大學，未來的路還很長，但我會努力的！我平常喜歡閱讀科幻小說，對於宇宙的奧秘很感興趣。',
      submitTime: '2023-09-02T10:00:00Z',
      status: 'submitted',
      score: 95,
      teacherComment: '寫得很好！期待你在高中的表現。'
    }
  ]
};
