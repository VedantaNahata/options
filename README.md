# FnoPilot

FnoPilot is a trading analytics dashboard I built to make options data easier to understand and act on. The idea was simple: bring together option-chain data, Greeks, strategy building, and risk analysis into one interface that feels fast and practical instead of overwhelming.

This project is a portfolio piece, not just a demo. It was shaped around the workflow I actually wanted as a trader: scan the market, inspect option flows, build strategies, and understand risk before making a decision.

## Why I built it

Most tools in this space are either too basic or too cluttered. I wanted a cleaner experience where the user can:

- scan option-chain data quickly
- understand liquidity and concentration through OI and PCR signals
- build multi-leg strategies visually
- review Greeks and payoff behavior before execution
- keep track of portfolio-level risk without leaving the dashboard

This became a full-stack product idea: a frontend for the trading experience and a backend that integrates with market data and authentication flows.

## What it does

- Options chain exploration with live-ish market data support
- Strategy editor for multi-leg positions
- Payoff visualization and analysis
- Portfolio Greeks and scenario-style risk review
- Auth flow for signed-in users and saved strategy state
- Backend API for serving market-data and trading-related logic

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind, Framer Motion
- Backend: FastAPI, Python
- Data/auth integration: Supabase, Groww API integration, environment-based secrets
- UI patterns: glassmorphism dashboard styling, interactive strategy panels, reusable components

## Project structure

- backend/: FastAPI service that handles market data requests and auth flow
- frontend/: Next.js application with the dashboard, auth screens, option-chain explorer, and strategy tooling
- README.md: project overview and setup notes

## How it works

The frontend is designed around a clean market-analysis workflow. Users can move from the option chain into strategy building, inspect how the position behaves under different scenarios, and understand the risk profile before sizing a trade.

The backend acts as a bridge layer: it handles market requests and keeps sensitive credentials out of the client. This keeps the app closer to a realistic product architecture instead of a single-page mockup.

## Local setup

1. Clone the repo.
2. Create the environment files from the examples.
3. Install the frontend dependencies and backend dependencies.
4. Start the backend and frontend separately.

### Backend

From the backend folder:

python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

Then copy the sample env file and fill in your values:

cp .env.example .env

### Frontend

From the frontend folder:

npm install
cp .env.example .env.local
npm run dev

## Security note

This project keeps API keys and trading credentials in environment variables. Do not commit real secrets into the repository. The example files are intentionally placeholder-only and are safe to include in version control.

## What I learned

I built this project to think like a product engineer, not just a developer following a tutorial. The biggest lessons were:

- connecting real market data to a user-facing dashboard is more than rendering tables
- API auth and caching have to be handled carefully in production-like workflows
- strategy analysis becomes much more useful when it is paired with clearer UX and faster feedback loops
- good portfolio work is not just about showing features; it is about making a real use case feel coherent and decision-ready
