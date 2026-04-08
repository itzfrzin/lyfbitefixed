import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

// ── MongoDB Setup ─────────────────────────────────────────────────────────────
let db = null;
let usersCollection = null;
let contactCollection = null;
const memContact = [];

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

async function connectMongo() {
  try {
    const { MongoClient } = await import("mongodb");
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    db = client.db("lyfbite");
    usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    contactCollection = db.collection("contact_messages");

    console.log("✅ Connected to MongoDB");
    await seedAdminAccount();
  } catch (err) {
    console.warn("⚠️ MongoDB fallback active.");
  }
}

async function seedAdminAccount() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lyfbite.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@LyfBite2026";
  const existing = await usersCollection.findOne({ email: adminEmail });
  if (existing) return;
  await usersCollection.insertOne({
    firstName: "Admin",
    lastName: "LyfBite",
    email: adminEmail,
    password: simpleHash(adminPassword),
    isYearlySubscriber: false,
    isAdmin: true,
    createdAt: new Date(),
  });
}

connectMongo();

const memUsers = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5173;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.use(express.json());

// ── AUTH & API ROUTES ────────────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) return res.status(400).json({ message: "Required fields missing." });
  const hashedPw = simpleHash(password);
  if (usersCollection) {
    try {
      const existing = await usersCollection.findOne({ email });
      if (existing) return res.status(409).json({ message: "Email exists." });
      const result = await usersCollection.insertOne({ firstName, lastName, email, password: hashedPw, isYearlySubscriber: false, createdAt: new Date() });
      return res.json({ user: { id: result.insertedId.toString(), firstName, lastName, email } });
    } catch { return res.status(500).json({ message: "Server error." }); }
  } else {
    if (memUsers.has(email)) return res.status(409).json({ message: "Email exists." });
    const user = { id: "mem_" + Date.now(), firstName, lastName, email };
    memUsers.set(email, { ...user, password: hashedPw });
    return res.json({ user });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const hashedPw = simpleHash(password);
  if (usersCollection) {
    const found = await usersCollection.findOne({ email });
    if (!found || found.password !== hashedPw) return res.status(401).json({ message: "Invalid credentials." });
    return res.json({ user: { id: found._id.toString(), firstName: found.firstName, email: found.email } });
  } else {
    const found = memUsers.get(email);
    if (!found || found.password !== hashedPw) return res.status(401).json({ message: "Invalid credentials." });
    return res.json({ user: found });
  }
});

app.get("/api/meals", async (req, res) => {
  res.json({ items: [] }); // Simplified for debug
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ── MEAL GENERATION WITH DEBUGGING ──────────────────────────────────────────
app.post("/api/generate-meal-plan", async (req, res) => {
  const { profile, health, mealCount: rawMealCount } = req.body;
  const mealCount = Math.max(1, Math.min(10, parseInt(rawMealCount) || 3));
  
  try {
    // 1. Check for API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes("YOUR_API")) {
        throw new Error("Missing GEMINI_API_KEY in Vercel settings.");
    }

    const prompt = `Create ${mealCount} healthy meals for a ${profile?.age}yo ${profile?.goal} goal. Return ONLY JSON: {"meals":[{"mealName":"Name","instructions":"Steps","prepTime":20,"price":12,"macros":{"calories":500,"protein":30,"carbs":50,"fats":15}}]}`;

    // 2. Try AI Generation
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    const text = result.text.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(text);
    return res.json(data);

  } catch (error) {
    console.error("DEBUG ERROR:", error.message);
    
    // 3. Return a "Debug Meal" if it fails so you can see the error on the screen
    const debugMeal = {
      mealName: "⚠️ Server Error Details",
      instructions: `The AI failed with this error: "${error.message}". Please check your Vercel Environment Variables.`,
      prepTime: 0,
      price: 0,
      macros: { calories: 0, protein: 0, carbs: 0, fats: 0 }
    };
    
    // Also include algorithmic fallback so the app doesn't stay empty
    const fallbacks = generateAlgorithmicMeals(profile, health, mealCount - 1);
    res.json({ meals: [debugMeal, ...fallbacks] });
  }
});

function generateAlgorithmicMeals(profile, health, count = 3) {
  if (count <= 0) return [];
  const meals = [];
  for (let i = 0; i < count; i++) {
    meals.push({
      mealName: "Standard Balanced Meal",
      instructions: "Mix lean protein with whole grains and fresh vegetables. Season with herbs.",
      prepTime: 25,
      price: 12.50,
      macros: { calories: 600, protein: 30, carbs: 60, fats: 20 }
    });
  }
  return meals;
}

export default app;
