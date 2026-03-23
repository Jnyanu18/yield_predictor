# AgriVision (BeeGuard AI / Agri Pro): Comprehensive Project Documentation

This document provides a complete, exhaustive explanation of the **AgriVision** platform. It outlines the master objectives, the deep technical architecture, the detailed breakdown of every feature, the interaction flows, and the data models. This guide can serve as the primary source material for a thesis, research paper, or technical manual.

---

## 1. Project Objectives
The primary objective of AgriVision is to bridge the gap between advanced artificial intelligence and practical, day-to-day farming. Specifically, it aims to:
- **Democratize Agronomic Expertise:** Provide localized, AI-generated crop health and yield analysis without requiring farmers to hire expensive consultants.
- **Optimize Harvest Timing:** Predict the exact temporal window for harvesting to maximize yield weight and quality.
- **Mitigate Post-Harvest Losses:** Offer localized storage condition models that inform farmers exactly how long they can safely store their produce.
- **Maximize Financial Returns:** Forecast local market prices to recommend the most profitable date to sell, shielding farmers from market volatility.
- **Provide Actionable Resilience:** Calculate local risk matrices (pest risks, spoilage risks, weather delays) to preemptively save crops.

---

## 2. Technical Architecture Overview

AgriVision is designed as a modern, decoupled Monorepo containing two discrete applications working in tandem:

### 2.1 Frontend (Client)
- **Core Framework:** React 18 built with **Vite** for optimized assets and exceptionally fast hot-module reloading.
- **UI & Styling:** **Tailwind CSS** combined with **Radix UI** primitives and `shadcn/ui` for accessible, polished components (Slider, Sheet, Tabs, Collapsibles).
- **State Management:** **Zustand** is used for global application state, handling complex app controls (farm parameters, environmental toggles).
- **Data Visualization:** **Recharts** translates complex AI yield curves and price forecasts into understandable graphs.
- **Form Handling & Validation:** `react-hook-form` paired with `zod` schema resolvers enforce rigorous input validation before data touches the backend.
- **Internationalization:** `react-i18next` ensures the software can localize into regional farmer dialects.

### 2.2 Backend (Server)
- **Core Framework:** **Node.js** with **Express.js**, acting as a robust RESTful API gateway.
- **Database:** **MongoDB**, managed via **Mongoose**. Highly normalized schemas separate `CropAnalysis`, `FarmerProfile`, `MarketPrediction`, `HarvestPlan`, `DiseasePrediction`, and `IrrigationRecommendation`.
- **AI Orchestration Layer:** Custom utility pipelines that dynamically route requests to:
  - **Gemini 2.0 Flash:** Primary multimodal engine for image detection and generative text.
  - **Groq & Ollama:** Secondary/fallback vision APIs ensuring high availability.
  - **Genkit:** Google's AI framework, specifically used for scaffolding the Chat Advisor flows and orchestrating conversational states.
- **Security:** Standard JWT implementation passing through HTTP-only cookies, combined with localized bcrypt hashing and strict CORS policies.

---

## 3. Exhaustive Feature Breakdown

### 3.1 Profile & Farm Parameter Controls (Inputs Sheet)
- **Functionality:** A persistent sliding sheet allows farmers to input real-time parameters defining their farm.
- **Data Points:** Farm size (Acres), District (e.g., Coimbatore), crop type hints, average crop weight (grams), estimated post-harvest loss percentage (%), and total plants.
- **Impact:** These inputs are not static; they directly mutate the mathematical equations powering the Yield and Profit tabs.

### 3.2 Detection & Monitoring (Crop Analysis)
- **Core Action:** A farmer uploads a snapshot of their crop canopy from their smartphone.
- **AI Vision Pipeline:** The image is translated natively to base64 and pushed to the backend. The backend prompts Gemini or Groq to map the image against strict JSON parameters.
- **Data Extracted (Metrics):**
  - **Growth Stage Identification:** Identifies if the crop is in seedling, vegetative, flowering, fruit development, ripening, or harvest-ready stages.
  - **Stage Counts:** Counts the absolute number of fruits/nodes in *mature*, *ripening*, and *immature* statuses.
  - **Health Scoring Calculation:** Evaluates Leaf Color Score, Fruit Density Score, and Growth Stage Consistency to derive an overall percentage Health Score (e.g., 86% Healthy).
