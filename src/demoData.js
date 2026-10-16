import { courseFees } from './instituteContent.js'
export const initialCourses = [
  { id: 'dev', name: 'Software Development', trainer: 'Arun Kumar', category: 'Development', price: courseFees.dev, published: true, description: 'Build practical programming skills, from fundamentals to your first application.' },
  { id: 'test', name: 'Software Testing', trainer: 'Priya S', category: 'Quality engineering', price: courseFees.test, published: true, description: 'Explore test cases, bug reporting, manual testing and automation foundations.' },
  { id: 'aws', name: 'AWS & DevOps', trainer: 'Rahul M', category: 'Cloud computing', price: courseFees.aws, published: true, description: 'Learn cloud fundamentals, deployment practices and CI/CD workflows.' },
  { id: 'data', name: 'Data Science', trainer: 'Divya R', category: 'Data & analytics', price: courseFees.data, published: true, description: 'Explore data preparation, analysis, visualisation and machine learning basics.' },
  { id: 'scrum', name: 'Scrum', trainer: 'Karthik S', category: 'Agile delivery', price: courseFees.scrum, published: true, description: 'Understand Scrum events, roles, artefacts and collaborative delivery.' },
  { id: 'ai', name: 'GenAI', trainer: 'Meera N', category: 'Artificial intelligence', price: courseFees.ai, published: true, description: 'Explore prompting, language models and responsible AI application design.' },
]
export const initialPeople = [
  { id: 's1', name: 'Aarav Kumar', email: 'aarav@example.com', role: 'Student', status: 'Active', course: 'Software Development' },
  { id: 's2', name: 'Diya Sharma', email: 'diya@example.com', role: 'Student', status: 'Active', course: 'AWS & DevOps' },
  { id: 's3', name: 'Mohammed Ali', email: 'ali@example.com', role: 'Student', status: 'Pending', course: 'Software Testing' },
  { id: 's4', name: 'Ananya Rao', email: 'ananya@example.com', role: 'Student', status: 'Active', course: 'Data Science' },
  ...initialCourses.map((c, i) => ({ id: `t${i}`, name: c.trainer, email: `trainer${i + 1}@example.com`, role: 'Trainer', status: 'Active', course: c.name })),
]
export const initialTasks = [
  { id: 'a1', title: 'Build your first web page', course: 'dev', due: '2026-10-20', description: 'Create a semantic HTML page with a heading, a navigation section and an accessible contact form.' },
  { id: 'a2', title: 'Write a test plan', course: 'test', due: '2026-10-22', description: 'Write five test cases for an email and password login form. Include expected results.' },
]
export const initialSessions = [
  { id: 'l1', title: 'HTML foundations', course: 'dev', date: '2026-10-20', time: '18:00', trainer: 'Arun Kumar' },
  { id: 'l2', title: 'Testing fundamentals', course: 'test', date: '2026-10-22', time: '18:30', trainer: 'Priya S' },
]
export const lessons = [
  { title: 'Welcome & learning roadmap', body: 'Start with the fundamentals, practise each topic and use assignments to apply what you learn. This sample lesson previews the LMS reading experience.' },
  { title: 'Core concepts', body: 'Break a problem into smaller steps. Describe the inputs, the expected output and how you will verify the result. Keep your solution understandable and test it with a small example.' },
  { title: 'Practice & reflection', body: 'Choose a small project. Define one measurable goal, build the simplest version and review what worked. Write down one improvement before starting the next iteration.' },
]
export const questions = [
  { text: 'Which HTML element represents the main content of a page?', options: ['main', 'footer', 'nav'], answer: 0 },
  { text: 'Which attribute provides a text alternative for an image?', options: ['href', 'alt', 'src'], answer: 1 },
  { text: 'Which action helps verify that a feature works?', options: ['Hide errors', 'Skip review', 'Test expected behaviour'], answer: 2 },
]
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
