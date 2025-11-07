
import React from 'react';
import type { Pharmacy } from '../types';
import { StockStatus } from '../types';
import { StarIcon, PillIcon } from './icons';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  onClick: () => void;
}

const getStockColor = (stock: StockStatus) => {
  switch (stock) {
    case StockStatus.Available:
      return 'bg-green-500 text-green-900';
    case StockStatus.Unavailable:
      return 'bg-red-500 text-red-900';
    default:
      return 'bg-gray-500 text-gray-900';
  }
};

export const PharmacyCard: React.FC<PharmacyCardProps> = ({ pharmacy, onClick }) => {
  const { name, price, priceUnit, distance, stock, isBestOption } = pharmacy;

  const cardClasses = `
    bg-[#1E1E1E] p-5 rounded-2xl shadow-lg cursor-pointer transition-all duration-300
    hover:bg-[#2a2a2a] hover:shadow-cyan-700/20 transform hover:-translate-y-1
    ${isBestOption ? 'ring-2 ring-cyan-500 shadow-cyan-500/20 relative overflow-hidden' : 'ring-1 ring-gray-700/50'}
  `;

  return (
    <div className={cardClasses} onClick={onClick}>
      {isBestOption && (
        <div className="absolute top-0 right-0 bg-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl flex items-center gap-1">
          <StarIcon className="h-4 w-4" />
          Best Option
        </div>
      )}
      
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-lg text-white pr-16">{name}</h3>
         {stock === StockStatus.Available && (
            <div className="text-right">
                <p className="text-xl font-extrabold text-cyan-400 whitespace-nowrap">₹{price.toFixed(2)}</p>
                <p className="text-xs text-gray-400 whitespace-nowrap">{priceUnit}</p>
            </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center text-sm">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStockColor(stock)}`}>
          {stock}
        </span>
        <p className="text-gray-400">{distance} km away</p>
      </div>
    </div>
  );
};
