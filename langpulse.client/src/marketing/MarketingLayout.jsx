import { Outlet } from 'react-router-dom'
import Navigation from './components/Navigation'
import Landing from './pages/Landing'

function MarketingLayout() {
  return (
    <div className="bg-black">
      <div>
        <Navigation/>
        <div className="h-screen overflow-y-auto border-x border-x-neutral-800 border-solid md:mx-75">
            <div className="h-screen overflow-y-auto mx-30 md:mx-75 h-screen border-x border-x-neutral-800 border-dashed overflow-y-auto">
            {/* <Landing /> */}
            </div>
        </div>
      </div>

      <Outlet /> {/* Renders child routes */}
    </div>
  )
}

export default MarketingLayout