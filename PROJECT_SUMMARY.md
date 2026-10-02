# Plantora - Project Summary

## Overview
Plantora is a web-based plant management and plant-shopping platform that helps users discover, identify, purchase, and take care of indoor plants.

## Team
- **Jannatul Bakiya** (ID: 05) - Team Leader & Project Manager
- **Ateea Benta Alamin** (ID: 11) - Backend & Database Developer
- **Marzia Hasan** (ID: 23) - API & Integration Developer
- **Labib Hasan** (ID: 24) - Frontend & UI/UX Developer

---

## Features Implemented

### 1. Landing Page (index.html)
- Hero section with plant visual
- Features grid (4 cards)
- How it works (3-step process)
- Final CTA section
- Responsive navbar with logo and navigation links

### 2. Explore Plants (explore.html)
- Search plants by name
- Filter by: Light, Water, Maintenance, Size, Indoor Suitability
- Dynamic filter options populated from plant data
- Plant cards with image, name, scientific name, key requirements
- Real-time filtering and search

### 3. Plant Details (plant-details.html)
- Plant hero with image and description
- Requirements grid (8 fields: Light, Water, Humidity, Temperature, Space, Maintenance, Difficulty, Indoor Suitability)
- About This Plant section
- Care Guide (Watering, Fertilizing, Repotting, Cleaning)
- Indoor Suitability banner
- "Add to My Plants" button (prototype)

### 4. Authentication System (auth.js)
**Firebase Authentication with Email/Password**
- Login page (login.html) - email/password form
- Register page (register.html) - name, email, password, confirm password
- Real Firebase project: `plantora-87936`
- Session management via sessionStorage
- Auto-bind to existing forms (#login-form, #register-form)

**Route Protection**
- `dashboard.html` - protected (requires login)
- `my-plants.html` - protected (requires login)
- Other pages accessible without login
- Redirect preservation with `?redirect=` parameter

**Navbar User Profile**
- Logged out: "Get Started" button → login page
- Logged in: User name + 👤 icon dropdown
  - Shows user email in dropdown header
  - Logout button with 🚪 icon
- Auto-closes on outside click
- ARIA accessible

### 5. Dashboard (dashboard.html)
- Welcome hero with "Find My Plant" CTA
- Quick Actions grid (4 cards)
- My Plants summary (3 sample plants with status)
- Upcoming Care list (3 sample reminders)
- Recommendation banner
- Plant Care Knowledge topics
- Explore Plant Library CTA

### 6. My Plants (my-plants.html)
- Page header with "Add Plant" button (prototype)
- Plant cards grid (3 sample plants)
- Status pills (Healthy / Needs Water)
- "Keep Your Plants Healthy" section with action cards

---

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Authentication**: Firebase Auth (Email/Password)
- **Data**: JSON file (Data/plants.json) with 20 plants
- **Fonts**: Google Fonts (Fraunces for headings, Inter for body)
- **Icons**: Emoji-based (no external icon library)

---

## Project Structure
```
Plantora/
├── index.html              # Landing page
├── explore.html            # Browse plants with search/filter
├── plant-details.html      # Detailed plant view
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # User dashboard (protected)
├── my-plants.html          # User's plant collection (protected)
├── style.css               # Shared theme & landing page styles
├── explore.css             # Explore & plant-details styles
├── script.js               # Plant data, explore page, plant details
├── auth.js                 # Firebase authentication
├── Data/
│   └── plants.json         # 20 plants with care info
└── image/
    ├── snake-plant.jpg
    └── hero-plant.jpg
```

---

## Plant Data (20 Plants)
1. Snake Plant - Very Low light/water, Very Easy
2. ZZ Plant - Very Low light/water, Very Easy
3. Money Plant (Pothos) - Low light, Medium water, Very Easy
4. Spider Plant - Medium light/water, Easy
5. Peace Lily - Low light, High water, Moderate
6. Rubber Plant - Medium light/water, Moderate
7. Monstera Deliciosa - Medium light/water, Moderate
8. Heartleaf Philodendron - Low light, Medium water, Easy
9. Chinese Evergreen - Low light, Medium water, Easy
10. Lucky Bamboo - Low light, Very High water, Easy
11. Boston Fern - Medium light, High water, Hard
12. Areca Palm - High light/water, Hard
13. Parlor Palm - Low light, Medium water, Easy
14. Aloe Vera - High light, Low water, Easy
15. Golden Barrel Cactus - Very High light, Very Low water, Moderate
16. Christmas Cactus - Medium light/water, Moderate
17. Zebra Haworthia - Medium light, Low water, Easy
18. Moon Cactus - High light, Very Low water, Moderate
19. Bunny Ears Cactus - Very High light, Very Low water, Moderate
20. Echeveria - Very High light, Low water, Moderate

---

## Git History (Recent Commits)
| Commit | Message |
|--------|---------|
| 5368452 | Fix quote escaping in auth.js |
| 05fccf4 | Add user profile dropdown to navbar |
| 04fdd92 | Remove prototype login/register scripts |
| 599efa2 | Configure Firebase project credentials |
| 82a4d00 | Integrate auth.js across all pages |
| 2b036db | Add Firebase Auth (auth.js) |
| 0d4d633 | Update plant image paths |
| ec865fe | Add plant images and update image paths |

---

## Setup Instructions

### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project: `plantora-87936` (already configured)
3. Authentication → Sign-in method → Enable "Email/Password"
4. Authorized domains: Add `localhost` and your deployment domain

### Local Development
```bash
# Serve locally (required for Firebase Auth)
npx serve
# OR use VS Code Live Server extension
```

### Deployment
- Works on any static hosting (Netlify, Vercel, Firebase Hosting, GitHub Pages)
- Ensure Firebase authorized domains includes your deployment URL

---

## Future Enhancements (Planned)
- Plant Identification API integration
- bKash Payment API for plant purchases
- AI Plant Care Chatbot
- Real-time notifications for care reminders
- Plant disease detection
- Social features (plant sharing, community)

---

*Last updated: $(date)*
*Project: Plantora - "Helping You to Keep Plants Alive"*