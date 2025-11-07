
import { StockStatus } from '../types';
import type { Pharmacy, InventoryItem, PharmacyOwner } from '../types';

// --- Start of Local Storage Database Logic ---
// This implementation uses the browser's localStorage.
// It is fast and works offline, but data is not shared between different users/browsers.
// The previous remote database implementation was causing network errors.
// This local version ensures the application remains stable and functional.

const DB_KEY = 'appDatabase';

// Storing only the core, non-runtime properties of a pharmacy.
type BasePharmacy = Omit<Pharmacy, 'distance' | 'price' | 'priceUnit' | 'stock' | 'isBestOption' | 'alternative'>;

interface GlobalInventory {
  [medicineName: string]: {
    pharmacyId: number;
    price: number;
    stock: StockStatus;
  }[];
}

interface AppDatabase {
    globalInventory: GlobalInventory;
    dynamicPharmacies: BasePharmacy[];
}

// Helper to get the database from localStorage
const getDb = (): AppDatabase => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Could not parse DB from localStorage", error);
    }
    // Return a default/empty DB if nothing is found or parsing fails
    return { globalInventory: {}, dynamicPharmacies: [] };
};

// Helper to save the database to localStorage
const saveDb = (db: AppDatabase) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Could not save DB to localStorage", error);
    }
};

// --- Service functions ---
// All functions are async to maintain a consistent API,
// making it easy to switch to a real remote database in the future.

export const updateGlobalInventory = async (pharmacyId: number, items: InventoryItem[]) => {
    const db = getDb();
    const { globalInventory } = db;
    items.forEach(item => {
        const medicineKey = item.medicineName.toLowerCase();
        if (!globalInventory[medicineKey]) {
            globalInventory[medicineKey] = [];
        }
        const pharmacyEntryIndex = globalInventory[medicineKey].findIndex(p => p.pharmacyId === pharmacyId);
        const stock = item.stock || StockStatus.Available;

        if (pharmacyEntryIndex > -1) {
            globalInventory[medicineKey][pharmacyEntryIndex].price = item.price;
            globalInventory[medicineKey][pharmacyEntryIndex].stock = stock;
        } else {
            globalInventory[medicineKey].push({ pharmacyId, price: item.price, stock: stock });
        }
    });
    saveDb(db);
};

export const updateStockStatusInGlobalInventory = async (pharmacyId: number, medicineName: string, stock: StockStatus) => {
    const db = getDb();
    const { globalInventory } = db;
    const medicineKey = medicineName.toLowerCase();

    if (globalInventory[medicineKey]) {
        const pharmacyEntryIndex = globalInventory[medicineKey].findIndex(p => p.pharmacyId === pharmacyId);
        if (pharmacyEntryIndex > -1) {
            globalInventory[medicineKey][pharmacyEntryIndex].stock = stock;
            saveDb(db);
        }
    }
};

export const deleteFromGlobalInventory = async (pharmacyId: number, medicineName: string) => {
    const db = getDb();
    const { globalInventory } = db;
    const medicineKey = medicineName.toLowerCase();
    if (globalInventory[medicineKey]) {
        globalInventory[medicineKey] = globalInventory[medicineKey].filter(p => p.pharmacyId !== pharmacyId);
        if (globalInventory[medicineKey].length === 0) {
            delete globalInventory[medicineKey];
        }
    }
    saveDb(db);
};

interface Location {
  lat: number;
  lon: number;
}

// This list has been cleared to ensure that all pharmacies are added by their owners.
export const VERIFIED_PHARMACIES_IN_BANGALORE: BasePharmacy[] = [];

/**
 * Retrieves the list of all pharmacies in the system (verified and user-added).
 * The list is combined and sorted alphabetically.
 * @returns A promise that resolves to an array of BasePharmacy objects.
 */
export const getRegisteredPharmacies = async (): Promise<BasePharmacy[]> => {
    const db = getDb();
    const allPharmacies = [...VERIFIED_PHARMACIES_IN_BANGALORE, ...db.dynamicPharmacies];

    // Use a map to handle potential duplicates, preferring the last one encountered (user-added if name conflicts)
    const pharmacyMap = new Map<string, BasePharmacy>();
    allPharmacies.forEach(p => pharmacyMap.set(p.name.toLowerCase(), p));
    
    const uniquePharmacies = Array.from(pharmacyMap.values());
    
    // Sort for consistent display
    uniquePharmacies.sort((a, b) => a.name.localeCompare(b.name));
    
    return uniquePharmacies;
};


/**
 * Registers a new pharmacy or retrieves an existing one by name.
 * @param details The owner's details for the pharmacy.
 * @param location The pharmacy's coordinates.
 * @returns A promise that resolves to the pharmacy's base details object, including its ID.
 */
export const registerOrGetPharmacy = async (details: PharmacyOwner, location: { lat: number, lon: number }): Promise<BasePharmacy> => {
    const db = getDb();
    
    const allPharmacies = [...VERIFIED_PHARMACIES_IN_BANGALORE, ...db.dynamicPharmacies];
    
    const existingPharmacy = allPharmacies.find(p => p.name.toLowerCase() === details.name.toLowerCase());
    if (existingPharmacy) {
        return existingPharmacy;
    }

    // If not found, create a new one.
    // Generate a new ID. Start from a high number to avoid clashes with verified list.
    const maxId = Math.max(...allPharmacies.map(p => p.id), 1000);
    const newPharmacy: BasePharmacy = {
        id: maxId + 1,
        name: details.name,
        address: details.address,
        phone: details.phone,
        lat: location.lat,
        lon: location.lon,
    };
    
    db.dynamicPharmacies.push(newPharmacy);
    saveDb(db);
    
    return newPharmacy;
};

