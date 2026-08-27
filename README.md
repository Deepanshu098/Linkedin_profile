# LinkedIn Profile API Scraper

A robust, hosted REST API built with **NestJS** and **TypeScript** that accepts a public LinkedIn profile URL and returns normalized structured JSON.

This solution is **purely reverse-engineered and runs entirely over direct HTTP requests**. It does not use Puppeteer, Playwright, Selenium, or any browser automation. It connects directly to LinkedIn's private Voyager API endpoints, ensuring maximum speed, minimal resource footprint, and zero dependency on a heavy browser engine.

---

## Architecture Overview

```
                    ┌─────────────────────────┐
                    │         Client          │
                    │   POST /api/v1/profile  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    NestJS Controller    │
                    │  DTO Validation (Regex) │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     ProfileService      │
                    │   - URL Parsing         │
                    │   - In-Memory Caching   │
                    │   - Provider Selection  │
                    └────────────┬────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
                   ▼                           ▼
        ┌────────────────────┐       ┌────────────────────┐
        │  VoyagerProvider   │       │    MockProvider    │
        │  (Direct HTTP API) │       │ (Fallback Mode if  │
        │  Uses li_at cookie │       │  no keys provided) │
        └────────────────────┘       └────────────────────┘
```

### Pluggable Provider Pattern
To make this API easily testable by the hiring committee without requiring immediate configuration, the application utilizes the **Provider Pattern**:
1. **Voyager Provider**: Active when `LINKEDIN_LI_AT` and `LINKEDIN_JSESSIONID` are supplied in the environment. It executes direct HTTP queries using browser headers and CSRF tokens against the private Voyager endpoint: `https://www.linkedin.com/voyager/api/identity/profiles/{username}/profileView`.
2. **Mock Fallback Provider**: Active by default when no credentials are configured. It generates rich, deterministic, structured profiles based on the input URL username. This ensures the API works **out-of-the-box** for evaluation without configuration blockages.

---

## Features

- **Direct HTTP scraping**: Pure reverse-engineered client (`@nestjs/axios`) bypassing headless browsers completely.
- **Strict Input Validation**: Regular-expression-based validation enforcing `/in/` public profile URLs, rejecting company pages, job pages, and malicious strings.
- **In-Memory Caching**: Caches responses with a 1-hour TTL to prevent repetitive LinkedIn API requests for identical profiles, protecting credentials against rate limits.
- **Global Error Handling**: Standardized, clean API response bodies for all errors (400, 404, 502, etc.).
- **Live Swagger Documentation**: Accessible OpenAPI 3.0 docs showing schema shapes and example payloads.
- **Dockerized Ready**: Containerized build with Docker and Docker Compose.
- **Health Probes**: Exposes `/health` to return system metrics and uptime, enabling seamless zero-downtime deployment checks on cloud providers like Render, Railway, or Fly.io.

---

## API Documentation

### 1. Scrape Profile
- **Endpoint**: `POST /api/v1/profile`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "url": "https://www.linkedin.com/in/williamhgates"
  }
  ```
- **Response Schema (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "profileUrl": "https://www.linkedin.com/in/williamhgates",
      "name": "Bill Gates",
      "firstName": "Bill",
      "lastName": "Gates",
      "headline": "Co-chair, Bill & Melinda Gates Foundation",
      "location": {
        "city": "Seattle, Washington",
        "raw": "Seattle, Washington"
      },
      "about": "Co-chair of the Bill & Melinda Gates Foundation...",
      "profileImage": "https://media.licdn.com/dms/image/...",
      "backgroundImage": "https://media.licdn.com/dms/image/...",
      "experience": [
        {
          "company": "Bill & Melinda Gates Foundation",
          "title": "Co-chair",
          "location": "Seattle, WA",
          "period": {
            "startDate": "2000-01",
            "endDate": null
          },
          "description": "Working together to help all people lead healthy, productive lives."
        }
      ],
      "education": [
        {
          "school": "Harvard University",
          "degree": "Dropped out",
          "fieldOfStudy": "Pre-Law and Mathematics",
          "period": {
            "startDate": "1973",
            "endDate": "1975"
          }
        }
      ],
      "skills": ["Philanthropy", "Software Development", "Leadership"],
      "certifications": [],
      "languages": []
    },
    "meta": {
      "source": "linkedin_voyager",
      "fetchedAt": "2026-08-27T12:00:00Z"
    }
  }
  ```

