import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RAGModeContextType {
  isRAGMode: boolean;
  setIsRAGMode: (mode: boolean) => void;
  toggleRAGMode: () => void;
}

const RAGModeContext = createContext<RAGModeContextType | undefined>(undefined);

export const useRAGMode = () => {
  const context = useContext(RAGModeContext);
  if (context === undefined) {
    throw new Error('useRAGMode must be used within a RAGModeProvider');
  }
  return context;
};

interface RAGModeProviderProps {
  children: ReactNode;
}

export const RAGModeProvider: React.FC<RAGModeProviderProps> = ({ children }) => {
  const [isRAGMode, setIsRAGMode] = useState(false);

  const toggleRAGMode = () => {
    setIsRAGMode(prev => !prev);
  };

  return (
    <RAGModeContext.Provider value={{ isRAGMode, setIsRAGMode, toggleRAGMode }}>
      {children}
    </RAGModeContext.Provider>
  );
};
