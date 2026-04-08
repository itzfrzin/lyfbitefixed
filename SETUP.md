# LyfBite — Setup & Usage Guide

Follow this guide to get **LyfBite** running on your machine and connect it to the AI for personalized meal planning.

---

## 1. Opening the Project

To view or edit the code for this project:

1.  **Open VS Code** (or your preferred code editor).
2.  Click **File > Open Folder...**
3.  Navigate to the `bytlife-fixed` directory and select it.
4.  To open the **terminal** inside VS Code, press ``Ctrl + ` `` (backtick) or go to **Terminal > New Terminal**.

---

## 2. Install Dependencies

Before running the server, you need to install the necessary libraries. Run this in your terminal:

```bash
npm install
```

---

## 3. MongoDB Setup

LyfBite uses **MongoDB** to store user profiles and contact messages.

> **Note:** The server creates the database and collections automatically. You do not need to create them manually.

### Steps:
1.  **Open MongoDB Compass**.
2.  Click **"New Connection"**.
3.  Use the default connection string: `mongodb://localhost:27017`.
4.  Click **"Connect"**.
5.  Keep Compass open while running the server.

---

## 4. Connecting the Gemini API (For Meal Plans)

To generate **AI-powered meal plans**, you must connect the Google Gemini API.

1.  **Get an API Key:**
    - Go to the [Google AI Studio](https://aistudio.google.com/).
    - Log in with your Google account.
    - Click **"Get API key"** and create a new key.
2.  **Add Key to LyfBite:**
    - Open the `.env` file in the project's root directory.
    - Find the line `GEMINI_API_KEY=`.
    - Paste your key after the `=` sign.
    - **Note:** Do not use spaces around the `=` sign. Example: `GEMINI_API_KEY=AIzaSy...`
3.  **How it works:**
    - Once the key is added, LyfBite uses the `gemini-3-flash-preview` model (as configured in `server.js`) to analyze your health profile, goals, and allergies to create custom meals.
    - If no key is provided, the system will fall back to a standard "algorithmic" meal list.

---

## 5. Running the Application

Once your API key and MongoDB are ready, start the server:

```bash
npm run dev
```

- **Open the App:** [http://localhost:5173](http://localhost:5173) (or the port specified in your terminal).
- **Open Admin Dashboard:** [http://localhost:5173/admin.html](http://localhost:5173/admin.html)

---

## 6. Admin Access

LyfBite comes with a pre-seeded admin account for managing users and messages.

| Field    | Default Value           |
|----------|-------------------------|
| Email    | `admin@lyfbite.com`     |
| Password | `Admin@LyfBite2026`     |

*To change these, edit the `ADMIN_EMAIL` and `ADMIN_PASSWORD` fields in your `.env` file and restart the server.*

---

## 7. Configuration (.env)

The `.env` file holds all the "secrets" and settings for the project:

| Variable             | Description                                      |
|----------------------|--------------------------------------------------|
| `GEMINI_API_KEY`     | Your Google Gemini AI key (Required for AI meals)|
| `MONGODB_URI`        | Connection string (Default: `mongodb://localhost:27017`)|
| `ADMIN_EMAIL`        | The email authorized for admin access            |
| `ADMIN_PASSWORD`     | The password for the admin account               |
| `PORT`               | The port the server runs on (Default: 5173)      |

---

## 8. Sharing & Collaborating

If you want to share this project with others:

1.  **Share the Folder:** You can zip the folder or push it to a private GitHub repository.
2.  **Important:** Do **NOT** share your `.env` file with others if it contains your private API keys. You should add `.env` to your `.gitignore`.
3.  **For Others to Access:**
    - They must have **Node.js** and **MongoDB** installed on their own computer.
    - They should create their own `.env` file. You have provided a `.env.example` file in the project folder as a template they can copy.
    - To allow someone to access your local running server from their phone or another PC on the same Wi-Fi, you would need to use your local IP address (e.g., `http://192.168.1.XX:5173`).

---

## 10. Deploying to Vercel

To host LyfBite online for free, follow these steps:

### 1. Prepare your Database (MongoDB Atlas)
Since Vercel cannot see your local computer, you need a cloud database.
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a **Free Shared Cluster**.
3. Create a **Database User** with a password.
4. Set **Network Access** to allow access from "Anywhere" (0.0.0.0/0).
5. Click **Connect > Drivers** and copy your **connection string**.

### 2. Deploy to Vercel
1. Push your project to a **GitHub** repository.
2. Go to [Vercel](https://vercel.com) and click **"Add New" > "Project"**.
3. Select your repository.
4. In **Project Settings**, open the **Environment Variables** section.
5. Add the following keys:
   - `GEMINI_API_KEY`: Your key from Google AI Studio.
   - `MONGODB_URI`: Your connection string from MongoDB Atlas.
   - `ADMIN_PASSWORD`: Your chosen admin password.
6. Click **Deploy**.

---

## 11. Troubleshooting

- **"MongoDB not available":** Ensure MongoDB Compass is connected or the `mognod` service is running.
- **AI Meals not generating:** Double-check your `GEMINI_API_KEY` in the `.env` file. Ensure you have internet access.
- **Port 5173 already in use:** Change the `PORT` in `.env` or close other running dev servers.
