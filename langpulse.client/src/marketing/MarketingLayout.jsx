import { Outlet } from 'react-router-dom'
import Navigation from './components/Navigation'
import Landing from './pages/Landing'
import { useState } from 'react'

function MarketingLayout() {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <div className="bg-black ">
      <div className="absolute bottom-0 left-0 w-[30vw] h-[400vh] bg-white opacity-5 blur-[600px] rounded-full pointer-events-none z-10" />
      <div>
        {/* White gradient from bottom-left corner */}
        <Navigation isMobile={isMobile} setIsMobile={setIsMobile}/>

        {!isMobile && (
          <div className="relative min-h-screen w-full bg-black">
            {/* Margin wrapper for all vertical lines */}
            <div className="h-full relative sm:mx-20 md:mx-40">
              {/* Outer solid borders */}
              <div className="absolute top-0 bottom-0 left-0 w-px bg-neutral-800" />
              <div className="absolute top-0 bottom-0 right-0 w-px bg-neutral-800" />

              {/* Dashed borders at 25%, 50%, 75% */}
              <div className="absolute top-0 bottom-0 left-1/4 w-px border-l border-dashed border-neutral-800" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-neutral-800" />
              <div className="absolute top-0 bottom-0 left-3/4 w-px border-l border-dashed border-neutral-800" />
              <Outlet /> {/* Renders child routes */}
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}

export default MarketingLayout