# LangPulse


# The current structure of the app
- src/
- │
- ├── app/               # Authenticated app UI (after login)
- │   ├── components/    # App-specific components
- │   ├── pages/         # App screens (dashboard, profile, etc.)
- │   ├── services/      # API calls
- │   ├── utils/         # Utility functions
- │   └── AppLayout.jsx  # Shared layout for all of the app pages
- │
- ├── marketing/         # Landing page and public site
- │   ├── components/    # Hero, features, testimonials, etc.
- │   ├── pages/         # Landing, pricing, about, etc.
- │   └── MarketingLayout.jsx  # Shared layout for all of the marketing pages
- │
- ├── assets/            # Static assets (logos, icons, images)
- ├── styles/            # Global Tailwind styles (optional overrides)
- │   └── tailwind.css
- ├── main.jsx           # Entry point
- └── router.jsx         # React Router setup

# Possible updated structure of the app
- src/
- │
- ├── app/               # Authenticated app UI (after login)
- │   ├── components/    # App-specific components
- │   ├── pages/         # App screens (dashboard, profile, etc.)
- │   ├── hooks/         # Custom React hooks
- │   ├── services/      # API calls
- │   ├── utils/         # Utility functions
- │   └── AppLayout.jsx  # Shared layout for the app
- │
- ├── marketing/         # Landing page and public site
- │   ├── components/    # Hero, features, testimonials, etc.
- │   ├── pages/         # Landing, pricing, about, etc.
- │   └── MarketingLayout.jsx  # Shared layout for marketing pages
- │
- ├── assets/            # Static assets (logos, icons, images)
- ├── styles/            # Global Tailwind styles (optional overrides)
- │   └── tailwind.css
- ├── main.jsx           # Entry point
- └── router.jsx         # React Router setup