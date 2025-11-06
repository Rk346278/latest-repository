
import { GoogleGenAI, Type } from "@google/genai";
// Fix: Added StockStatus to the import to be used in mock data.
import { InventoryItem, StockStatus } from "../types";

// This is a placeholder for the actual Gemini API key
// In a real production environment, this should be handled securely and not hardcoded.
const API_KEY = process.env.API_KEY;

// Ensure API_KEY is available before initializing
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Parses a prescription image to identify the medicine name.
 * @param imageBase64 The base64 encoded string of the prescription image.
 * @returns The identified medicine name as a string.
 */
export const parsePrescription = async (imageBase64: string): Promise<string> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Return a mock response for demonstration purposes
    return "Metformin 500mg";
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg', // Assuming jpeg, could be dynamic
        data: imageBase64,
      },
    };

    const textPart = {
      text: "Identify the name of the prescribed medicine from this image. Provide only the name and dosage of the medication."
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error parsing prescription with Gemini API:", error);
    // Fallback for demonstration
    return "Error identifying medicine";
  }
};

/**
 * Parses a price slip image to identify medicine names and prices.
 * @param imageBase64 The base64 encoded string of the price slip image.
 * @returns An array of identified inventory items.
 */
export const parsePriceSlip = async (imageBase64: string): Promise<InventoryItem[]> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Return a mock response for demonstration purposes
    return [
      // Fix: Added missing 'stock' property to satisfy the InventoryItem type.
      { medicineName: 'Dolo 650', price: 31.00, stock: StockStatus.InStock },
      // Fix: Added missing 'stock' property to satisfy the InventoryItem type.
      { medicineName: 'Aspirin 75mg', price: 15.50, stock: StockStatus.InStock },
      // Fix: Added missing 'stock' property to satisfy the InventoryItem type.
      { medicineName: 'Cetirizine 10mg', price: 25.00, stock: StockStatus.InStock },
    ];
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    };

    const textPart = {
      text: `Analyze this image of a medicine price list. Extract each medicine's name and its price. Ignore any item that isn't a medicine. Provide the response as a JSON array of objects, where each object has "medicineName" (string) and "price" (number). Example: [{"medicineName": "Paracetamol 500mg", "price": 30.50}]`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              medicineName: { type: Type.STRING, description: "The name of the medicine, including dosage if present." },
              price: { type: Type.NUMBER, description: "The price of the medicine." }
            }
          }
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
      const result: Omit<InventoryItem, 'stock'>[] = JSON.parse(jsonString);
      return result.map(item => ({...item, stock: StockStatus.InStock}));
    }
    console.error("Gemini API returned non-JSON response:", jsonString);
    return [];

  } catch (error) {
    console.error("Error parsing price slip with Gemini API:", error);
    if (error && (error.toString().includes('RESOURCE_EXHAUSTED') || error.toString().includes('429'))) {
        throw new Error("API Quota Exceeded. Please check your plan and billing details, or try again later.");
    }
    throw new Error("Could not parse image with AI service. Please ensure the image is clear and try again.");
  }
};


/**
 * Gets medicine recommendations for a given disease or symptom.
 * @param diseaseQuery The user's search query for a disease/symptom.
 * @returns A comma-separated string of recommended medicine names.
 */
export const getMedicineRecommendations = async (diseaseQuery: string): Promise<string> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Return a mock response for demonstration purposes
    if (diseaseQuery.toLowerCase().includes('fever')) {
        return "Paracetamol, Ibuprofen, Dolo 650";
    }
     if (diseaseQuery.toLowerCase().includes('headache')) {
        return "Paracetamol, Ibuprofen, Aspirin";
    }
    return ""; // a fallback for mock
  }

  try {
    const prompt = `Based on the user's query for a disease or symptom, recommend relevant medicine names. List common over-the-counter or prescription medicines. Provide the response as a single, comma-separated string of the top 1-3 medicine names. For example, for 'headache', return 'Paracetamol, Ibuprofen'. User query: '${diseaseQuery}'`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error getting medicine recommendations from Gemini API:", error);
    return "";
  }
};


/**
 * Validates a medicine name using the Gemini API.
 * @param medicineName The user's input for a medicine name.
 * @returns An object indicating if the name is valid and a corrected name if applicable.
 */