- **Fallback Mechanism:** Should network constraints trigger API failures, a deterministic fallback algorithm mathematically simulates observations to prevent UI freezing.

### 3.3 Yield Forecasting (AI Yield Curve)
- **Functionality:** Extrapolates the raw visual counts from the Detection tab into a timeline.
- **Yield Curve Generation:** Using the detected stage counts and the user-defined `numPlants` and `avgWeightG`, the backend generates a multi-day timeline indicating exactly how many kilograms of crop will become mature on future dates.
- **Visuals:** An Area Chart maps date vs. Kilograms. 
- **AI Reasoning:** The system explains *why* the shape looks the way it does (e.g., "Due to a high volume of immature fruits, the peak yield will occur on Day 12").

### 3.4 Harvest Timing Forecast
- **Functionality:** Based on the Yield Curve, the application defines a specific "Harvest Window" (e.g., "Starts in 14 days").
- **Local Risk Matrix:** Evaluates immediate threats. For instance, if >5 fruits are already marked as mature but not harvested, the AI triggers an "Elevated Spoilage Risk" alert advising a harvest within 48 hours.

### 3.5 Market Forecasting & Profit Simulation
- **Functionality:** Predicts future local market prices up to 30 days ahead based on the selected District.
- **Revenue Calculation:** Multiplies the total projected *sellable* yield (Expected Yield minus the Post-Harvest Loss Input) by the forecasted optimal price.
- **Scenario Simulator:** A highly interactive Slider allows farmers to stress-test their projected revenue against market volatility—simulating a 30% price boom or a 30% price crash, recalculating the INR profit live.

### 3.6 Storage Advisor
- **Functionality:** A mathematical modeling tool for post-harvest logistics.
- **Parameters:** Farmer inputs their warehouse temperature (°C), Humidity (%), and total warehouse capacity (kg).
- **Equation:** The engine queries baseline optimal parameters for specific crops (e.g., Apple: 2°C, 90% humidity; Tomato: 18°C, 85% humidity). It calculates a deviation penalty matrix.
- **Output:** Returns exact "Safe Storage Days". Will output warnings if the temperature delta is so high that produce will spoil within days, along with a calculation of "Capacity Left".

### 3.7 Conversational AI (Crop Advisor Chat)
- **Functionality:** An integrated GenAI assistant tailored to the specific user's active context.
- **Context Injection:** When a user asks "How can I increase the yield?", the chat doesn't just give generic advice. It receives the `appState` (Detection results, Market forecasts, Farm size) in the background. It formulates a reply based on *their specific tomatoes* and *their specific risk matrix*.
- **Suggested Prompts:** Offers dynamic quick-prompts to bridge the digital literacy gap.

### 3.8 Reporting and Export
- **Report Generation:** Compiles the Detection Status, the Yield Timeline, the Safe Storage limits, and the Local Risk Matrix into a cleanly formatted, printable browser view. This allows extension officers to distribute physical copies to remote villages securely.

---

## 4. Key Data Models (Mongoose Schemas)
- `CropAnalysis`: Captures `userId`, `imageUrl` (hosted externally), `cropType`, `fruitCount`, array of `stages`, `healthScore`, and raw AI textual summaries.
- `MarketPrediction`: Captures `district`, `commodity`, `predictedPrices` (arrays of Date & Rate), `confidenceScore`.
- `YieldPrediction`: Joins `CropAnalysis` ID with projected `dailyOutputs` (array) and `totalExpectedYield`.
- `DiseasePrediction`: Captures `riskLevel`, `disease` names, and generative `explanation` text for potential pathogenic threats.

---

## 5. Security & Deployment Ecosystem
- **Vercel / Next-Gen Hosting:** Designed to effortlessly deploy frontends to edge networks, minimizing latency globally.
- **Cross-Origin Resourcing:** Advanced backend configuration ensures API routes securely process payloads strictly from authorized client endpoints.
- **Image Handling:** Base64 streams limit server memory exhaustion while integrating natively with external bucket environments (Firebase Storage/Cloudinary).

---

## Conclusion
AgriVision shifts the paradigm of precision agriculture from large-scale commercial operations down to smallholder farmers. By synthesizing multimodal AI detection with economic forecasting and logistical storage tracking, the platform provides an all-encompassing suite to secure, manage, and scale rural crop production.
