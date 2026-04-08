import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

console.log("🚀 SERVER STARTING... Time:", new Date().toISOString());
console.log("🔍 DB CHECK: MONGODB_URI is", process.env.MONGODB_URI ? "LOADED" : "MISSING");

// ── MongoDB Setup ─────────────────────────────────────────────────────────────
let db = null;
let usersCollection = null;
let contactCollection = null;
const memContact = [];
let connectionPromise = null;

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h.toString(36);
}

async function connectMongo() {
  if (connectionPromise) return connectionPromise;
  
  connectionPromise = (async () => {
    console.log("⏳ Initializing MongoDB Connection...");
    try {
      const { MongoClient } = await import("mongodb");
      const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      await client.connect();
      
      db = client.db("lyfbite");
      usersCollection = db.collection("users");
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      contactCollection = db.collection("contact_messages");

      await seedAdminAccount();
      console.log("✅ SUCCESS: Connected to MongoDB Atlas.");
      return true;
    } catch (err) {
      console.error("❌ MONGODB CONNECTION FAILED:", err.message);
      console.warn("⚠️  Falling back to in-memory store for this session.");
      return false;
    }
  })();
  
  return connectionPromise;
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

// Initial trigger for connection
connectMongo();

// Simple in-memory fallback store (when MongoDB is offline)
const memUsers = new Map();
const fallbackAdminEmail = process.env.ADMIN_EMAIL || "admin@lyfbite.com";
const fallbackAdminPassword = process.env.ADMIN_PASSWORD || "Admin@LyfBite2026";
memUsers.set(fallbackAdminEmail, {
  id: "mem_admin",
  firstName: "Admin",
  lastName: "LyfBite",
  email: fallbackAdminEmail,
  password: simpleHash(fallbackAdminPassword),
  isYearlySubscriber: false,
  isMonthlySubscriber: false,
  isAdmin: true,
  createdAt: new Date()
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5173;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.use(express.json());

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  await connectMongo(); // Ensure connection is attempted before proceeding
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ message: "All fields are required." });
  if (password.length < 8)
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  const hashedPw = simpleHash(password);
  if (usersCollection) {
    try {
      const existing = await usersCollection.findOne({ email });
      if (existing) return res.status(409).json({ message: "An account with this email already exists." });
      const result = await usersCollection.insertOne({
        firstName, lastName, email,
        password: hashedPw,
        isYearlySubscriber: false,
        createdAt: new Date()
      });
      const user = { id: result.insertedId.toString(), firstName, lastName, email, isYearlySubscriber: false, isMonthlySubscriber: false };
      return res.json({ user });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
      return res.status(500).json({ message: "Server error during sign-up." });
    }
  } else {
    if (memUsers.has(email)) return res.status(409).json({ message: "An account with this email already exists." });
    const user = { id: "mem_" + Date.now(), firstName, lastName, email, isYearlySubscriber: false, isMonthlySubscriber: false };
    memUsers.set(email, { ...user, password: hashedPw });
    return res.json({ user });
  }
});

app.post("/api/auth/login", async (req, res) => {
  await connectMongo(); // Ensure connection is attempted before proceeding
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
  const hashedPw = simpleHash(password);
  if (usersCollection) {
    const found = await usersCollection.findOne({ email });
    if (!found || found.password !== hashedPw)
      return res.status(401).json({ message: "Invalid email or password." });
    const user = { id: found._id.toString(), firstName: found.firstName, lastName: found.lastName, email: found.email, isYearlySubscriber: !!found.isYearlySubscriber, isMonthlySubscriber: !!found.isMonthlySubscriber };
    return res.json({ user });
  } else {
    const found = memUsers.get(email);
    if (!found || found.password !== hashedPw)
      return res.status(401).json({ message: "Invalid email or password." });
    const { password: _pw, ...user } = found;
    return res.json({ user });
  }
});

app.post("/api/auth/logout", (_req, res) => { res.json({ success: true }); });

app.post("/api/auth/set-monthly", async (req, res) => {
  const { userId } = req.body;
  if (usersCollection) {
    try {
      const { ObjectId } = await import("mongodb");
      await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { isMonthlySubscriber: true } });
    } catch { }
  } else {
    for (const [k, v] of memUsers.entries()) {
      if (v.id === userId) { v.isMonthlySubscriber = true; memUsers.set(k, v); break; }
    }
  }
  res.json({ success: true });
});