export const validateMedicineName = async (medicineName: string): Promise<{ valid: boolean; correctedName: string; reason: string }> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Mock response for demonstration
    const lowerCaseName = medicineName.toLowerCase();
    const knownMedicines = ['paracetamol', 'ibuprofen', 'metformin', 'aspirin', 'atorvastatin', 'amoxicillin', 'cetirizine', 'metformin 500mg', 'dolo 650'];
    
    if (knownMedicines.includes(lowerCaseName)) {
        const properName = lowerCaseName === 'dolo 650' ? 'Dolo 650' : medicineName.charAt(0).toUpperCase() + medicineName.slice(1).toLowerCase();
        return { valid: true, correctedName: properName, reason: '' };
    }
    if (lowerCaseName === 'paracetmol') {
        return { valid: true, correctedName: 'Paracetamol', reason: 'Corrected spelling.' };
    }
    if (medicineName.length < 3) {
      return { valid: false, correctedName: '', reason: `"${medicineName}" is too short to be a valid medicine name.` };
    }

    return { valid: false, correctedName: '', reason: `"${medicineName}" does not seem to be a valid medicine name. Please check the spelling.` };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful medical assistant. The user has entered a medicine name. Please validate it.
        User input: "${medicineName}"
        Is this a recognized medicine name? If it is a common misspelling, correct it.
        Provide a response in JSON format with three fields:
        1. "valid": a boolean (true if it's a real medicine or a correctable misspelling, false otherwise).
        2. "correctedName": a string with the corrected, properly capitalized name if valid, otherwise an empty string.
        3. "reason": a brief explanation for the user, e.g., "Corrected spelling from 'paracetmol'." or "'asdfg' does not appear to be a medicine." if invalid.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valid: { type: Type.BOOLEAN, description: "Whether the medicine name is valid or correctable." },
            correctedName: { type: Type.STRING, description: "The corrected or properly formatted medicine name." },
            reason: { type: Type.STRING, description: "A brief explanation for the validation result." },
          },
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        const result = JSON.parse(jsonString);
        return result;
    }
    // Fallback if the response isn't valid JSON, assume it's okay to proceed
    return { valid: true, correctedName: medicineName, reason: '' };
    
  } catch (error) {
    console.error("Error validating medicine name with Gemini API:", error);
    // Fallback to allow search if validation service fails, to not block the user
    return { valid: true, correctedName: medicineName, reason: 'Could not validate medicine name, but proceeding with search.' };
  }
};

/**
 * Gets medicine name autocomplete suggestions based on user input.
 * @param query The partial medicine name typed by the user.
 * @returns A promise that resolves to an array of suggestion strings.
 */
export const getMedicineSuggestions = async (query: string): Promise<string[]> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Mock response for demonstration
    const mockSuggestions: { [key: string]: string[] } = {
      'para': ['Paracetamol', 'Paracetamol 500mg', 'Paracetamol 650mg'],
      'ibu': ['Ibuprofen', 'Ibuprofen 400mg'],
      'met': ['Metformin', 'Metformin 500mg', 'Methotrexate'],
      'dolo': ['Dolo 650'],
    };
    const key = Object.keys(mockSuggestions).find(k => query.toLowerCase().startsWith(k));
    return key ? mockSuggestions[key] : [];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the user's partial input, provide up to 5 common medicine names that start with these letters.
        User input: "${query}"
        Provide the response as a JSON array of strings. For example, for "para", return ["Paracetamol", "Paracetamol 500mg"].
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A medicine name suggestion."
          }
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString.startsWith('[') && jsonString.endsWith(']')) {
      const result = JSON.parse(jsonString);
      return result;
    }
    return [];

  } catch (error) {
    console.error("Error getting medicine suggestions with Gemini API:", error);
    return [];
  }
};


/**
 * Gets a simple, user-friendly description of a medicine.
 * @param medicineName The name of the medicine.
 * @returns A promise that resolves to a description string.
 */
export const getMedicineDescription = async (medicineName: string): Promise<string> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Mock response for demonstration
    const lowerCaseName = medicineName.toLowerCase();
    if (lowerCaseName.includes('paracetamol') || lowerCaseName.includes('dolo 650')) {
      return 'Paracetamol, the active ingredient in Dolo 650, is a common pain reliever and fever reducer. It is used to treat many conditions such as headaches, muscle aches, arthritis, backache, toothaches, colds, and fevers.';
    }
    return `Information about ${medicineName} would be shown here.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a brief, simple, one-paragraph description for the medicine "${medicineName}". Write it for a layperson, focusing on its common use. For example, for 'Paracetamol', you could say 'Paracetamol is a common pain reliever and fever reducer used to treat many conditions such as headaches, muscle aches, arthritis, backache, toothaches, colds, and fevers.'`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting medicine description from Gemini API:", error);
    return `Could not load information for ${medicineName}.`;
  }
};

/**
 * Gets a human-readable address from latitude and longitude coordinates.
 * @param lat The latitude.
 * @param lon The longitude.
 * @returns A promise that resolves to an address string.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Mock response for demonstration
    return "123 Mockingbird Lane, Bengaluru, Karnataka 560001, India";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide the full, formatted street address for the following GPS coordinates: latitude ${lat}, longitude ${lon}. The address should be suitable for display and include street, city, state, and postal code if available. For example: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA'.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error with reverse geocoding from Gemini API:", error);
    return `Could not determine address. Lat: ${lat}, Lon: ${lon}`;
  }
};

/**
 * Gets latitude and longitude for a given address string.
 * @param address The address string to geocode.
 * @returns A promise that resolves to an object with lat and lon.
 */
export const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number }> => {
  if (!ai) {
    console.error("Gemini API key not configured.");
    // Mock response for demonstration. This coordinate is for central Bangalore.
    return { lat: 12.9716, lon: 77.5946 };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a geocoding expert. Provide the latitude and longitude for the following address: "${address}".
      Return the response in JSON format with two fields: "lat" (number) and "lon" (number).
      Example: for "1600 Amphitheatre Parkway, Mountain View, CA", return {"lat": 37.422, "lon": -122.084}.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: "Latitude" },
            lon: { type: Type.NUMBER, description: "Longitude" },
          },
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        const result = JSON.parse(jsonString);
        if (result.lat && result.lon) {
            return result;
        }
    }
     // Fallback for non-JSON or invalid response
    console.error("Geocoding failed to return valid JSON. Address:", address);
    return { lat: 12.9716, lon: 77.5946 }; // Fallback coordinate
    
  } catch (error) {
    console.error("Error geocoding address with Gemini API:", error);
    // Fallback if API fails
    return { lat: 12.9716, lon: 77.5946 };
  }
};