import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, CameraIcon, MicIcon, PillIcon } from './icons';
import { parsePrescription, getMedicineSuggestions } from '../services/geminiService';

interface HomePageProps {
  onMedicineSearch: (query: string) => void;
  onDiseaseSearch: (query: string) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`w-1/2 py-3 font-bold text-center transition-colors duration-300 rounded-t-lg ${
            active ? 'bg-[#1E1E1E] text-teal-400' : 'bg-transparent text-gray-400 hover:bg-gray-800/50'
        }`}
    >
        {children}
    </button>
);


export const HomePage: React.FC<HomePageProps> = ({ onMedicineSearch, onDiseaseSearch }) => {
  const [medicineQuery, setMedicineQuery] = useState('');
  const [diseaseQuery, setDiseaseQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'medicine' | 'disease'>('medicine');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce logic for fetching suggestions
  useEffect(() => {
    if (medicineQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSuggestionsLoading(true);
    const debounceTimer = setTimeout(async () => {
      const newSuggestions = await getMedicineSuggestions(medicineQuery);
      setSuggestions(newSuggestions);
      setIsSuggestionsLoading(false);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [medicineQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setMedicineQuery(suggestion);
    setSuggestions([]); // Hide suggestions after selection
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      try {
        const base64 = await blobToBase64(file);
        const medicineName = await parsePrescription(base64);
        setMedicineQuery(medicineName);
        if (medicineName !== "Error identifying medicine") {
          onMedicineSearch(medicineName);
        }
      } catch (error) {
        console.error("Error processing prescription image:", error);
        setMedicineQuery("Could not read prescription");
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleMedicineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestions([]);
    onMedicineSearch(medicineQuery);
  };

  const handleDiseaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDiseaseSearch(diseaseQuery);
  };
  
  const handleTabChange = (tab: 'medicine' | 'disease') => {
    setActiveTab(tab);
    setSuggestions([]);
    setIsSuggestionsLoading(false);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
      <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
        Find Your Medicine <span className="text-teal-400">Near You.</span>
      </h1>
      <p className="max-w-2xl text-lg md:text-xl text-gray-400 mb-8">
        Instantly locate pharmacies, compare prices, and get AI-powered recommendations.
      </p>

      <div className="w-full max-w-2xl">
          <div className="flex">
              <TabButton active={activeTab === 'medicine'} onClick={() => handleTabChange('medicine')}>
                  Search by Medicine
              </TabButton>
              <TabButton active={activeTab === 'disease'} onClick={() => handleTabChange('disease')}>
                  Search by Disease
              </TabButton>
          </div>

        {activeTab === 'medicine' ? (
             <div className="bg-[#1E1E1E] rounded-b-2xl rounded-tr-2xl shadow-2xl shadow-teal-900/20 p-2 transition-all">
                <div className="relative" ref={searchContainerRef}>
                    <form onSubmit={handleMedicineSubmit} className="flex items-center">
                        <SearchIcon className="h-6 w-6 text-gray-500 ml-4" />
                        <input
                            type="text"
                            value={medicineQuery}
                            onChange={(e) => setMedicineQuery(e.target.value)}
                            placeholder="Enter medicine name (e.g., Paracetamol)"
                            className="w-full bg-transparent text-lg text-white placeholder-gray-500 border-none focus:ring-0 px-4 py-2"
                            autoComplete="off"
                        />
                        <div className="flex items-center space-x-1 mr-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            <button type="button" onClick={handleScanClick} className="p-3 rounded-full hover:bg-gray-700 transition-colors" aria-label="Upload or Scan Prescription">
                                {isProcessingImage ? (
                                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <CameraIcon className="h-5 w-5 text-gray-400" />
                                )}
                            </button>
                            <button type="button" className="p-3 rounded-full hover:bg-gray-700 transition-colors" aria-label="Voice Search">
                                <MicIcon className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </form>
                    {(suggestions.length > 0 || isSuggestionsLoading) && (
                        <div className="absolute top-full left-0 right-0 bg-[#2a2a2a] border border-gray-700 rounded-b-lg shadow-lg z-10 animate-fade-in-down max-h-60 overflow-y-auto">
                            {isSuggestionsLoading && <div className="p-4 text-center text-gray-400">Loading...</div>}
                            {!isSuggestionsLoading && (
                            <ul>
                                {suggestions.map((suggestion, index) => (
                                <li key={index}>
                                    <button
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="w-full text-left px-6 py-3 text-white hover:bg-teal-500/20 transition-colors"
                                    >
                                    {suggestion}
                                    </button>
                                </li>
                                ))}
                            </ul>
                            )}
                        </div>
                    )}
                </div>
                 <button 
                    onClick={handleMedicineSubmit}
                    className="mt-4 w-full px-10 py-4 bg-teal-500 text-white font-bold text-lg rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300">
                    Search Medicine
                </button>
            </div>
        ) : (
             <div className="bg-[#1E1E1E] rounded-b-2xl rounded-tl-2xl shadow-2xl shadow-cyan-900/20 p-2 transition-all">
                <form onSubmit={handleDiseaseSubmit} className="flex items-center">
                    <SearchIcon className="h-6 w-6 text-gray-500 ml-4" />
                    <input
                    type="text"
                    value={diseaseQuery}
                    onChange={(e) => setDiseaseQuery(e.target.value)}
                    placeholder="Enter disease or symptom (e.g., Headache)"
                    className="w-full bg-transparent text-lg text-white placeholder-gray-500 border-none focus:ring-0 px-4 py-2"
                    />
                </form>
                <button 
                    onClick={handleDiseaseSubmit}
                    className="mt-4 w-full px-10 py-4 bg-cyan-600 text-white font-bold text-lg rounded-full shadow-lg shadow-cyan-500/30 hover:bg-cyan-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-300">
                    Get Recommendations
                </button>
             </div>
        )}
      </div>
       <style>{`
        @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};