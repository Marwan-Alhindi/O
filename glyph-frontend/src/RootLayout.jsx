import { Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'

function RootLayout() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <Outlet />
            </AuthProvider>
        </LanguageProvider>
    )
}

export default RootLayout
