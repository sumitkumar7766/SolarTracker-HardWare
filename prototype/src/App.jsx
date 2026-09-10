import React, { useEffect } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { MainLayout } from './components/layout/MainLayout';
import './App.css';

function App() {
  // Ensure the page always starts at the very top on load
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <SimulationProvider>
      <MainLayout />
    </SimulationProvider>
  );
}

export default App;
