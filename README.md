# NFSU Delhi - University Attendance Management System (UAMS)

A premium, production-grade Attendance, Faculty Auditing, and Compliance Analytics platform engineered specifically for the **National Forensic Sciences University (NFSU), Delhi Campus**.

This application is built with a highly polished and minimal responsive interface, ensuring a costly, commercial-grade user experience. All developer testing systems, simulated logs, and technical configuration details are kept off-screen for end-users, consolidated exclusively here.

---

## 🏛️ Architectural Overview

UAMS uses a hybrid full-stack design optimized for rapid loading times, zero-latency desktop interaction, and responsive mobile viewport adaptation.

### 💻 Frontend Architecture (React 19 + Tailwind CSS)
*   **Modular Layout Pattern**: Custom decoupled view structures prevent large-file token issues.
*   **Responsive Viewport Sensing**: Uses active window resize event handlers to dynamically parse the target device.
    *   **Desktop Layout**: Renders clean, spacious sidebar drawers, dense administrative grids, and interactive SVG/Recharts compliance charts.
    *   **Mobile Layout (for native wrapper or APK viewports)**: Adapts instantly to a minimal, mobile-app view with a `fixed bottom-0` navigation bar pinned to the screen at all times.
*   **Official Design Identity**: Employs classical typography (Cinzel & Outfit displays) paired with modern layout scaling (Inter body). Color branding reflects the prestigious high-contrast Slate Deep & Polished Gold university accents.

### ⚙️ Backend Architecture (Express + TS Companion Proxies)
*   **Dual Mode Inception**: Runs Vite integration middleware natively in development and statically serves production files post-bundle.
*   **Secure Biometric API Handshakes**: Houses local REST routes for core entities (Departments, Batches, Faculty, Scholars) and manages database state changes.
*   **Single-Execution CJS compiler**: Compiles TypeScript backend files using `esbuild` directly into a singular, lightning-fast, production-grade `dist/server.cjs` bundle, avoiding Node relative path bottlenecks.

---

## 🔑 Authorized Sessional Credentials (SSO Bypass)

For rapid evaluation and testing, the login screen includes a collapsed **Institutional Demo Portals** utility under the login card. When expanded, simply click on any profile to instantly autofill the form with active sessional keys. 

Alternatively, you can manually enter these credentials into the Central Directory form:

| Institutional Role | Email ID | Access Password | Sessional Authorization Details |
| :--- | :--- | :--- | :--- |
| **Campus Director (Admin)** | `director.delhi@nfsu.gov.in` | `admin123` | Master oversight over batches, courses, and overall campuses compliance ratios. |
| **Dean Faculty (Professor)** | `raj.sharma@nfsu.gov.in` | `teacher123` | Coordinates lecture directories, marking attendance, and auditing logs. |
| **M.Sc. Scholar (Student)** | `kartik.ranjan.msc@nfsu.gov.in` | `student123` | Personal overall compliance ratios, schedules trackers, and biometric notifications. |

---

## 🛠️ Local Testing Instructions

Follow these instructions to boot the application in your local development workspace:

### 1. Verification of Dependencies
Ensure package trees are aligned before launching development environments:
```bash
# Install standard NPM components
npm install
```

### 2. Launch Local Dev Server
UAMS must run exclusively on port `3000` for public alignment:
```bash
# Boot the combined Express + Vite dev terminal
npm run dev
```
Once booted, access the client through your browser at:
👉 **`http://localhost:3000`**

---

## 🚀 Production Build & Deployment Guidelines

Deploying UAMS to an enterprise environment (e.g., Google Cloud Run, AWS App Runner, VPS container cluster) is completed in three standardized steps.

### Step 1: Compiling Frontend & Bundling Backend
Compile Vite assets and bundle the TypeScript server using Node's native stripped format targets:
```bash
# Triggers standard Vite building & ESBuild server bundling
npm run build
```
This script compiles client views into static production assets at `./dist` and bundles backend TypeScript processes into a clean, standalone `dist/server.cjs` companion file.

### Step 2: Executing Standalone Service
Run the compiled containerized NodeJS application without development dependencies:
```bash
# Boots the standalone bundled server on port 3000
npm run start
```

### Step 3: Containerization via Dockerfile (Optional)
To deploy as a permanent Cloud service, wrap inside a standard sandboxed container:
```dockerfile
# Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

---

## 📱 Official Mobile Client APKs for Testing
To test the mobile app views natively on physical devices, users can click the **Download Android Client (APK)** buttons directly from the landing web page.
*   This triggers a download containing installation config, target secure host anchors, and compilation packaging signatures representing the native Android package.
*   Once downloaded, transfer to Android smart devices (SDK 26+), allow Installation of Unknown Apps, and launch!

---
*UAMS Academic DevOps Division • National Forensic Sciences University, Ministry of Home Affairs, Government of India*
