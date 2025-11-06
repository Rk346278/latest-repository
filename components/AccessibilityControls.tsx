
import React, { useState } from 'react';
import { FontSizeIcon, GlobeIcon } from './icons';

interface AccessibilityControlsProps {
    onFontSizeChange: () => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({ onFontSizeChange }) => {
    const [lang, setLang] = useState('EN');

    const handleLanguageChange = () => {
        setLang(current => current === 'EN' ? 'ES' : 'EN');
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
             <button 
                onClick={handleLanguageChange}
                className="w-14 h-14 bg-[#1E1E1E] border border-gray-700 text-white font-bold rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-cyan-400"
                aria-label="Toggle Language"
            >
                <span className="text-sm font-bold">{lang}</span>
            </button>
            <button 
                onClick={onFontSizeChange}
                className="w-14 h-14 bg-[#1E1E1E] border border-gray-700 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-cyan-400"
                aria-label="Change Font Size"
            >
                <FontSizeIcon className="h-7 w-7" />
            </button>
        </div>
    );
}
