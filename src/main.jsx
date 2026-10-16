import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import HelpBot from './HelpBot.jsx'
import { FormGuardProvider } from './WorkspacePolish'
import './Motion.css'
import './LearningIdentity.css'
import './Operations.css'

class AppBoundary extends Component {
  state={failed:false}
  static getDerivedStateFromError(){return{failed:true}}
  render(){return this.state.failed?<main className="error-screen"><h1>We couldn’t open this page.</h1><p>Your saved workspace has not been cleared. Reload the portal to try again.</p><button onClick={()=>window.location.reload()}>Reload portal</button><p>If the problem continues, contact your institute.</p></main>:this.props.children}
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppBoundary><a className="launch-skip" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus()}}>Skip to main content</a><FormGuardProvider><App /></FormGuardProvider>
    <HelpBot /></AppBoundary>
  </StrictMode>,
)
