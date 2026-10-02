# 🌱 Plantora

> **“Helping You to Keep Plants Alive”**

---

## 1. 👥 Project Team

| Name | ID | Role |
|---|---:|---|
| Jannatul Bakiya | 05 | Team Leader & Project Manager |
| Ateea Benta Alamin | 11 | Backend & Database Developer |
| Marzia Hasan | 23 | API & Integration Developer |
| Labib Hasan | 24 | Frontend & UI/UX Developer |

**Team Responsibility:**
Our team is responsible for planning, designing, developing, testing, and documenting Plantora. The Team Leader manages the project plan and task distribution. All team members work together on the features, the user interface, and the final project report.

---

## 2. 🔌 APIs We Will Use

### 🌿 Plant Information / Identification API

> **Status:** `Plant Information / Plant Identification API — To Be Finalized`

An external plant-related API will be used to:

- 📸 Identify plants from uploaded images.
- 🏷️ Provide plant names and basic information.
- 🦠 Help detect or identify common plant diseases, where supported.
- 🌿 Support plant-care information.

> ⚠️ The final API has not been selected yet. Available features may vary depending on the service we choose.

### 💳 bKash Payment API

> **Status:** `Planned — Not Implemented Yet`

The system may integrate the bKash Payment API for online plant purchases.

The exact implementation will depend on:

- API availability
- Authentication
- Merchant setup
- Project requirements

---

## 3. 📖 Project Overview

**Plantora** is a web-based plant management and plant-shopping platform. It helps users **discover, identify, purchase, and take care of indoor plants**.

The system combines:

| | Component |
|---|---|
| 🌿 | Plant information |
| 📸 | Plant identification |
| 🌱 | Personal plant library |
| 🎯 | Personalized plant recommendations |
| 🛒 | Plant purchasing |
| 🔔 | Plant-care reminders |

---

## 4. 🧭 User Journey / Main Workflow

### 1️⃣ Landing Page

When a user first visits the website, they can see:

- Different plants
- Plant images
- Plant names
- Short/basic plant information
- Login / Register buttons

### 2️⃣ Login / Registration

The user can create a new account or log into an existing account.

### 3️⃣ Explore Plant Information

After entering the system, users can browse plants and see useful information such as:

- Plant name
- Light requirements
- Water requirements
- Temperature
- Humidity
- Size
- Maintenance
- Difficulty level
- Indoor suitability
- Other important care information

### 4️⃣ 📸 Plant Identification

Users can take a picture or upload an image of a plant.

The Plant Identification API will be used to:

- Identify the plant name.
- Provide available plant information.
- Identify possible diseases/problems, where supported.

> ℹ️ API capabilities may vary depending on the selected service.

### 5️⃣ 🌱 My Plants Library

Users will have a personal **“My Plants”** library. They can:

- Add plants they already own.
- View their saved plants.
- Manage their plants.
- Track care and reminder information for each plant.

### 6️⃣ 🛒 Personalized Plant Recommendation & Purchase

Users can purchase plants through the platform.

Before recommending plants, the system will ask some basic but important questions, such as:

- Available sunlight/light
- Room temperature
- Available space
- Watering availability
- How much time they can spend caring for plants
- Preferred maintenance level
- Plant size preference
- Indoor/outdoor suitability
- Experience level
- Other relevant plant-care requirements

Based on the answers, Plantora will recommend plants that match the user's environment and preferences. The user can then select and purchase a suitable plant.

### 7️⃣ 💳 Online Payment

During purchase, Plantora **may** integrate the bKash Payment API or another suitable payment gateway.

> ⚠️ This is a planned idea only. Payment integration has **not** been implemented yet.

### 8️⃣ 🔔 Plant-Care Reminders

Plantora will provide reminders for each plant. Examples:

- 💧 Watering
- 🌱 Repotting
- 🧪 Fertilizing
- ✂️ Pruning
- Other necessary plant-care activities

The user will receive a popup/reminder on the scheduled day.

### 9️⃣ 📅 Upcoming Reminder Box

A reminder box will appear on the website interface. It shows upcoming plant-care activities for about:

- The next **3 days**, or
- The next **1 week**

**Example:**

```text
───────────────────────────────
 🌱 Upcoming Plant Care       
───────────────────────────────
 Today    — 💧 Water Money Plant  
 Tomorrow — 🧪 Fertilize Rose     
 Oct 5    — 🌿 Repot Snake Plant  
────────────────────────────────
```

### 🔟 ✅ Reminder Confirmation

When a reminder appears, the user can mark it as completed using a checkbox/tick mark.

If the user ticks the reminder as completed:

- The popup for that specific reminder will **not** appear again for the same scheduled task.
- The reminder will be marked as **completed** in the user's plant library/reminder system.

---

## 5. 🔮 Optional Future Feature

### 🤖 AI Plant Care Chatbot — Future Update

> **Label:** `Future Enhancement — Not Included in Current Version`

This is an **optional** feature and is **not** part of the current core implementation.

A future chatbot could help users:

- Ask plant-care questions.
- Get personalized plant-care advice.
- Troubleshoot plant problems.
- Ask about watering, sunlight, fertilizer, pests, etc.

---

## 6. 📋 Core Features Summary

| Feature | Description | Version |
|---|---|---|
| 🌿 Plant Information | Browse plant details | Current |
| 📸 Plant Identification | Identify plants from images | Current |
| 🦠 Disease Detection | Identify possible plant diseases where the API supports it | Current |
| 🌱 My Plants | Personal plant library | Current |
| 🎯 Plant Recommendation | Recommend plants based on user requirements | Current |
| 🛒 Plant Purchase | Purchase recommended plants | Current |
| 💳 Payment | Possible bKash/API integration | Planned |
| 🔔 Reminders | Watering, fertilizer, repotting, etc. | Current |
| 📅 Upcoming Care | View upcoming 3-day/1-week tasks | Current |
| 🤖 Chatbot | Optional future feature | Future |

---

---

🌱 *Plantora — Helping You to Keep Plants Alive*