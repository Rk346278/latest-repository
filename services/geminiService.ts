
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, StockStatus } from "../types";

const API_KEY = process.env.API_KEY;

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

if (!API_KEY) {
    console.warn("Gemini API key not configured. Please ensure the API_KEY environment variable is set and accessible in your deployment environment. The application will not work correctly.");
}

/**
 * Checks if the Gemini API is initialized and throws an error if not.
 * @returns The initialized GoogleGenAI instance.
 */
const ensureAi = () => {
  if (!ai) {
    throw new Error("Gemini API not initialized. Please ensure the API_KEY environment variable is configured correctly.");
  }
  return ai;
};


/**
 * Parses a prescription image to identify the medicine name.
 * @param imageBase64 The base64 encoded string of the prescription image.
 * @returns The identified medicine name as a string.
 */
export const parsePrescription = async (imageBase64: string): Promise<string> => {
  const ai = ensureAi();
  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
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
    throw new Error("Failed to identify medicine from prescription image.");
  }
};

/**
 * Parses a price slip image to identify medicine names and prices.
 * @param imageBase64 The base64 encoded string of the price slip image.
 * @returns An array of identified inventory items.
 */
export const parsePriceSlip = async (imageBase64: string): Promise<InventoryItem[]> => {
  const ai = ensureAi();
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
      return result.map(item => ({...item, stock: StockStatus.Available}));
    }
    console.error("Gemini API returned non-JSON response:", jsonString);
    throw new Error("Could not parse the price slip. The format was unexpected.");

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
  const ai = ensureAi();
  try {
    const prompt = `Based on the user's query for a disease or symptom, recommend relevant medicine names. List common over-the-counter or prescription medicines. Provide the response as a single, comma-separated string of the top 1-3 medicine names. For example, for 'headache', return 'Paracetamol, Ibuprofen'. User query: '${diseaseQuery}'`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error getting medicine recommendations from Gemini API:", error);
    throw new Error("Could not fetch medicine recommendations.");
  }
};


/**
 * Validates a medicine name using the Gemini API.
 * @param medicineName The user's input for a medicine name.
 * @returns An object indicating if the name is valid and a corrected name if applicable.
 */
export const validateMedicineName = async (medicineName: string): Promise<{ valid: boolean; correctedName: string; reason: string }> => {
  const ai = ensureAi();
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
    
    console.error("Gemini API returned non-JSON response for validation:", jsonString);
    throw new Error("Could not validate medicine name due to an unexpected response.");
    
  } catch (error) {
    console.error("Error validating medicine name with Gemini API:", error);
    throw new Error("Could not validate medicine name at this time.");
  }
};

/**
 * Gets a simple, user-friendly description of a medicine.
 * @param medicineName The name of the medicine.
 * @returns A promise that resolves to a description string.
 */
export const getMedicineDescription = async (medicineName: string): Promise<string> => {
  const ai = ensureAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a brief, simple, one-paragraph description for the medicine "${medicineName}". Write it for a layperson, focusing on its common use. For example, for 'Paracetamol', you could say 'Paracetamol is a common pain reliever and fever reducer used to treat many conditions such as headaches, muscle aches, arthritis, backache, toothaches, colds, and fevers.'`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting medicine description from Gemini API:", error);
    throw new Error(`Could not load information for ${medicineName}.`);
  }
};

/**
 * Gets a common alternative for a given medicine.
 * @param medicineName The name of the medicine for which to find an alternative.
 * @returns A promise that resolves to the name of an alternative medicine, or an empty string.
 */
export const getMedicineAlternative = async (medicineName: string): Promise<string> => {
  const ai = ensureAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `What is a single, common, and widely available alternative or substitute medicine for "${medicineName}"? Provide only the name of the medicine. For example, for "Aspirin", a good answer would be "Ibuprofen".`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error getting medicine alternative from Gemini API:", error);
    return "";
  }
};

/**
 * Gets a human-readable address from latitude and longitude coordinates.
 * @param lat The latitude.
 * @param lon The longitude.
 * @returns A promise that resolves to an address string.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  const ai = ensureAi();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide the full, formatted street address for the following GPS coordinates: latitude ${lat}, longitude ${lon}. The address should be suitable for display and include street, city, state, and postal code if available. For example: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA'.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error with reverse geocoding from Gemini API:", error);
    throw new Error(`Could not determine address for Lat: ${lat}, Lon: ${lon}`);
  }
};

/**
 * Gets latitude and longitude for a given address string.
 * @param address The address string to geocode.
 * @returns A promise that resolves to an object with lat and lon.
 */
export const geocodeAddress = async (address: string): Promise<{ lat: number; lon: number }> => {
  const ai = ensureAi();
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
    throw new Error("Geocoding failed to return valid JSON.");
    
  } catch (error) {
    console.error("Error geocoding address with Gemini API:", error);
    throw new Error("Could not find coordinates for the provided address.");
  }
};
