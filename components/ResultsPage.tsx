import React from 'react';
import type { Pharmacy, SortKey, SearchConfirmation } from '../types';
import { PharmacyCard } from './PharmacyCard';
import { PillIcon } from './icons';

interface ResultsPageProps {
  pharmacies: Pharmacy[];
  isLoading: boolean;
  statusText: string;
  onSelectPharmacy: (pharmacy: Pharmacy) => void;
  sortBy: SortKey;
  onSortChange: (key: SortKey) => void;
  medicineChoices: string[];
  onMedicineSelect: (medicine: string) => void;
  searchConfirmation: SearchConfirmation | null;
  searchedMedicine: string;
  medicineDescription: string;
}

const SortButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
        active
          ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
          : 'bg-[#2a2a2a] text-gray-300 hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
};

interface MedicineInfoCardProps {
  medicineName: string;
  description: string;
}

const MedicineInfoCard: React.FC<MedicineInfoCardProps> = ({ medicineName, description }) => {
  if (!medicineName || !description) return null;

  return (
    <div className="bg-[#1E1E1E] border border-gray-700/50 rounded-2xl p-6 mb-8 animate-fade-in">
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 bg-teal-500/10 p-3 rounded-full mt-1">
                <PillIcon className="h-6 w-6 text-teal-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white">{medicineName}</h2>
                <p className="mt-2 text-gray-300 leading-relaxed">{description}</p>
            </div>
        </div>
         <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
    </div>
  );
};

export const ResultsPage: React.FC<ResultsPageProps> = ({ 
  pharmacies, 
  isLoading, 
  statusText, 
  onSelectPharmacy, 
  sortBy, 
  onSortChange,
  medicineChoices,
  onMedicineSelect,
  searchConfirmation,
  searchedMedicine,
  medicineDescription
}) => {
  
  const loadingContent = (
    <div className="text-center py-10">
      <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-lg text-gray-300">{statusText || 'Searching for pharmacies...'}</p>
    </div>
  );

  const confirmationContent = (
    <div className="container mx-auto text-center py-10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-4">
            {searchConfirmation?.suggestion ? "Did you mean?" : "Confirm Search"}
        </h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">{statusText}</p>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
            {searchConfirmation?.suggestion && (
                <button 
                    onClick={() => onMedicineSelect(searchConfirmation.suggestion!)}
                    className="px-8 py-4 bg-teal-500 text-white font-bold text-lg rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all duration-300 transform hover:scale-105"
                >
                    Yes, search for "{searchConfirmation.suggestion}"
                </button>
            )}
            {searchConfirmation?.original && (
                <button 
                    onClick={() => onMedicineSelect(searchConfirmation.original)}
                    className={`px-6 py-3 font-semibold rounded-full transition-colors ${
                        !searchConfirmation?.suggestion 
                            ? 'bg-teal-500 text-white hover:bg-teal-400' 
                            : 'bg-[#1E1E1E] border border-gray-700 text-white hover:bg-gray-800'
                    }`}
                >
                    {searchConfirmation?.suggestion ? `Search for "${searchConfirmation.original}" anyway` : `Search for "${searchConfirmation.original}"`}
                </button>
            )}
        </div>
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
    </div>
  );

  const medicineSelectionContent = (
    <div className="container mx-auto text-center py-10 animate-fade-in">
        <h2 className="text-2xl font-bold text-white mb-4">Please Select a Medicine</h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">{statusText}</p>
        <div className="flex flex-wrap justify-center gap-4">
            {medicineChoices.map(medicine => (
                <button 
                    key={medicine}
                    onClick={() => onMedicineSelect(medicine)}
                    className="px-6 py-3 bg-[#1E1E1E] border border-gray-700 text-white font-bold rounded-full shadow-lg hover:bg-teal-500 hover:border-teal-500 transition-all duration-300 transform hover:scale-105"
                >
                    {medicine}
                </button>
            ))}
        </div>
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        `}</style>
    </div>
  );
  
  const pharmacyResultsContent = (
    <div className="space-y-4">
      {pharmacies.map(p => (
        <PharmacyCard key={p.id} pharmacy={p} onClick={() => onSelectPharmacy(p)} />
      ))}
    </div>
  );

  const noResultsContent = (
     <p className="text-center text-gray-400 py-10">{statusText || 'No results found.'}</p>
  );

  const renderMainContent = () => {
    if (isLoading) return loadingContent;
    if (searchConfirmation) return confirmationContent;
    if (medicineChoices.length > 0 && pharmacies.length === 0) return medicineSelectionContent;
    if (pharmacies.length > 0) return pharmacyResultsContent;
    return noResultsContent;
  };


  return (
    <div className="container mx-auto">
      {!isLoading && pharmacies.length > 0 && (
        <>
        <MedicineInfoCard medicineName={searchedMedicine} description={medicineDescription} />
        <div className="flex flex-col md:flex-row justify-center md:justify-start items-center mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <SortButton active={sortBy === 'distance'} onClick={() => onSortChange('distance')}>Distance</SortButton>
            <SortButton active={sortBy === 'price'} onClick={() => onSortChange('price')}>Price</SortButton>
            <SortButton active={sortBy === 'availability'} onClick={() => onSortChange('availability')}>Availability</SortButton>
          </div>
        </div>
        </>
      )}
      {renderMainContent()}
    </div>
  );
};