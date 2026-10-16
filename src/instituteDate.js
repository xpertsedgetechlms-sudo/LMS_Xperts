export function instituteDate(value=new Date()) {
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return ''
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const get = type => parts.find(p=>p.type===type).value
  return `${get('year')}-${get('month')}-${get('day')}`
}
export const instituteToday=()=>instituteDate()
