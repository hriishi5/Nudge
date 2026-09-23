import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import apiClient from '../lib/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = localStorage.getItem('nudge_auth_token');
        const storedUser = localStorage.getItem('nudge_user_data');
        const storedOrg = localStorage.getItem('nudge_org_data');

        // Check for mock token first
        if (storedToken?.startsWith('mock_jwt_')) {
          if (storedUser) setUser(JSON.parse(storedUser));
          if (storedOrg) setOrg(JSON.parse(storedOrg));
          setSession({ access_token: storedToken });
          setLoading(false);
          return;
        }

        // Check active Supabase session or stored token
        let tokenToVerify = storedToken;
        if (!tokenToVerify) {
          const { data: { session: activeSession } } = await supabase.auth.getSession();
          if (activeSession?.access_token) {
            tokenToVerify = activeSession.access_token;
            localStorage.setItem('nudge_auth_token', tokenToVerify);
          }
        }

        if (tokenToVerify) {
          // Verify with backend /api/auth/me to ensure valid tenant & role
          try {
            const meRes = await apiClient.get('/auth/me', {
              headers: { Authorization: `Bearer ${tokenToVerify}` }
            });
            setUser(meRes.data.user);
            setOrg(meRes.data.organization);
            setSession({ access_token: tokenToVerify });
          } catch (meErr) {
            // Token is expired or invalid
            console.warn('Session verification notice:', meErr.message);
            localStorage.removeItem('nudge_auth_token');
            localStorage.removeItem('nudge_user_data');
            localStorage.removeItem('nudge_org_data');
            setUser(null);
            setOrg(null);
            setSession(null);
          }
        }
      } catch (err) {
        console.warn('Auth initialization notice:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (currentSession?.access_token) {
        setSession(currentSession);
        setUser(currentSession.user);
        localStorage.setItem('nudge_auth_token', currentSession.access_token);
        try {
          const meRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${currentSession.access_token}` }
          });
          if (meRes.data?.organization) {
            setOrg(meRes.data.organization);
            localStorage.setItem('nudge_org_data', JSON.stringify(meRes.data.organization));
          }
        } catch (e) {
          // Keep existing org if me query fails
        }
      } else {
        const storedToken = localStorage.getItem('nudge_auth_token');
        if (!storedToken?.startsWith('mock_jwt_')) {
          setSession(null);
          setUser(null);
          setOrg(null);
          localStorage.removeItem('nudge_auth_token');
          localStorage.removeItem('nudge_user_data');
          localStorage.removeItem('nudge_org_data');
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // 1. Try unified backend login (handles auto-confirmation & tenant resolution)
      try {
        const res = await apiClient.post('/auth/login', { email, password });
        const { user: authUser, organization, session: authSession } = res.data;

        setUser(authUser);
        setOrg(organization);
        setSession(authSession);

        if (authSession?.access_token) {
          localStorage.setItem('nudge_auth_token', authSession.access_token);
        }
        localStorage.setItem('nudge_user_data', JSON.stringify(authUser));
        if (organization) {
          localStorage.setItem('nudge_org_data', JSON.stringify(organization));
        }

        return res.data;
      } catch (serverErr) {
        // Fallback to client-side Supabase signInWithPassword
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw new Error(error.message);
        }

        setUser(data.user);
        setSession(data.session);
        localStorage.setItem('nudge_auth_token', data.session.access_token);
        localStorage.setItem('nudge_user_data', JSON.stringify(data.user));

        // Attempt to fetch org details
        try {
          const meRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${data.session.access_token}` }
          });
          if (meRes.data?.organization) {
            setOrg(meRes.data.organization);
            localStorage.setItem('nudge_org_data', JSON.stringify(meRes.data.organization));
          }
        } catch (meErr) {
          console.warn('Could not fetch org profile:', meErr.message);
        }

        return data;
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ organization_name, email, password, full_name }) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', {
        organization_name,
        email,
        password,
        full_name
      });

      const { user: newUser, organization, session: newSession } = response.data;
      let token = newSession?.access_token;

      // If server didn't supply an active session, sign in directly with Supabase
      if (!token) {
        try {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (signInData?.session?.access_token) {
            token = signInData.session.access_token;
            setSession(signInData.session);
          }
        } catch (e) {
          console.warn('Direct sign-in fallback after registration:', e);
        }
      } else {
        setSession(newSession);
      }

      if (token) {
        localStorage.setItem('nudge_auth_token', token);
      }
      setUser(newUser);
      setOrg(organization);
      localStorage.setItem('nudge_user_data', JSON.stringify(newUser));
      if (organization) {
        localStorage.setItem('nudge_org_data', JSON.stringify(organization));
      }

      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (orgName = 'Bharat Heavy Dynamics Ltd', role = 'admin') => {
    const demoUser = {
      id: 'demo-user-101',
      email: 'ca.sharma@bharatdynamics.in',
      user_metadata: { full_name: 'CA Rajesh Sharma' }
    };
    const demoOrg = {
      id: 'demo-org-101',
      name: orgName
    };
    const demoToken = `mock_jwt_${Date.now()}_${demoUser.id}_${demoOrg.id}`;

    setUser(demoUser);
    setOrg(demoOrg);
    setSession({ access_token: demoToken });

    localStorage.setItem('nudge_auth_token', demoToken);
    localStorage.setItem('nudge_user_data', JSON.stringify(demoUser));
    localStorage.setItem('nudge_org_data', JSON.stringify(demoOrg));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore
    }
    setUser(null);
    setOrg(null);
    setSession(null);
    localStorage.removeItem('nudge_auth_token');
    localStorage.removeItem('nudge_user_data');
    localStorage.removeItem('nudge_org_data');
  };

  return (
    <AuthContext.Provider value={{ user, org, session, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