/**
 * Checks if a medicine exists in the local globalInventory.
 * @param medicineName The name of the medicine to check.
 * @returns A promise that resolves to true if the medicine is in the inventory, false otherwise.
 */
export const checkMedicineLocally = async (medicineName: string): Promise<boolean> => {
  // Simulate a quick, non-blocking check
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const db = getDb();
  const medicineKey = medicineName.toLowerCase();
  
  // Check if the key exists and the array for that key is not empty
  return !!db.globalInventory[medicineKey] && db.globalInventory[medicineKey].length > 0;
};

/**
 * Retrieves the price and stock for a specific medicine at a single pharmacy.
 * @param pharmacyId The ID of the pharmacy.
 * @param medicineName The name of the medicine.
 * @returns A promise that resolves to the medicine's details or null if not found.
 */
export const getMedicineDetailsForPharmacy = async (pharmacyId: number, medicineName: string): Promise<{ price: number; stock: StockStatus } | null> => {
    const db = getDb();
    const medicineKey = medicineName.toLowerCase();
    const inventoryEntry = db.globalInventory[medicineKey];
    
    if (inventoryEntry) {
        const pharmacyData = inventoryEntry.find(p => p.pharmacyId === pharmacyId);
        if (pharmacyData) {
            return { price: pharmacyData.price, stock: pharmacyData.stock };
        }
    }
    return null;
};


/**
 * Calculates the Haversine distance between two points on the Earth.
 * @param loc1 First location { lat, lon }
 * @param loc2 Second location { lat, lon }
 * @returns The distance in kilometers.
 */
function haversineDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lon - loc1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds nearby pharmacies, prioritizing those with the medicine in stock.
 * This ensures that if a pharmacy has the medicine, it will be shown in the results,
 * regardless of its distance. The list is then supplemented with closer, out-of-stock options.
 * @param userLocation The user's current latitude and longitude.
 * @param medicineName The name of the medicine being searched.
 * @returns A promise that resolves to an array of Pharmacy objects.
 */
export const findNearbyPharmacies = async (userLocation: Location, medicineName: string): Promise<Pharmacy[]> => {
  // Simulate network delay for a better user experience with local storage
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const db = getDb();
  const { globalInventory, dynamicPharmacies } = db;
  
  const pharmaciesWithStock = globalInventory[medicineName.toLowerCase()] || [];
  const stockedPharmacyIds = new Set(pharmaciesWithStock.map(p => p.pharmacyId));
  const priceMap = new Map(pharmaciesWithStock.map(p => [p.pharmacyId, p.price]));
  const stockMap = new Map(pharmaciesWithStock.map(p => [p.pharmacyId, p.stock]));

  const allBasePharmacies = [...VERIFIED_PHARMACIES_IN_BANGALORE, ...dynamicPharmacies];
  const allPharmaciesWithDetails: Omit<Pharmacy, 'isBestOption'>[] = allBasePharmacies.map(pharmacy => {
    const distance = parseFloat(haversineDistance(userLocation, pharmacy).toFixed(1));
    const hasEntry = stockedPharmacyIds.has(pharmacy.id);

    return {
      ...pharmacy,
      distance,
      price: hasEntry ? priceMap.get(pharmacy.id)! : 0,
      priceUnit: hasEntry ? 'per strip' : '-',
      stock: hasEntry ? stockMap.get(pharmacy.id)! : StockStatus.Unavailable,
    };
  });

  // 1. Separate pharmacies into available and unavailable lists
  const availablePharmacies: Pharmacy[] = allPharmaciesWithDetails
    .filter(p => p.stock === StockStatus.Available)
    .map(p => ({ ...p, isBestOption: false }));

  const unavailablePharmacies: Pharmacy[] = allPharmaciesWithDetails
    .filter(p => p.stock !== StockStatus.Available)
    .map(p => ({ ...p, isBestOption: false }));

  // 2. Sort unavailable pharmacies by distance
  unavailablePharmacies.sort((a, b) => a.distance - b.distance);

  // 3. Combine the lists: take ALL available pharmacies, and supplement with the nearest unavailable ones up to a total of 15.
  const MAX_RESULTS = 15;
  const combinedResults = [...availablePharmacies];
  const neededUnavailable = MAX_RESULTS - combinedResults.length;

  if (neededUnavailable > 0) {
    combinedResults.push(...unavailablePharmacies.slice(0, neededUnavailable));
  }
  
  // 4. Determine the "Best Option" from ALL available pharmacies, not just the closest ones.
  let bestOption: Pharmacy | null = null;
  if (availablePharmacies.length > 0) {
    // Use a scoring system to find the best balance of distance and price.
    // A lower score is better. We'll value 1km of distance as being equivalent to ?10.
    bestOption = availablePharmacies.reduce((best, current) => {
        const bestScore = (best.distance * 10) + best.price;
        const currentScore = (current.distance * 10) + current.price;
        return currentScore < bestScore ? current : best;
    });
  }

  // Mark the best option within the combined results list.
  if (bestOption) {
    const bestOptionIndex = combinedResults.findIndex(p => p.id === bestOption!.id);
    if (bestOptionIndex > -1) {
      combinedResults[bestOptionIndex].isBestOption = true;
    }
  }
  
  // Return the combined list. The App component will handle the final sorting based on user preference.
  return combinedResults;
};
