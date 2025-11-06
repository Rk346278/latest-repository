
import React, { useState, useEffect } from 'react';
import type { PharmacyOwner, InventoryItem } from '../types';
import { StockStatus } from '../types';
import { PharmacyOwnerLogin } from './PharmacyOwnerLogin';
import { PharmacyOwnerDashboard } from './PharmacyOwnerDashboard';
import { updateGlobalInventory, deleteFromGlobalInventory, registerOrGetPharmacy, updateStockStatusInGlobalInventory } from '../services/pharmacyService';
import { parsePriceSlip } from '../services/geminiService';

const OWNER_DETAILS_KEY = 'pharmacyOwnerDetails';
const INVENTORY_KEY = 'pharmacyInventory';

// The owner object we store will have an ID for stable reference
type EnrichedPharmacyOwner = PharmacyOwner & { id: number };

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

export const PharmacyOwnerPage: React.FC = () => {
    const [owner, setOwner] = useState<EnrichedPharmacyOwner | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        try {
            const storedOwner = localStorage.getItem(OWNER_DETAILS_KEY);
            if (storedOwner) {
                const parsedOwner: EnrichedPharmacyOwner = JSON.parse(storedOwner);
                setOwner(parsedOwner);
                
                const storedInventory = localStorage.getItem(`${INVENTORY_KEY}_${parsedOwner.id}`);
                if (storedInventory) {
                    const parsedInventory: InventoryItem[] = JSON.parse(storedInventory);
                    // Data migration for older items without a stock property
                    const migratedInventory = parsedInventory.map(item => ({
                        ...item,
                        stock: item.stock || StockStatus.InStock 
                    }));
                    setInventory(migratedInventory);
                }
            }
        } catch (error) {
            console.error("Failed to load data from local storage", error);
        }
    }, []);

    const handleLogin = async (details: PharmacyOwner, location: { lat: number, lon: number }) => {
        try {
            const pharmacy = await registerOrGetPharmacy(details, location);
            const enrichedOwner: EnrichedPharmacyOwner = { ...details, id: pharmacy.id };
            
            localStorage.setItem(OWNER_DETAILS_KEY, JSON.stringify(enrichedOwner));
            setOwner(enrichedOwner);
            
            const storedInventory = localStorage.getItem(`${INVENTORY_KEY}_${pharmacy.id}`);
            if (storedInventory) {
                const parsedInventory: InventoryItem[] = JSON.parse(storedInventory);
                const migratedInventory = parsedInventory.map(item => ({
                    ...item,
                    stock: item.stock || StockStatus.InStock
                }));
                setInventory(migratedInventory);
            } else {
                setInventory([]);
            }
        } catch (error) {
            console.error("Failed to register pharmacy or load inventory", error);
        }
    };

    const handleLogout = () => {
        try {
            localStorage.removeItem(OWNER_DETAILS_KEY);
        } catch (error) {
            console.error("Failed to remove owner details from local storage", error);
        }
        setOwner(null);
        setInventory([]);
    };
    
    const handleItemAdd = async (newItem: Omit<InventoryItem, 'stock'>) => {
        if (!owner) return;
        
        const pharmacyId = owner.id;
        const fullNewItem: InventoryItem = { ...newItem, stock: StockStatus.InStock };
        
        const updatedInventory = [...inventory];
        const existingIndex = updatedInventory.findIndex(
            item => item.medicineName.toLowerCase() === fullNewItem.medicineName.toLowerCase()
        );

        if (existingIndex > -1) {
            updatedInventory[existingIndex] = fullNewItem; // Update price and stock if it exists
        } else {
            updatedInventory.push(fullNewItem);
        }

        try {
            localStorage.setItem(`${INVENTORY_KEY}_${pharmacyId}`, JSON.stringify(updatedInventory));
            setInventory(updatedInventory);
            await updateGlobalInventory(pharmacyId, [fullNewItem]);
        } catch (error) {
            console.error("Failed to save inventory", error);
        }
    };

    const handleSlipUpload = async (file: File) => {
        if (!owner) return;
        
        try {
            const base64 = await blobToBase64(file);
            const parsedItems = await parsePriceSlip(base64); 
            
            if (parsedItems.length === 0) {
                throw new Error("No medicines could be identified from the image. Please try again with a clearer image.");
            }

            const pharmacyId = owner.id;
            
            const updatedInventory = [...inventory];
            parsedItems.forEach(newItem => {
                const existingIndex = updatedInventory.findIndex(
                    item => item.medicineName.toLowerCase() === newItem.medicineName.toLowerCase()
                );
                if (existingIndex > -1) {
                    updatedInventory[existingIndex] = { ...updatedInventory[existingIndex], price: newItem.price, stock: newItem.stock };
                } else {
                    updatedInventory.push(newItem);
                }
            });

            localStorage.setItem(`${INVENTORY_KEY}_${pharmacyId}`, JSON.stringify(updatedInventory));
            setInventory(updatedInventory);
            
            await updateGlobalInventory(pharmacyId, parsedItems);
        } catch (error) {
            console.error("Error processing price slip:", error);
            throw error; 
        }
    };

    const handleStockStatusChange = async (medicineName: string, newStatus: StockStatus) => {
        if (!owner) return;
        const pharmacyId = owner.id;

        const updatedInventory = inventory.map(item => 
            item.medicineName.toLowerCase() === medicineName.toLowerCase()
                ? { ...item, stock: newStatus }
                : item
        );

        try {
            setInventory(updatedInventory);
            localStorage.setItem(`${INVENTORY_KEY}_${pharmacyId}`, JSON.stringify(updatedInventory));
            await updateStockStatusInGlobalInventory(pharmacyId, medicineName, newStatus);
        } catch (error) {
            console.error("Failed to update stock status", error);
        }
    };


    const handleItemDelete = async (medicineNameToDelete: string) => {
         if (!owner) return;

         const pharmacyId = owner.id;
         
        const updatedInventory = inventory.filter(
            item => item.medicineName.toLowerCase() !== medicineNameToDelete.toLowerCase()
        );
        try {
            localStorage.setItem(`${INVENTORY_KEY}_${pharmacyId}`, JSON.stringify(updatedInventory));
            setInventory(updatedInventory);
            await deleteFromGlobalInventory(pharmacyId, medicineNameToDelete);
        } catch (error) {
            console.error("Failed to update inventory", error);
        }
    };

    return (
        <div className="container mx-auto max-w-4xl">
            {owner ? (
                <PharmacyOwnerDashboard 
                    owner={owner} 
                    inventory={inventory} 
                    onLogout={handleLogout}
                    onItemAdd={handleItemAdd}
                    onSlipUpload={handleSlipUpload}
                    onStockStatusChange={handleStockStatusChange}
                    onItemDelete={handleItemDelete}
                />
            ) : (
                <PharmacyOwnerLogin onLogin={handleLogin} />
            )}
        </div>
    );
};
