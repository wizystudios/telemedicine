import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

export default function ChatbotPage() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('wizy:open'));
  }, []);
  return <Navigate to="/dashboard" replace />;
}
