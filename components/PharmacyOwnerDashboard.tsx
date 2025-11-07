
import React, { useState, useRef } from 'react';
import type { PharmacyOwner, InventoryItem } from '../types';
import { StockStatus } from '../types';
import { PillIcon, TrashIcon, CameraIcon } from './icons';

interface PharmacyOwnerDashboardProps {
  owner: PharmacyOwner;
  inventory: InventoryItem[];
  onLogout: () => void;
  onSwitchAccount: () => void;
  onItemAdd: (newItem: InventoryItem) => void;
  onSlipUpload: (file: File) => Promise<void>;
  onStockStatusChange: (medicineName: string, newStatus: StockStatus) => void;
  onItemDelete: (medicineName: string) => void;
}

const StockStatusSelector: React.FC<{
    selected: StockStatus;
    onChange: (status: StockStatus) => void;
    idPrefix?: string;
}> = ({ selected, onChange, idPrefix = 'stock-selector' }) => (
    <div className="flex items-center gap-1.5 p-1 bg-gray-700/50 rounded-full">
        <button
            type="button"
            id={`${idPrefix}-${StockStatus.Available}`}
            onClick={() => onChange(StockStatus.Available)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${selected === StockStatus.Available ? 'bg-green-500 text-white shadow' : 'text-gray-300 hover:bg-gray-600'}`}
        >
            Available
        </button>
        <button
            type="button"
            id={`${idPrefix}-${StockStatus.Unavailable}`}
            onClick={() => onChange(StockStatus.Unavailable)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${selected === StockStatus.Unavailable ? 'bg-red-500 text-white shadow' : 'text-gray-300 hover:bg-gray-600'}`}
        >
            Unavailable
        </button>
    </div>
);


export const PharmacyOwnerDashboard: React.FC<PharmacyOwnerDashboardProps> = ({ owner, inventory, onLogout, onSwitchAccount, onItemAdd, onSlipUpload, onStockStatusChange, onItemDelete }) => {
    const [newMedicineName, setNewMedicineName] = useState('');
    const [newMedicinePrice, setNewMedicinePrice] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMedicineName.trim() && parseFloat(newMedicinePrice) > 0) {
            onItemAdd({
                medicineName: newMedicineName.trim(),
                price: parseFloat(newMedicinePrice),
                stock: StockStatus.Available,
            });
            setNewMedicineName('');
            setNewMedicinePrice('');
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsParsing(true);
            setParseError('');
            try {
                await onSlipUpload(file);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
                setParseError(errorMessage);
            } finally {
                setIsParsing(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    return (
        <div className="space-y-8 py-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">{owner.name}</h1>
                    <p className="text-gray-400 mt-1">{owner.address}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        onClick={onSwitchAccount}
                        className="px-4 py-2 bg-[#1E1E1E] border border-gray-700 text-gray-300 font-semibold text-sm rounded-full hover:bg-gray-700 transition-all"
                    >
                        Switch Account
                    </button>
                    <button
                        onClick={onLogout}
                        className="px-6 py-2 bg-[#1E1E1E] border border-gray-700 text-white font-bold rounded-full shadow-lg hover:bg-red-500/80 hover:border-red-500 transition-all duration-300"
                    >
                        Log Out
                    </button>
                </div>
            </div>
            
            <div className="bg-[#1E1E1E] p-6 rounded-2xl shadow-2xl shadow-teal-900/20">
                <h2 className="text-2xl font-bold text-white mb-4">Add New Medicine</h2>

                <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            value={newMedicineName}
                            onChange={(e) => setNewMedicineName(e.target.value)}
                            placeholder="Medicine Name (e.g., Paracetamol 500mg)"
                            className="bg-[#2a2a2a] text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                            required
                        />
                        <input
                            type="number"
                            value={newMedicinePrice}
                            onChange={(e) => setNewMedicinePrice(e.target.value)}
                            placeholder="Price (₹)"
                            className="bg-[#2a2a2a] text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                     <div className="flex justify-end pt-2">
                        <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-teal-500 text-white font-bold rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300">
                            Add to Inventory
                        </button>
                    </div>
                </form>

                <div className="my-6">
                    <div className="flex items-center">
                        <span className="h-px flex-1 bg-gray-700"></span>
                        <span className="px-4 text-sm font-semibold text-gray-500">OR</span>
                        <span className="h-px flex-1 bg-gray-700"></span>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        disabled={isParsing}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-bold rounded-full shadow-lg shadow-cyan-500/30 hover:bg-cyan-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-300 disabled:bg-gray-600 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed"
                    >
                        {isParsing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Processing Slip...</span>
                            </>
                        ) : (
                            <>
                                <CameraIcon className="h-5 w-5" />
                                <span>Quick Update from Price Slip</span>
                            </>
                        )}
                    </button>
                    {parseError && <p className="text-red-400 text-xs mt-2 text-center">{parseError}</p>}
                </div>


                <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-xl font-bold text-white mb-4">Current Inventory ({inventory.length})</h3>
                    {inventory.length > 0 ? (
                         <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                             {inventory.sort((a,b) => a.medicineName.localeCompare(b.medicineName)).map((item, index) => (
                                 <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#2a2a2a] p-4 rounded-lg gap-4">
                                     <div className="flex items-center gap-3">
                                        <PillIcon className="h-5 w-5 text-teal-400 flex-shrink-0 mt-1 sm:mt-0"/>
                                        <div>
                                            <span className="font-medium text-white block">{item.medicineName}</span>
                                            <span className="font-bold text-cyan-400 text-sm">₹{item.price.toFixed(2)}</span>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2 self-end sm:self-center">
                                         <StockStatusSelector selected={item.stock} onChange={(newStatus) => onStockStatusChange(item.medicineName, newStatus)} idPrefix={`item-${index}`} />
                                        <button onClick={() => onItemDelete(item.medicineName)} className="p-2 text-gray-500 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors" aria-label={`Delete ${item.medicineName}`}>
                                            <TrashIcon className="h-5 w-5"/>
                                        </button>
                                     </div>
                                 </li>
                             ))}
                         </ul>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
                            <p className="text-gray-400">Your inventory is empty.</p>
                            <p className="text-gray-500 text-sm">Add your first medicine using the forms above.</p>
                        </div>
                    )}
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
