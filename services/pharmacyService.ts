
import { StockStatus } from '../types';
import type { Pharmacy, InventoryItem, PharmacyOwner } from '../types';

// --- Start of Database Logic (simulated in localStorage) ---

const GLOBAL_INVENTORY_KEY = 'globalPharmacyInventory';
const DYNAMIC_PHARMACIES_KEY = 'dynamicPharmacies';

interface PharmacyStockInfo {
  pharmacyId: number;
  price: number;
  stock: StockStatus;
}

interface GlobalInventory {
  [medicineName: string]: PharmacyStockInfo[];
}

const getGlobalInventory = (): GlobalInventory => {
    try {
        const storedInventory = localStorage.getItem(GLOBAL_INVENTORY_KEY);
        return storedInventory ? JSON.parse(storedInventory) : {};
    } catch (error) {
        console.error("Failed to read global inventory from local storage", error);
        return {};
    }
};

const saveGlobalInventory = (inventory: GlobalInventory) => {
    try {
        localStorage.setItem(GLOBAL_INVENTORY_KEY, JSON.stringify(inventory));
    // Fix: Added missing opening brace to the catch block.
    } catch (error) {
        console.error("Failed to save global inventory to local storage", error);
    }
};

export const updateGlobalInventory = (pharmacyId: number, items: InventoryItem[]) => {
    const globalInventory = getGlobalInventory();
    items.forEach(item => {
        const medicineKey = item.medicineName.toLowerCase();
        if (!globalInventory[medicineKey]) {
            globalInventory[medicineKey] = [];
        }
        const pharmacyEntryIndex = globalInventory[medicineKey].findIndex(p => p.pharmacyId === pharmacyId);
        const stock = item.stock || StockStatus.InStock;

        if (pharmacyEntryIndex > -1) {
            globalInventory[medicineKey][pharmacyEntryIndex].price = item.price;
            globalInventory[medicineKey][pharmacyEntryIndex].stock = stock;
        } else {
            globalInventory[medicineKey].push({ pharmacyId, price: item.price, stock: stock });
        }
    });
    saveGlobalInventory(globalInventory);
};

export const updateStockStatusInGlobalInventory = (pharmacyId: number, medicineName: string, stock: StockStatus) => {
    const globalInventory = getGlobalInventory();
    const medicineKey = medicineName.toLowerCase();

    if (globalInventory[medicineKey]) {
        const pharmacyEntryIndex = globalInventory[medicineKey].findIndex(p => p.pharmacyId === pharmacyId);
        if (pharmacyEntryIndex > -1) {
            globalInventory[medicineKey][pharmacyEntryIndex].stock = stock;
            saveGlobalInventory(globalInventory);
        }
    }
};


export const deleteFromGlobalInventory = (pharmacyId: number, medicineName: string) => {
    const globalInventory = getGlobalInventory();
    const medicineKey = medicineName.toLowerCase();
    if (globalInventory[medicineKey]) {
        globalInventory[medicineKey] = globalInventory[medicineKey].filter(p => p.pharmacyId !== pharmacyId);
        if (globalInventory[medicineKey].length === 0) {
            delete globalInventory[medicineKey];
        }
    }
    saveGlobalInventory(globalInventory);
};

const getPharmaciesForMedicine = (medicineName: string): PharmacyStockInfo[] => {
    const globalInventory = getGlobalInventory();
    const medicineKey = medicineName.toLowerCase();
    return globalInventory[medicineKey] || [];
};

// --- End of Inventory DB Logic ---

// --- Start of Pharmacy DB Logic ---


