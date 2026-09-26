# Enigma — Chatpata Gang 🌶️

## 👥 Team Name & Members

**Team Name:** Chatpata Gang

**Team Members:**

* Rishikesh Mudaliyar
* Mayank More
* Meet Mourya
* Alok Khatri

---

## 🎯 Problem Statement

Food allergies can become a serious health concern when people unknowingly consume products containing ingredients that may trigger their allergies. Checking every grocery product manually can be difficult, especially when ingredient lists are long, complicated, or difficult to understand.

Our solution is a platform that allows users to create **personalized allergy profiles for their family members**. Users can add the allergies or ingredients that each family member needs to avoid. When purchasing groceries, the platform can scan or analyze product information and check it against the user's allergy profile.

The system helps users quickly identify potentially unsafe products and make more informed food choices, reducing the chances of accidental exposure to known allergens.

---

## 🛠️ Tech Stack

### Frontend

* **React.js** — Building the user interface
* **TypeScript** — Type-safe development
* **Vite** — Frontend development and build tool
* **Tailwind CSS** — Styling and responsive UI
* **Axios** — API communication
* **React Router** — Application navigation
* **Tesseract.js** — OCR for extracting text from product/receipt images
* **HTML5 QR Code** — Barcode/QR-code scanning
* **Lucide React** — Icons

### Backend

* Backend API for processing product information, allergy profiles, and application logic.

### Data

* **GTIN Product Dataset (CSV)** — Product identification and information
* Product/receipt image processing for extracting relevant information.

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Rishap6/Enigma_Chatpata-gang.git
cd Enigma_Chatpata-gang
```

### 2. Setup the Frontend

Open a terminal and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start using the Vite development server.

### 3. Setup the Backend

Open another terminal and navigate to the backend directory:

```bash
cd backend
```

Install the required backend dependencies according to the project's dependency file.

Then start the backend server using the project's backend entry point.

### 4. Run the Application

Make sure both the **frontend and backend servers are running**.

Open the local URL provided by Vite in your browser and start using the application.

---

## 💡 Core Idea

**Add allergies → Scan/check a product → Analyze ingredients → Compare with family allergy profiles → Get a safety warning**

The goal is to make everyday grocery shopping **safer, faster, and easier for families dealing with food allergies**.
