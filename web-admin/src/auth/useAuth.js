import { useContext } from 'react';
import { AuthCtx } from './AuthContext.jsx';

export const useAuth = () => useContext(AuthCtx);
