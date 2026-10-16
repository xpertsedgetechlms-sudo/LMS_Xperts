export const courseBrochures={
  dev:[{title:'Java Full Stack Development',file:'xpertsedge-fullstack.pdf',pages:16,size:'3.7 MB'}],
  test:[{title:'Java & Selenium Automation',file:'xpertsedge-selenium.pdf',pages:16,size:'2 MB'},{title:'TypeScript & Playwright Automation',file:'xpertsedge-playwright.pdf',pages:10,size:'534 KB'}],
  aws:[{title:'AWS & DevOps Professional Program',file:'xpertsedge-devops.pdf',pages:10,size:'482 KB'}],
  ai:[{title:'Generative Artificial Intelligence',file:'xpertsedge-genai.pdf',pages:16,size:'467 KB'}],
}
export const brochuresForCourse=courseId=>courseBrochures[courseId]||[]
