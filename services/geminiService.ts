import { GoogleGenAI } from "@google/genai";
import { Bike, MonthlyStat, Transaction } from "../types";

// Initialize Gemini Client
// NOTE: In a real production app, this should be handled via a backend proxy to protect the API key.
// For this frontend-only demonstration, we use process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

export const analyzeFleetMaintenance = async (bikes: Bike[]): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured. Cannot perform AI analysis.";

  const prompt = `
    Act as a Fleet Operations Manager AI. Analyze the following motorcycle fleet data.
    Identify high-risk vehicles that need immediate maintenance based on mileage versus next service due.
    Suggest an optimal maintenance schedule to minimize downtime.
    
    Data:
    ${JSON.stringify(bikes)}

    Format the response as a concise executive summary with bullet points for action items.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to analyze fleet data due to an API error.";
  }
};

export const analyzeFinancialHealth = async (stats: MonthlyStat[], transactions: Transaction[]): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured. Cannot perform AI analysis.";

  const prompt = `
    Act as a Senior Accountant and ERP Analyst. Review the financial data below for a motorcycle rental business.
    1. Analyze the Revenue vs Expense trend.
    2. Identify potential cash flow risks based on recent transactions.
    3. Suggest one strategic financial move to improve profit margins.

    Monthly Stats:
    ${JSON.stringify(stats)}

    Recent Transactions:
    ${JSON.stringify(transactions)}

    Keep the tone professional, authoritative, and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "No financial analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to analyze financial data.";
  }
};