app.post("/api/auth/set-yearly", async (req, res) => {
  const { userId } = req.body;
  if (usersCollection) {
    try {
      const { ObjectId } = await import("mongodb");
      await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: { isYearlySubscriber: true } });
    } catch { }
  } else {
    for (const [k, v] of memUsers.entries()) {
      if (v.id === userId) { v.isYearlySubscriber = true; memUsers.set(k, v); break; }
    }
  }
  res.json({ success: true });
});

// ── ADMIN ROUTES ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@lyfbite.com";

function isAdmin(email) {
  return email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

app.post("/api/admin/check", (req, res) => {
  const { email } = req.body;
  res.json({ isAdmin: isAdmin(email) });
});

app.post("/api/admin/users", async (req, res) => {
  const { email } = req.body;
  if (!isAdmin(email)) return res.status(403).json({ message: "Forbidden." });
  if (usersCollection) {
    const users = await usersCollection
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    const mapped = users.map(u => ({
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      isYearlySubscriber: !!u.isYearlySubscriber,
      isMonthlySubscriber: !!u.isMonthlySubscriber,
      isAdmin: isAdmin(u.email),
      createdAt: u.createdAt || null
    }));
    return res.json({ users: mapped });
  } else {
    const users = [...memUsers.values()].map(u => ({
      id: u.id, firstName: u.firstName, lastName: u.lastName,
      email: u.email, isYearlySubscriber: !!u.isYearlySubscriber,
      isMonthlySubscriber: !!u.isMonthlySubscriber,
      isAdmin: isAdmin(u.email), createdAt: u.createdAt || null
    }));
    return res.json({ users });
  }
});
app.post("/api/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: "All fields are required." });
  const entry = { name, email, message, createdAt: new Date() };
  if (contactCollection) {
    try {
      await contactCollection.insertOne(entry);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Server error." });
    }
  } else {
    memContact.push(entry);
    res.json({ success: true });
  }
});

app.post("/api/admin/messages", async (req, res) => {
  const { email } = req.body;
  if (!isAdmin(email)) return res.status(403).json({ message: "Forbidden." });
  if (contactCollection) {
    const messages = await contactCollection.find({}).sort({ createdAt: -1 }).toArray();
    return res.json({ messages });
  } else {
    return res.json({ messages: [...memContact].reverse() });
  }
});

app.post("/api/admin/grant-yearly", async (req, res) => {
  const { adminEmail, email } = req.body;
  if (!isAdmin(adminEmail)) return res.status(403).json({ message: "Forbidden." });
  if (usersCollection) {
    await usersCollection.updateOne({ email }, { $set: { isYearlySubscriber: true } });
  } else {
    for (const [k, v] of memUsers.entries()) {
      if (v.email === email) { v.isYearlySubscriber = true; memUsers.set(k, v); break; }
    }
  }
  res.json({ success: true });
});

app.post("/api/admin/revoke-yearly", async (req, res) => {
  const { adminEmail, email } = req.body;
  if (!isAdmin(adminEmail)) return res.status(403).json({ message: "Forbidden." });
  if (usersCollection) {
    await usersCollection.updateOne({ email }, { $set: { isYearlySubscriber: false } });
  } else {
    for (const [k, v] of memUsers.entries()) {
      if (v.email === email) { v.isYearlySubscriber = false; memUsers.set(k, v); break; }
    }
  }
  res.json({ success: true });
});

app.post("/api/admin/delete-user", async (req, res) => {
  const { adminEmail, email } = req.body;
  if (!isAdmin(adminEmail)) return res.status(403).json({ message: "Forbidden." });
  if (isAdmin(email)) return res.status(400).json({ message: "Cannot delete admin account." });
  if (usersCollection) {
    await usersCollection.deleteOne({ email });
  } else {
    memUsers.delete(email);
  }
  res.json({ success: true });
});

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || "c29c92dbbbc443abb04b87eead98074b";

