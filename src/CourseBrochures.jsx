import { brochuresForCourse } from './brochureData'
import './CourseBrochures.css'

function DownloadIcon(){return <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>}

export default function CourseBrochures({courseId,compact=false}){
  const brochures=brochuresForCourse(courseId)
  if(!brochures.length)return null
  return <section className={`course-brochures ${compact?'is-compact':''}`} aria-label="Course brochures">{!compact&&<div className="brochure-heading"><span className="ad-kicker">PLAN YOUR LEARNING</span><h3>Course {brochures.length===1?'brochure':'brochures'}</h3><p>Explore the curriculum, tools and programme details.</p></div>}<div className="brochure-list">{brochures.map(b=><article className="brochure-item" key={b.file}><div className="brochure-file-icon" aria-hidden="true">PDF</div><div className="brochure-description"><strong>{b.title}</strong><small>PDF · {b.pages} pages · {b.size}</small></div><div className="brochure-actions">{!compact&&<a href={`/brochures/${b.file}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${b.title} brochure (opens new tab)`}>View ↗</a>}<a className="brochure-download" href={`/brochures/${b.file}`} download={b.file} aria-label={`Download ${b.title} brochure`}><DownloadIcon/><span>{compact?'Brochure':'Download PDF'}</span></a></div></article>)}</div></section>
}
