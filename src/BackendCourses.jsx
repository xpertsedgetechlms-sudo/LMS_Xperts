import { useEffect, useState } from 'react'
import { CourseCover } from './LearningPulse'
import CourseBrochures from './CourseBrochures'
import './BackendCourses.css'
import { brochuresForCourse } from './brochureData'

export default function BackendCourses({ onView }) {
  const [search, setSearch] = useState('')
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCourses() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/courses', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load courses. Please try again.')
        }

        const data = await response.json()

        if (!Array.isArray(data)) {
          throw new Error('Unexpected course response.')
        }

        setCourses(data.filter(course => brochuresForCourse(course.id).length > 0))
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadCourses()
    return () => controller.abort()
  }, [attempt])

  return (
    <section className="course-catalogue" aria-label="Available courses">

      {loading ? (
        <p role="status">Loading courses…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setAttempt(value => value + 1)}>
            Try again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <p>Courses will be available soon.</p>
      ) : (
        <>
        <div className="catalogue-toolbar">
          <label className="catalogue-search">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>
            <input aria-label="Search courses" placeholder="Search courses or categories" value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <span className="catalogue-count" role="status">{courses.filter(course => `${course.name} ${course.category}`.toLowerCase().includes(search.toLowerCase())).length} courses available</span>
        </div>
        <div className="ad-course-grid catalogue-grid">
          {courses.filter(course => `${course.name} ${course.category}`.toLowerCase().includes(search.toLowerCase())).map(course => (
            <article className="catalogue-card" key={course.id}>
              <CourseCover course={course} index={courses.findIndex(item => item.id === course.id)} />
              <div className="catalogue-card-content">
              <p className="catalogue-category">{course.category}</p>
              <h3 className="catalogue-title">{course.name}</h3>
              <p className="catalogue-description">{course.description}</p>
              <strong className="catalogue-price">
                {course.price == null
                  ? 'Contact us for fees'
                  : new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(course.price)}
              </strong>
              <div className="catalogue-actions"><button className="ad-text-button" onClick={() => onView?.(course)}>View course →</button></div>
              </div>
              <footer className="catalogue-card-footer"><CourseBrochures courseId={course.id} compact /></footer>
            </article>
          ))}
        </div>
        {!courses.some(course => `${course.name} ${course.category}`.toLowerCase().includes(search.toLowerCase())) && <p role="status">No courses match your search.</p>}
        </>
      )}
    </section>
  )
}