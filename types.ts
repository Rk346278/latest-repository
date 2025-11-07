
export enum StockStatus {
  Available = 'Available',
  Unavailable = 'Unavailable',
}

export interface AlternativeMedicine {
  name: string;
  price: number;
  priceUnit: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  price: number;
  priceUnit: string;
  distance: number;
  stock: StockStatus;
  isBestOption: boolean;
  address: string;
  phone: string;
  lat: number;
  lon: number;
  alternative?: AlternativeMedicine;
}

export type SortKey = 'price' | 'distance' | 'availability';

export type FontSize = 'base' | 'lg' | 'xl';

export interface SearchConfirmation {
  suggestion: string | null;
  original: string;
}

export interface PharmacyOwner {
  name:string;
  phone: string;
  address: string;
}

export interface InventoryItem {
  medicineName: string;
  price: number;
  stock: StockStatus;
}
