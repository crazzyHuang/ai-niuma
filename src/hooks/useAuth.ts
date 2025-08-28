import { useAuth as useAuthContext } from '@/contexts/AuthContext'

/**
 * Custom hook for easy access to authentication functionality
 * This is a re-export of the useAuth hook from AuthContext
 * for better organization and easier imports
 */
export const useAuth = useAuthContext

export default useAuth