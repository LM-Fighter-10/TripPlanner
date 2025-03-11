# Trip Planner: FMCSA ELD Trip Calculator

Trip Planner is a full‑stack web application that calculates Electronic Logging Device (ELD) trip logs based on the Federal Motor Carrier Safety Administration (FMCSA) Hours‑of‑Service (HOS) regulations. The project uses the Mapbox Directions API to generate routes, reverse‑geocodes pickup/dropoff coordinates into addresses, and computes daily logs (driving, on‑duty, off‑duty, and sleeper hours) with a 24‑cell grid (each hour subdivided into 15‑minute increments). It also allows the user to select between 70‑hour/8‑day and 60‑hour/7‑day cycle options (A, B, or C) as part of the recap.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [HOS Log Calculation](#hos-log-calculation)
- [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Features

- **Route Calculation:** Uses the Mapbox Directions API to generate driving routes based on user‑provided locations.
- **Reverse Geocoding:** Converts pickup and dropoff latitude/longitude pairs into human‑readable addresses.
- **HOS Log Generation:** Computes daily logs according to FMCSA HOS regulations:
  - **Driving Time:** Up to 11 hours per day.
  - **On‑Duty Time:** Sum of driving time, fueling (0.5 hours), and pickup/dropoff (1 hour) time, capped at 14 hours.
  - **Off‑Duty Time:** Fixed at 10 hours.
  - **Sleeper Hours:** The remainder to complete a 24‑hour period.
- **24‑Cell Grid:** Displays the duty log as a grid with 24 cells (one per hour), each subdivided into 4 quarter‑hour segments.
- **Cycle Management:** Supports selection of 70‑hour/8‑day or 60‑hour/7‑day cycle options (A, B, or C) for recap calculations.
- **User-Friendly UI:** Built with React and Material‑UI with animated transitions between form and results.
- **Toast Notifications:** Provides real‑time user notifications using React Toastify.

## Project Structure

```
trip-planner/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── backend/  # Django project folder
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   └── app/  # Your Django app containing:
│       ├── views.py  # Contains proxy_mapbox and generate_log_sheets functions
│       ├── hos_calculator.py  # Contains HOS calculation logic
│       └── ...
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── TripPlanner.jsx  # Main container component
│       │   ├── TripCalculatorForm.jsx  # Form for input and submission
│       │   ├── MapApi.jsx  # Map component (using Mapbox GL)
│       │   ├── DriverLog.jsx  # Log grid component
│       │   └── Loader.jsx  # Loading indicator component
│       └── ...
├── README.md
└── .gitignore
```

## Installation

### Prerequisites

- **Python 3.8+**
- **Node.js 14+** (or later)
- **npm** or **yarn**

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone [https://github.com/yourusername/trip-planner.git](https://github.com/LM-Fighter-10/TripPlanner)
   cd trip-planner/backend
   ```

2. **Create a virtual environment and install dependencies:**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scriptsctivate
   pip install -r requirements.txt
   ```

3. **Configure Django settings:**

   - Update your `settings.py` (e.g., allowed hosts, database configuration).
   - Also, set your Mapbox secret token (or use environment variables).

4. **Apply migrations and run the server:**

   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Frontend Setup

1. **Navigate to the frontend folder:**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the React development server:**

   ```bash
   npm run dev
   ```

The React app should open automatically (typically at http://localhost:3000).

## Usage

1. **Enter Trip Details:**
   - Current Location: Latitude and longitude (e.g., `12.550343,55.665957`)
   - Pickup Location: Latitude and longitude (e.g., `12.550343,55.665957`)
   - Dropoff Location: Latitude and longitude (e.g., `12.65147,55.608166`)
   - Current Cycle Used: The number of hours already used in your current duty cycle

2. **Submit the Form:**

   - Press "Calculate Trip" (or hit Enter in any field to move to the next field).
   - The application will request route and log data from the backend, compute daily logs according to FMCSA HOS rules, and display a 24‑hour grid segmented into 15‑minute increments.

3. **View and Interact with the Results:**

   - The map will display the calculated route.
   - The Driver Log will show a grid with color‑coded statuses (Driving, Sleeper, On Duty, Off Duty).
   - Additional information (such as addresses from reverse geocoding, total mileage, remarks, and cycle summary) will be displayed.
   - Options for selecting the 70‑hour/8‑day and 60‑hour/7‑day summaries (A, B, or C) are available.

## Video

Watch the demo video to see the Trip Planner in action:

[![Watch Video](https://cdn.loom.com/sessions/thumbnails/584c3d0aab8d41248a02e8b6ec6529be-0c8f4b4990778aa8-full-play.gif)](https://www.loom.com/share/584c3d0aab8d41248a02e8b6ec6529be?sid=633273c8-7e11-4e2b-b484-6d75bc3842ec)

## API Endpoints

### `POST /proxy-mapbox/`

- **Description:** Calculates the route and generates trip logs based on input parameters.
- **Query Parameters:** 
  - `locations`: Semicolon‑separated coordinate pairs (e.g., `"lat,lng;lat,lng;..."`).
  - `cycle`: A numeric value representing the current cycle used (in hours).
  - Optionally, `pickup_location` and `dropoff_location` (as `"lat,lng"`) can be provided for reverse geocoding.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Mapbox for the mapping and geocoding services.
- FMCSA for Hours‑of‑Service regulations.
- React, Material‑UI, and Django for the frameworks and tools used.
