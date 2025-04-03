import { Outlet } from 'react-router-dom'
import Navigation from './components/Navigation'

function MarketingLayout() {
  return (
    <div className="bg-black">
      <Navigation />
      <Outlet /> {/* Renders child routes */}
    </div>
  )
}

export default MarketingLayout