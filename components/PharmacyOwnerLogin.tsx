import React, { useState } from 'react';
import type { PharmacyOwner } from '../types';
import { reverseGeocode, geocodeAddress } from '../services/geminiService';
import { MapPinIcon } from './icons';

interface PharmacyOwnerLoginProps {
  onLogin: (details: PharmacyOwner, location: { lat: number, lon: number }) => void;
}

export const PharmacyOwnerLogin: React.FC<PharmacyOwnerLoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || phone.length !== 10 || !address) return;

    setIsSubmitting(true);
    setLocationError('');
    try {
        let coords = location;
        if (!coords) {
            // Address was entered manually or location was not fetched, so geocode it
            coords = await geocodeAddress(address);
        }
        
        if (coords) {
            onLogin({ name, phone, address }, coords);
        } else {
            setLocationError("Could not determine coordinates for the address.");
        }
    } catch (error) {
        console.error("Geocoding failed on submit:", error);
        setLocationError("Could not verify address location. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 10) {
      setPhone(numericValue);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAddress(e.target.value);
    // Clear cached coordinates if address is manually changed
    setLocation(null);
  };
  
  const handleLocationClick = () => {
    setIsFetchingLocation(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsFetchingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        try {
          const fetchedAddress = await reverseGeocode(latitude, longitude);
          setAddress(fetchedAddress);
        } catch (error) {
          setLocationError('Could not determine address. Please enter manually.');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        let errorMsg = 'Could not get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access was denied. Please enable it in your browser settings.';
        }
        setLocationError(errorMsg);
        setIsFetchingLocation(false);
      }
    );
  };
  
  const isFormValid = name && phone.length === 10 && address;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
            Welcome, Pharmacy Owner
        </h1>
        <p className="max-w-xl text-lg text-gray-400 mb-8">
            Please enter your pharmacy details to manage your inventory and connect with customers.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-lg bg-[#1E1E1E] p-8 rounded-2xl shadow-2xl shadow-teal-900/20 space-y-6">
            <div>
                <label htmlFor="pharmacyName" className="block text-left text-sm font-bold text-gray-300 mb-2">
                    Pharmacy Name
                </label>
                <input
                    id="pharmacyName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Apollo Pharmacy"
                    required
                    className="w-full bg-[#2a2a2a] text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                />
            </div>
            <div>
                <label htmlFor="phone" className="block text-left text-sm font-bold text-gray-300 mb-2">
                    Phone Number
                </label>
                <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter 10-digit number"
                    required
                    maxLength={10}
                    pattern="\d{10}"
                    title="Phone number must be 10 digits."
                    className="w-full bg-[#2a2a2a] text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                />
            </div>
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label htmlFor="address" className="block text-left text-sm font-bold text-gray-300">
                        Full Address
                    </label>
                    <button
                        type="button"
                        onClick={handleLocationClick}
                        disabled={isFetchingLocation}
                        className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        {isFetchingLocation ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span>Fetching...</span>
                            </>
                        ) : (
                            <>
                                <MapPinIcon className="h-4 w-4" />
                                <span>Use My Current Location</span>
                            </>
                        )}
                    </button>
                </div>
                <textarea
                    id="address"
                    value={address}
                    onChange={handleAddressChange}
                    placeholder="Enter your pharmacy's full address"
                    required
                    rows={3}
                    className="w-full bg-[#2a2a2a] text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all"
                />
                 {locationError && <p className="text-red-400 text-xs mt-1 text-left">{locationError}</p>}
            </div>

            <button
                type="submit"
                className="w-full px-10 py-4 bg-teal-500 text-white font-bold text-lg rounded-full shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300 disabled:bg-gray-500 disabled:shadow-none disabled:scale-100"
                disabled={!isFormValid || isSubmitting || isFetchingLocation}
            >
                {isSubmitting ? 'Verifying...' : 'Continue to Dashboard'}
            </button>
        </form>
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