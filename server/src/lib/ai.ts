import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

let model: ChatGroq | null = null;

const getModel = () => {
  if (!model) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
       throw new Error("GROQ_API_KEY is not configured");
    }
    model = new ChatGroq({
      apiKey,
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });
  }
  return model;
};

const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a high-precision geometric shape recognizer for a wireframing app.
  
  Input: A list of points (x,y) from a user's drawing stroke.
  Task: Identify the intended shape. 
  Supported types: "circle", "rect", "triangle", "arrow", "line".
  
  Rules:
  1. If it looks like a triangle (3 corners), return "triangle".
  2. If it has a clear head and shaft, return "arrow".
  3. Return a JSON object with geometric properties.
  
  Format:
  {{ "shape": {{ "type": "rect", "x": 10, "y": 10, "width": 100, "height": 50 }} }}
  {{ "shape": {{ "type": "circle", "x": 50, "y": 50, "radius": 30 }} }}
  {{ "shape": {{ "type": "triangle", "x": 10, "y": 10, "width": 100, "height": 100 }} }}
  {{ "shape": {{ "type": "arrow", "x": 0, "y": 0, "width": 100, "height": 100 }} }}
  
  Be strict. If you are unsure, just provide design advice as text.`],
  ["user", "{input}"],
]);

export const getAiSuggestion = async (input: string) => {
  try {
    const aiModel = getModel();
    const chain = prompt.pipe(aiModel).pipe(new StringOutputParser());
    const response = await chain.invoke({ input });
    
    const jsonMatch = response.match(/\{.*\}/s);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    return JSON.stringify({ content: response });
  } catch (error: any) {
    console.error("AI Error:", error);
    return JSON.stringify({ content: error.message || "Sorry, I encountered an error." });
  }
};
