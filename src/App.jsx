import React, { useState } from 'react';
import AppOffline from './AppOffline';
import AppFirebase from './AppFirebase';

export default function App() {
  const [mode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const betaParam = params.get('beta');
    
    if (betaParam === 'true') {
      localStorage.setItem('otto_comandas_mode', 'firebase');
      return 'firebase';
    } else if (betaParam === 'false') {
      localStorage.setItem('otto_comandas_mode', 'offline');
      return 'offline';
    }
    
    return localStorage.getItem('otto_comandas_mode') || 'offline'; // Default to offline for easy demo
  });

  if (mode === 'firebase') {
    return <AppFirebase />;
  }

  return <AppOffline />;
}
