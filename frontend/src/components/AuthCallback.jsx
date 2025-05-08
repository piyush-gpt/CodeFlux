import React, { useEffect } from 'react';
import { useBedrockPassport } from '@bedrock_org/passport';
import { useNavigate } from 'react-router-dom';

function AuthCallback() {
  const { loginCallback } = useBedrockPassport();
  const navigate = useNavigate();

  useEffect(() => {
    const login = async (token, refreshToken) => {
      const success = await loginCallback(token, refreshToken);
      if (success) {
        navigate('/dashboard');
      }
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (token && refreshToken) {
      login(token, refreshToken);
    }
  }, [loginCallback, navigate]);

  return <div className="min-h-screen flex items-center justify-center">Signing in...</div>;
}

export default AuthCallback; 