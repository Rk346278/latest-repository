import React from 'react';
import type { Pharmacy } from '../types';
import { MapPinIcon, PhoneIcon, XIcon } from './icons';

interface PharmacyDetailModalProps {
  pharmacy: Pharmacy | null;
  onClose: () => void;
}

export const PharmacyDetailModal: React.FC<PharmacyDetailModalProps> = ({ pharmacy, onClose }) => {
  if (!pharmacy) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E1E1E] rounded-3xl shadow-2xl shadow-teal-900/40 w-full max-w-md m-4 p-8 relative border border-gray-700 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <XIcon className="h-6 w-6 text-gray-400" />
        </button>

        <h2 className="text-3xl font-bold text-white mb-2">{pharmacy.name}</h2>
        <div className="mb-6">
            <p className="text-cyan-400 font-bold text-3xl inline-block">₹{pharmacy.price.toFixed(2)}</p>
            <span className="text-gray-400 ml-2 text-base">{pharmacy.priceUnit}</span>
        </div>


        <div className="space-y-4 text-lg text-gray-300">
          <div className="flex items-center gap-3">
            <MapPinIcon className="h-6 w-6 text-teal-400 flex-shrink-0" />
            <span>{pharmacy.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <PhoneIcon className="h-6 w-6 text-teal-400 flex-shrink-0" />
            <span>{pharmacy.phone}</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center px-6 py-4 bg-gray-700 text-white font-bold rounded-full shadow-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500"
          >
            Directions
          </a>
          <a
            href={`tel:${pharmacy.phone}`}
            className="w-full text-center px-6 py-4 bg-teal-500 text-white font-bold rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300"
          >
            Call Pharmacy
          </a>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};