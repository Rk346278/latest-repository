import React from 'react';
import { PillIcon } from './icons';

interface HeaderProps {
  onHomeClick: () => void;
  onPharmacyOwnerClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHomeClick, onPharmacyOwnerClick }) => {
  return (
    <header className="bg-[#1E1E1E]/80 backdrop-blur-sm sticky top-0 z-40">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={onHomeClick} className="flex-shrink-0 flex items-center gap-2 text-white">
              <PillIcon className="h-8 w-8 text-teal-400" />
              <span className="font-bold text-xl tracking-tight">MediFinder</span>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <a href="#" onClick={(e) => { e.preventDefault(); onHomeClick(); }} className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md font-medium transition-colors">Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onPharmacyOwnerClick(); }} className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md font-medium transition-colors">For Pharmacy Owners</a>
          </div>
        </div>
      </nav>
    </header>
  );
};