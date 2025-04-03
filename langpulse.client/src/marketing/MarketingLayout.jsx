import { Outlet } from 'react-router-dom'

function MarketingLayout() {
  return (
    <div>
      <Outlet /> {/* Renders child routes */}
    </div>
  )
}

export default MarketingLayout