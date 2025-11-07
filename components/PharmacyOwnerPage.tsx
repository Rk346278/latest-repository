
import React, { useState, useEffect } from 'react';
import type { PharmacyOwner, InventoryItem } from '../types';
import { StockStatus } from '../types';
import { PharmacyOwnerLogin } from './PharmacyOwnerLogin';
import { PharmacyOwnerDashboard } from './PharmacyOwnerDashboard';
import { updateGlobalInventory, deleteFromGlobalInventory, registerOrGetPharmacy, updateStockStatusInGlobalInventory } from '../services/pharmacyService';
import { parsePriceSlip } from '../services/geminiService';

const ALL_OWNERS_KEY = 'pharmacyOwnersList';
const ACTIVE_OWNER_ID_KEY = 'activePharmacyOwnerId';
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
    const [activeOwner, setActiveOwner] = useState<EnrichedPharmacyOwner | null>(null);
    const [savedOwners, setSavedOwners] = useState<EnrichedPharmacyOwner[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    useEffect(() => {
        try {
            const storedOwners = localStorage.getItem(ALL_OWNERS_KEY);
            const allOwners: EnrichedPharmacyOwner[] = storedOwners ? JSON.parse(storedOwners) : [];
            setSavedOwners(allOwners);

            const activeOwnerIdStr = localStorage.getItem(ACTIVE_OWNER_ID_KEY);
            if (activeOwnerIdStr) {
                const activeOwnerId = parseInt(activeOwnerIdStr, 10);
                const owner = allOwners.find(o => o.id === activeOwnerId);
                if (owner) {
                    setActiveOwner(owner);
                }
            }
        } catch (error) {
            console.error("Failed to load data from local storage", error);
        }
    }, []);

    useEffect(() => {
        if (activeOwner) {
            try {
                const storedInventory = localStorage.getItem(`${INVENTORY_KEY}_${activeOwner.id}`);
                if (storedInventory) {
                    const parsedInventory: InventoryItem[] = JSON.parse(storedInventory);
                    // Data migration for older items to the new 'Available'/'Unavailable' stock system.
                    const migratedInventory = parsedInventory.map(item => ({
                        ...item,
                        stock: (item.stock as any) === 'Out of Stock' ? StockStatus.Unavailable : StockStatus.Available
                    }));
                    setInventory(migratedInventory);
                } else {
                    setInventory([]);
                }
            } catch (error) {
                console.error("Failed to load inventory from local storage", error);
            }
        } else {
            setInventory([]);
        }
    }, [activeOwner]);

    const handleLogin = async (details: PharmacyOwner, location: { lat: number, lon: number }) => {
        try {
            const pharmacy = await registerOrGetPharmacy(details, location);
            const newOwner: EnrichedPharmacyOwner = { ...details, id: pharmacy.id };
            
            const updatedOwners = [...savedOwners];
            const existingOwnerIndex = updatedOwners.findIndex(o => o.id === newOwner.id);
            if (existingOwnerIndex > -1) {
                updatedOwners[existingOwnerIndex] = newOwner;
            } else {
                updatedOwners.push(newOwner);
            }
            
            localStorage.setItem(ALL_OWNERS_KEY, JSON.stringify(updatedOwners));
            setSavedOwners(updatedOwners);
            
            localStorage.setItem(ACTIVE_OWNER_ID_KEY, newOwner.id.toString());
            setActiveOwner(newOwner);
        } catch (error) {
            console.error("Failed to register pharmacy or login", error);
        }
    };

    const handleOwnerSelect = (owner: EnrichedPharmacyOwner) => {
        localStorage.setItem(ACTIVE_OWNER_ID_KEY, owner.id.toString());
        setActiveOwner(owner);
    };

    const handleLogout = () => {
        try {
            localStorage.removeItem(ACTIVE_OWNER_ID_KEY);
        } catch (error) {
            console.error("Failed to remove active owner from local storage", error);
        }
        setActiveOwner(null);
    };
    
    const handleItemAdd = async (newItem: InventoryItem) => {
        if (!activeOwner) return;
        
        const pharmacyId = activeOwner.id;
        
        const updatedInventory = [...inventory];
        const existingIndex = updatedInventory.findIndex(
            item => item.medicineName.toLowerCase() === newItem.medicineName.toLowerCase()
        );

        if (existingIndex > -1) {
            updatedInventory[existingIndex] = newItem; // Update price and stock if it exists
        } else {
            updatedInventory.push(newItem);
        }

        try {
            localStorage.setItem(`${INVENTORY_KEY}_${pharmacyId}`, JSON.stringify(updatedInventory));
            setInventory(updatedInventory);
            await updateGlobalInventory(pharmacyId, [newItem]);
        } catch (error) {
            console.error("Failed to save inventory", error);
        }
    };

    const handleSlipUpload = async (file: File) => {
        if (!activeOwner) return;
        
        try {
            const base64 = await blobToBase64(file);
            const parsedItems = await parsePriceSlip(base64); 
            
            if (parsedItems.length === 0) {
                throw new Error("No medicines could be identified from the image. Please try again with a clearer image.");
            }

            const pharmacyId = activeOwner.id;
            
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
        if (!activeOwner) return;
        const pharmacyId = activeOwner.id;

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
         if (!activeOwner) return;

         const pharmacyId = activeOwner.id;
         
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
            {activeOwner ? (
                <PharmacyOwnerDashboard 
                    owner={activeOwner} 
                    inventory={inventory} 
                    onLogout={handleLogout}
                    onSwitchAccount={handleLogout}
                    onItemAdd={handleItemAdd}
                    onSlipUpload={handleSlipUpload}
                    onStockStatusChange={handleStockStatusChange}
                    onItemDelete={handleItemDelete}
                />
            ) : (
                <PharmacyOwnerLogin onLogin={handleLogin} savedOwners={savedOwners} onOwnerSelect={handleOwnerSelect} />
            )}
        </div>
    );
};
