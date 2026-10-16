const paths = {
  'Launch centre': ['M9 3h6v3H9z','M7 5H4v16h16V5h-3','m8 13 3 3 5-6'],
  Support: ['M4 13v-2a8 8 0 0 1 16 0v2','M4 11H2v7h4v-7z','M20 11h2v7h-4v-7z','M18 18v3h-6'],
  Overview: ['M3 3h7v7H3z','M14 3h7v7h-7z','M3 14h7v7H3z','M14 14h7v7h-7z'],
  Students: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M17 4a4 4 0 0 1 0 8','M22 21v-2a4 4 0 0 0-3-3.87'],
  Trainers: ['m2 8 10-5 10 5-10 5z','M6 10v7q6 4 12 0v-7','M22 8v7'],
  Courses: ['M12 5v16','M12 5Q7 2 3 4v15q4-2 9 2','M12 5q5-3 9-1v15q-4-2-9 2'],
  Curriculum: ['M4 4h6v6H4z','M14 14h6v6h-6z','M7 10v7h7','M14 4h6','M14 8h6'],
  'Quiz builder': ['M4 3h12v18H4z','m14 15 6-6 2 2-6 6-3 1z','M8 7h4','M8 11h3'],
  Enrolments: ['M3 4h18v16H3z','M3 9h18','m7 14 2 2 4-4','M16 14h2'],
  Certificates: ['M5 3h14v12H5z','M8 7h8','M9 11h6','m8 15-1 7 5-3 5 3-1-7'],
  'Activity history': ['M3 11a9 9 0 1 1 3 8','M3 4v7h7','M12 7v5l3 2'],
  Batches: ['M3 4h7v6H3z','M14 4h7v6h-7z','M3 14h7v6H3z','M14 14h7v6h-7z'],
  'Live classes': ['M3 5h12v14H3z','m15 10 6-4v12l-6-4z'],
  Assignments: ['M9 4H5v17h14V4h-4','M9 2h6v4H9z','m8 13 3 3 5-6'],
  Submissions: ['M4 3h12l4 4v14H4z','M14 3v5h6','m8 15 3 3 5-6'],
  Announcements: ['m3 10 14-6v16L3 14z','M3 10v4','m6 15 2 6h3l-2-5','M21 8v8'],
  Attendance: ['M4 5h16v16H4z','M8 3v4','M16 3v4','M4 10h16','m8 15 3 3 5-5'],
  Payments: ['M3 5h18v14H3z','M3 10h18','M7 15h3'],
  Reports: ['M4 3v18h17','M8 16v-5','M13 16V7','M18 16V4'],
  Settings: ['M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z'],
  'Content library': ['M3 5h6l2 2h10v14H3z','M7 3h12v4'],
  Quizzes: ['M5 3h14v18H5z','M9 8h6','M9 12h6','M9 16h3'],
  Profile: ['M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2'],
}

export default function SidebarIcon({ name }) {
  const key = name === 'My courses' || name === 'Explore courses' ? 'Courses' : name === 'My progress' ? 'Reports' : name === 'My learners' ? 'Students' : name === 'My batches' ? 'Batches' : name
  return (
    <svg className="dw-sidebar-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(paths[key] || paths.Courses).map((d,i) => <path key={i} d={d} />)}
      {key === 'Students' && <circle cx="9" cy="7" r="4" />}
      {key === 'Profile' && <circle cx="12" cy="6" r="4" />}
      {key === 'Settings' && <circle cx="12" cy="12" r="3" />}
    </svg>
  )
}