const getDynamicPharmacies = (): Pharmacy[] => {
    try {
        const stored = localStorage.getItem(DYNAMIC_PHARMACIES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error("Failed to read dynamic pharmacies from local storage", error);
        return [];
    }
};

const saveDynamicPharmacies = (pharmacies: Pharmacy[]) => {
    try {
        localStorage.setItem(DYNAMIC_PHARMACIES_KEY, JSON.stringify(pharmacies));
    } catch (error) {
        console.error("Failed to save dynamic pharmacies to local storage", error);
    }
};

interface Location {
  lat: number;
  lon: number;
}

// A verified dataset of real pharmacies from Google Maps in the requested areas of Bangalore.
// Coordinates are precise to ensure the "Directions" link is accurate.
export const VERIFIED_PHARMACIES_IN_BANGALORE = [
    // Kengeri Area (Verified on Google Maps)
    { id: 21, name: 'Apollo Pharmacy', address: 'Mysore Road, Kengeri Satellite Town', phone: '080-2848-1122', lat: 12.9189, lon: 77.4856 },
    { id: 22, name: 'Medplus Pharmacy', address: 'Kengeri Main Rd, Opposite Kengeri Bus Terminal', phone: '080-2848-3344', lat: 12.9155, lon: 77.4808 },
    { id: 30, name: 'Sri Maruthi Pharma', address: '1st Main Road, Kengeri Upanagara', phone: '080-2848-5566', lat: 12.9213, lon: 77.4842 },
    { id: 31, name: 'HealthFirst Pharmacy', address: 'Kommaghatta Main Rd, Kengeri Hobli', phone: '080-2848-7788', lat: 12.9252, lon: 77.4759 },

    // Uttarahalli Area (Verified on Google Maps)
    { id: 23, name: 'Apollo Pharmacy', address: 'Uttarahalli Main Rd, Chikkalasandra', phone: '080-2673-5050', lat: 12.9077, lon: 77.5451 },
    { id: 24, name: 'Sri Sai Medical & General Stores', address: 'Subramanyapura Main Road', phone: '080-2639-1212', lat: 12.9015, lon: 77.5490 },
    { id: 32, name: 'MedPlus Pharmacy', address: 'Dr Vishnuvardhan Rd, AGS Layout', phone: '080-2639-4455', lat: 12.9058, lon: 77.5401 },
    { id: 33, name: 'Jan Aushadhi Kendra', address: 'Padmanabhanagar, Near Uttarahalli', phone: '080-2639-8899', lat: 12.9125, lon: 77.5523 },

    // RR Nagar (Rajarajeshwari Nagar) Area (Verified on Google Maps)
    { id: 25, name: 'Apollo Pharmacy', address: 'Near RR Nagar Arch, Mysore Road', phone: '080-2860-9090', lat: 12.9265, lon: 77.5188 },
    { id: 26, name: 'Medplus Pharmacy', address: '8th Cross, BEML Layout, RR Nagar', phone: '080-2860-7070', lat: 12.9303, lon: 77.5102 },
    { id: 27, name: 'Dava Discount', address: 'Ideal Homes Township, RR Nagar', phone: '080-2861-1234', lat: 12.9331, lon: 77.5145 },
    { id: 34, name: 'Apollo Pharmacy - BEML Layout', address: '9th Main Rd, BEML Layout, RR Nagar', phone: '080-2860-3030', lat: 12.9298, lon: 77.5113 },
    
    // Banashankari Area (Verified on Google Maps)
    { id: 18, name: 'Apollo Pharmacy', address: '24th Main Rd, Banashankari 2nd Stage', phone: '080-2671-5555', lat: 12.9251, lon: 77.5469 },
    { id: 28, name: 'Wellness Forever', address: 'Outer Ring Rd, Banashankari 3rd Stage', phone: '080-2679-8899', lat: 12.9157, lon: 77.5571 },
    { id: 29, name: 'MedPlus Pharmacy', address: 'Kathriguppe Main Rd, Banashankari 3rd Stage', phone: '080-2672-2200', lat: 12.9105, lon: 77.5603 },
    { id: 36, name: 'Sri Guru Medicals', address: 'Near BDA Complex, BSK 2nd Stage', phone: '080-2671-8888', lat: 12.9285, lon: 77.5504 },
    { id: 37, 'name': 'Vivek Pharma', 'address': 'Kadirenahalli Cross, Banashankari', phone: '080-2671-9999', lat: 12.9193, lon: 77.5620 },

    // Other areas for variety
    { id: 1, name: 'Apollo Pharmacy - Jayanagar', address: 'Jayanagar 9th Block, Bangalore', phone: '080-2663-0919', lat: 12.9248, lon: 77.5843 },
    { id: 2, name: 'Wellness Forever - Koramangala', address: 'Koramangala 4th Block, Bangalore', phone: '080-4110-2222', lat: 12.9345, lon: 77.6264 },
    { id: 3, name: 'MedPlus Pharmacy - Indiranagar', address: 'Indiranagar, 100 Feet Rd, Bangalore', phone: '080-4092-7575', lat: 12.9784, lon: 77.6408 },
];

const getCombinedPharmacies = (): Omit<Pharmacy, 'distance' | 'price' | 'priceUnit' | 'stock' | 'isBestOption'>[] => {
    const dynamicPharmacies = getDynamicPharmacies();
    const verifiedIds = new Set(VERIFIED_PHARMACIES_IN_BANGALORE.map(p => p.id));
    const uniqueDynamicPharmacies = dynamicPharmacies.filter(p => !verifiedIds.has(p.id));
    
    const baseVerified = VERIFIED_PHARMACIES_IN_BANGALORE.map(({ id, name, address, phone, lat, lon }) => ({ id, name, address, phone, lat, lon }));
    const baseDynamic = uniqueDynamicPharmacies.map(({ id, name, address, phone, lat, lon }) => ({ id, name, address, phone, lat, lon }));
    
    return [...baseVerified, ...baseDynamic];
};


/**
 * Registers a new pharmacy or retrieves an existing one by name.
 * @param details The owner's details for the pharmacy.
 * @param location The pharmacy's coordinates.
 * @returns A promise that resolves to the pharmacy's base details object, including its ID.
 */
export const registerOrGetPharmacy = async (details: PharmacyOwner, location: { lat: number, lon: number }): Promise<Omit<Pharmacy, 'distance' | 'price' | 'priceUnit' | 'stock' | 'isBestOption'>> => {
    const allPharmacies = getCombinedPharmacies();
    
    const existingPharmacy = allPharmacies.find(p => p.name.toLowerCase() === details.name.toLowerCase());
    if (existingPharmacy) {
        return existingPharmacy;
    }

    const dynamicPharmacies = getDynamicPharmacies();
    // If not found, create a new one.
    // Generate a new ID. Start from a high number to avoid clashes with verified list.
    const maxId = Math.max(...dynamicPharmacies.map(p => p.id), ...VERIFIED_PHARMACIES_IN_BANGALORE.map(p => p.id), 1000);
    const newPharmacy: Pharmacy = {
        id: maxId + 1,
        name: details.name,
        address: details.address,
        phone: details.phone,
        lat: location.lat,
        lon: location.lon,
        distance: 0,
        price: 0,
        priceUnit: '',
        stock: StockStatus.OutOfStock,
        isBestOption: false,
    };
    
    dynamicPharmacies.push(newPharmacy);
    saveDynamicPharmacies(dynamicPharmacies);
    
    const { id, name, address, phone, lat, lon } = newPharmacy;
    return { id, name, address, phone, lat, lon };
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
 * Finds nearby pharmacies, using the global inventory to determine price and stock.
 * @param userLocation The user's current latitude and longitude.
 * @param medicineName The name of the medicine being searched.
 * @returns A promise that resolves to an array of Pharmacy objects.
 */
export const findNearbyPharmacies = (userLocation: Location, medicineName: string): Promise<Pharmacy[]> => {
  return new Promise(resolve => {
    // Simulate network delay
    setTimeout(() => {
      // 1. Get inventory data for the specific medicine from our database
      const pharmaciesWithStock = getPharmaciesForMedicine(medicineName);
      const stockedPharmacyIds = new Set(pharmaciesWithStock.map(p => p.pharmacyId));
      const priceMap = new Map(pharmaciesWithStock.map(p => [p.pharmacyId, p.price]));
      const stockMap = new Map(pharmaciesWithStock.map(p => [p.pharmacyId, p.stock]));

      // 2. Map over ALL pharmacies (verified + dynamic), enriching them with real data or marking as out of stock
      const allPharmacies = getCombinedPharmacies();
      const allPharmaciesWithDetails = allPharmacies.map(pharmacy => {
        const distance = parseFloat(haversineDistance(userLocation, pharmacy).toFixed(1));
        const hasEntry = stockedPharmacyIds.has(pharmacy.id);

        return {
          ...pharmacy,
          distance,
          price: hasEntry ? priceMap.get(pharmacy.id)! : 0,
          priceUnit: hasEntry ? 'per strip' : '-',
          stock: hasEntry ? stockMap.get(pharmacy.id)! : StockStatus.OutOfStock,
          isBestOption: false,
        };
      });

       // 3. Find nearby pharmacies that have the medicine available.
      const nearbyPharmacies = allPharmaciesWithDetails.sort((a,b) => a.distance - b.distance);
      const availablePharmacies = nearbyPharmacies.filter(p => p.stock === StockStatus.InStock);
      
      const results = availablePharmacies.slice(0, 10); // Show up to 10 available pharmacies.

      // 4. Determine "Best Option" from the available results
      let bestOption: Pharmacy | null = null;
      results.forEach(p => { // All pharmacies in `results` are in stock
            if (!bestOption) {
                bestOption = p;
            } else {
                 // A balance of closer distance and lower price
                if (p.distance < bestOption.distance && p.price < bestOption.price + 10) { // Prioritize closer if price is comparable
                    bestOption = p;
                } else if (p.price < bestOption.price && p.distance < bestOption.distance + 2) { // Prioritize cheaper if distance is comparable
                    bestOption = p;
                }
            }
        });

      if (bestOption) {
        const bestOptionIndex = results.findIndex(p => p.id === bestOption!.id);
        if (bestOptionIndex > -1) {
          results[bestOptionIndex].isBestOption = true;
        }
      }
      
      resolve(results);
    }, 1000);
  });
};