app.get("/api/meals", async (req, res) => {
  try {
    const number = String(req.query.number || "6");
    const type = String(req.query.type || "dinner");
    const minCalories = String(req.query.minCalories || "300");
    const maxCalories = String(req.query.maxCalories || "900");
    const diet = String(req.query.diet || "");
    const intolerances = String(req.query.intolerances || "");
    const preferQuick = String(req.query.preferQuick || "1") === "1";

    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      number,
      type,
      addRecipeNutrition: "true",
      minCalories,
      maxCalories,
      sort: "random",
    });

    if (diet) params.set("diet", diet);
    if (intolerances) params.set("intolerances", intolerances);
    if (preferQuick) params.set("maxReadyTime", "30");

    const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).send(t || "Spoonacular error");
      return;
    }
    const data = await r.json();

    const results = Array.isArray(data?.results) ? data.results : [];
    const items = results.map((it) => {
      const nutrients = it?.nutrition?.nutrients;
      const calories = Array.isArray(nutrients)
        ? nutrients.find((n) => String(n.name).toLowerCase() === "calories")?.amount
        : null;

      return {
        id: it.id,
        name: it.title,
        image: it.image,
        calories: typeof calories === "number" ? calories : null,
        deliveryWindow: "Next delivery window",
      };
    });

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// POST endpoint for AI Meal Plan generation
app.post("/api/generate-meal-plan", async (req, res) => {
  const { profile, health, lifestyle, mealCount: rawMealCount } = req.body;
  const mealCount = Math.max(1, Math.min(10, parseInt(rawMealCount) || 4));
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_')) {
      return res.json({ meals: generateAlgorithmicMeals(profile, health, mealCount) });
    }

    const prompt = `You are an expert nutritionist. Create EXACTLY ${mealCount} unique, realistic, and well-balanced personalized meals for the following person:
- Age: ${profile?.age}, Gender: ${profile?.gender}, Weight: ${profile?.weight}kg
- Goal: ${profile?.goal}, Daily Calorie Target: ${profile?.calories} kcal, Macro Preference: ${profile?.macros}
- Diet Type: ${health?.diet}
- Health Conditions: ${(health?.issues || []).join(', ') || 'None'}
- Allergies / Food to Avoid: ${health?.allergies || 'None'}

Rules:
- Return EXACTLY ${mealCount} meals — no more, no less.
- Each meal must have a UNIQUE creative name (e.g. "Grilled Lemon Herb Chicken with Quinoa").
- Distribute the ${profile?.calories} daily calories intelligently across all ${mealCount} meals.
- Estimate a realistic price per meal in USD between $8 and $20.
- Do NOT include any foods from the allergies/exclusions list.
- Return ONLY valid raw JSON — no markdown, no code fences, no explanation.

JSON format:
{
  "meals": [
    {
      "mealName": "Creative Meal Name",
      "instructions": "Step-by-step preparation in 2-3 sentences.",
      "prepTime": 25,
      "price": 12.50,
      "macros": { "calories": 500, "protein": 35, "carbs": 45, "fats": 15 }
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    let mealPlan;
    try {
      let raw = response.text.trim();
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      mealPlan = JSON.parse(raw);
    } catch (parseError) {
      mealPlan = {};
    }

    if (!mealPlan.meals || !Array.isArray(mealPlan.meals)) {
      mealPlan = { meals: generateAlgorithmicMeals(profile, health, mealCount) };
    } else if (mealPlan.meals.length !== mealCount) {
      if (mealPlan.meals.length > mealCount) {
        mealPlan.meals = mealPlan.meals.slice(0, mealCount);
      } else {
        const extra = generateAlgorithmicMeals(profile, health, mealCount - mealPlan.meals.length);
        mealPlan.meals = [...mealPlan.meals, ...extra];
      }
    }

    res.json(mealPlan);
  } catch (error) {
    console.warn("⚠️ Gemini API encountered an error (e.g. 503 High Demand). Silently falling back to algorithmic generation.");
    res.json({ meals: generateAlgorithmicMeals(profile, health, mealCount) });
  }
});

function generateAlgorithmicMeals(profile, health, count = 3) {
  if (count <= 0) return [];
  const isVegan = health?.diet === 'Vegan' || health?.diet === 'Vegetarian';
  const goalRaw = (profile?.goal || 'Fit').toLowerCase();
  const GOAL_ADJECTIVES = {
    'lose': 'Lean', 'weight': 'Lean', 'slim': 'Lean', 'cut': 'Lean',
    'gain': 'Hearty', 'bulk': 'Hearty', 'muscle': 'Hearty', 'build': 'Hearty',
    'fit': 'Active', 'health': 'Nourishing', 'maintain': 'Balanced',
    'energy': 'Energy', 'boost': 'Energy'
  };
  const goalKey = Object.keys(GOAL_ADJECTIVES).find(k => goalRaw.includes(k)) || 'fit';
  const goalPrefix = GOAL_ADJECTIVES[goalKey] || 'Fresh';
  const totalCals = Number(profile?.calories) || 2000;
  const cals = Math.floor(totalCals / count);

  let proP = 0.3, carbP = 0.4, fatP = 0.3;
  if (profile?.macros === 'High Protein') { proP = 0.45; carbP = 0.35; fatP = 0.20; }
  if (profile?.macros === 'Low Carb') { proP = 0.40; carbP = 0.20; fatP = 0.40; }

  const proC = Math.floor((cals * proP) / 4);
  const carbC = Math.floor((cals * carbP) / 4);
  const fatC = Math.floor((cals * fatP) / 9);

  const proteinsVegan = ["Tofu", "Tempeh", "Lentils", "Chickpeas", "Black Beans", "Edamame", "Seitan", "Quinoa", "Hemp Seeds", "Peas"];
  const proteinsMeat = ["Chicken Breast", "Lean Beef", "Salmon", "Turkey", "Tuna", "Shrimp", "Egg Whites", "Cod", "Tilapia", "Pork Tenderloin"];
  const basesLowCarb = ["Cauliflower Rice", "Zucchini Noodles", "Mixed Greens", "Roasted Broccoli", "Spaghetti Squash", "Lettuce Cups", "Cabbage Slaw", "Radish", "Cucumber Slices", "Celery"];
  const basesStandard = ["Brown Rice", "Quinoa", "Sweet Potato", "Whole Wheat Pasta", "Farro", "Oats", "Barley", "Lentil Pasta", "Buckwheat", "Wild Rice"];

  const allergyList = (health?.allergies || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

  let filteredProteins = (isVegan ? proteinsVegan : proteinsMeat).filter(p =>
    !allergyList.some(a => p.toLowerCase().includes(a))
  );
  if (filteredProteins.length === 0) filteredProteins = isVegan ? ["Tofu"] : ["Egg Whites"];

  let filteredBases = (profile?.macros === 'Low Carb' ? basesLowCarb : basesStandard).filter(b =>
    !allergyList.some(a => b.toLowerCase().includes(a))
  );
  if (filteredBases.length === 0) filteredBases = ["Mixed Greens"];

  const actns = ["Oven bake", "Slow simmer", "Roast until golden", "Grill over medium heat", "Quick pan-fry", "Steam", "Poach", "Sauté", "Air fry", "Broil"];
  const styles = ["Bowl", "Wrap", "Salad", "Plate", "Skillet", "Stir-fry", "Bake", "Soup", "Tacos", "Casserole"];

  const basePrices = {
    "Salmon": 18, "Shrimp": 17, "Lean Beef": 16, "Cod": 15, "Tilapia": 14,
    "Chicken Breast": 13, "Turkey": 13, "Tuna": 12, "Pork Tenderloin": 12, "Egg Whites": 10,
    "Tofu": 10, "Tempeh": 11, "Seitan": 12, "Edamame": 10, "Hemp Seeds": 11,
    "Lentils": 9, "Chickpeas": 9, "Black Beans": 9, "Quinoa": 10, "Peas": 9
  };

  const meals = [];
  for (let i = 0; i < count; i++) {
    const pName = filteredProteins[i % filteredProteins.length];
    const bName = filteredBases[i % filteredBases.length];
    const aName = actns[i % actns.length];
    const sName = styles[i % styles.length];
    const prep = 20 + (i % 3) * 5;
    const price = parseFloat(((basePrices[pName] || 12) + (Math.random() * 2 - 1)).toFixed(2));

    let instruction = `${aName} the ${pName.toLowerCase()} with ${bName.toLowerCase()} and season to taste.`;

    meals.push({
      mealName: `${goalPrefix} ${pName} & ${bName} ${sName}`,
      instructions: instruction,
      prepTime: prep,
      price,
      macros: { calories: cals, protein: proC, carbs: carbC, fats: fatC }
    });
  }

  meals.sort(() => Math.random() - 0.5);
  return meals;
}

app.get("/api/generate-meal-idea", async (req, res) => {
  const { type, diet, intolerances } = req.query;
  try {
    const prompt = `Generate exactly ONE quick, realistic, healthy recipe idea for ${type || 'dinner'}.
Diet restrictions: ${diet || 'none'}, Allergies/Exclusions: ${intolerances || 'none'}.
Return ONLY valid raw JSON (no markdown, no code fences). Format:
{"name":"Recipe Name","image":"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600","instructions":"Brief 1-2 sentence recipe overview.","prepTime":20,"calories":450}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    let raw = response.text.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const meal = JSON.parse(raw);
    res.json({ items: [meal] });
  } catch (error) {
    const fallbackMeals = generateAlgorithmicMeals({ goal: 'fit' }, { diet: diet || 'Any', allergies: intolerances || 'None' }, 1);
    res.json({
      items: [{
        name: fallbackMeals[0].mealName,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop",
        instructions: fallbackMeals[0].instructions,
        prepTime: fallbackMeals[0].prepTime,
        calories: fallbackMeals[0].macros.calories
      }]
    });
  }
});

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`LyfBite running at http://localhost:${port}`);
  });
}

export default app;