### 2. Swagger Documentation
- **Endpoint**: `GET /docs`
- Accessible via browser once the server is running. Shows visual interactive testing utilities.

### 3. Health Check
- **Endpoint**: `GET /health`
- Exposes uptime and timestamp to monitor node container health.

---

## Setup & Local Installation

### Prerequisites
- Node.js (v18+) or Docker installed.

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd linkedin-profile-api-scraper
   ```

2. **Configure Environment variables**:
   Create a `.env` file from the provided example:
   ```bash
   cp .env.example .env
   ```
   If you leave `LINKEDIN_LI_AT` and `LINKEDIN_JSESSIONID` empty, the system automatically uses the **Mock Provider** so you can test endpoints instantly.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Application**:
   - Development Mode: `npm run start:dev`
   - Production Mode: `npm run build && npm run start:prod`
   The API will boot on: `http://localhost:3000`

---

## Running with Docker

You can containerize the server to deploy it easily.

### Docker Compose
Run the app in detached mode:
```bash
docker-compose up -d --build
```
This mounts the variables inside `.env` directly and maps port `3000` to the host system.

---

## How to Get LinkedIn Voyager Cookies

LinkedIn's Voyager API is internal and authenticated via browser session cookies. Follow these steps to obtain them:

1. Log into your LinkedIn account in your web browser (Chrome/Firefox).
2. Right-click anywhere and select **Inspect** to open Developer Tools.
3. Navigate to the **Application** (Chrome) or **Storage** (Firefox) tab.
4. Expand **Cookies** on the left menu and select `https://www.linkedin.com`.
5. Locate and copy the values for:
   - **`li_at`**: The main login session identifier (usually a long alpha-numeric string).
   - **`JSESSIONID`**: The CSRF session token (usually enclosed in double quotes, starting with `ajax:...`).
6. Paste these into your `.env` file as:
   ```env
   LINKEDIN_LI_AT=YOUR_COPIED_LI_AT_VALUE
   LINKEDIN_JSESSIONID="YOUR_COPIED_JSESSIONID_VALUE"
   ```

---

## Technical Approach & Engineering Decisions

1. **Pure Voyager API Client**:
   Instead of using heavy tools like Puppeteer/Playwright which consume significant RAM/CPU, we reverse-engineered the native headers and payload schema LinkedIn uses internally. We extract the CSRF token and attach it to both the `Cookie` string and the `Csrf-Token` header.
2. **Pluggable Architecture**:
   Decoupling profile fetching from normalization into a standard `ProfileProvider` interface ensures that if LinkedIn changes its Voyager API, we can modify or replace the provider class without affecting the public-facing API controllers or tests.
3. **In-Memory Caching**:
   We implemented an in-memory cache on the `ProfileService`. If a profile is queried multiple times, it is served from the cache, preventing account bans and saving compute cycles.
4. **Vector Image Resolving**:
   LinkedIn stores images as dynamic vector resolutions (`VectorImage`). Our custom mapper extracts the root URL and finds the highest-resolution artifact parameters dynamically to return the best-quality profile picture.

---

## Limitations

- **Session Expiration**: Cookies (`li_at`) have an expiration date. Once expired, the server will return a `401 Unauthorized` response, requiring the `.env` configuration to be updated.
- **Account Flagging Risk**: The Voyager API is unofficial. Making high-frequency automated requests using your session cookie risks getting your account restricted or flagged. Caching helps mitigate this risk, but it is not recommended for high-volume enterprise traffic. For commercial projects, a partner developer contract or third-party proxy provider is required.
