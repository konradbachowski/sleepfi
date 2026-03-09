# SleepFi — Sleep-to-Earn on Solana

> Stake SOL on your sleep. Hit 7h every night. Earn rewards.

Built for the **Solana Seeker hackathon** by [HeyNeuron](https://heyneuron.pl).

---

## How It Works

1. **Connect** your Phantom or Solflare wallet (Mobile Wallet Adapter)
2. **Set a challenge** — goal hours (6–9h), duration (3/7/14 days), stake amount
3. **Stake SOL** — sent to treasury wallet on devnet via MWA transaction
4. **Log sleep every morning** — auto-detect via Health Connect or manual time picker
5. **Complete the challenge** — claim your stake back + 10% bonus
6. **Miss a night** — stake goes to the reward pool

---

## Stack

| Layer | Tech |
|-------|------|
| Mobile | Expo 53, React Native, Expo Router |
| Wallet | `@solana-mobile/mobile-wallet-adapter-protocol` |
| Chain | Solana devnet, `@solana/web3.js` |
| Sleep tracking | `react-native-health-connect` (Android) + manual fallback |
| Database | Neon Postgres (`@neondatabase/serverless`) |
| Backend | Expo API Routes (serverless) |
| UI | Reanimated 4, Phosphor icons, custom dark theme |
| Fonts | Syne 700, DM Sans, JetBrains Mono |

---

## Screens

- **Welcome** — Connect Wallet with pulsing orb animation
- **Dashboard** — Streak hero number (breathing animation), sleep bar chart
- **New Challenge** — Goal/duration sliders, SOL stake input
- **Log Sleep** — Health Connect auto-detect + manual time picker
- **Rewards** — Progress tracker, claim button

---

## Setup

### Prerequisites
- Node 18+
- Android device with Phantom or Solflare installed (for MWA)
- Or Android emulator for UI testing

### Install
```bash
npm install
```

### Environment
Create `.env.local`:
```
DATABASE_URL=postgresql://...your-neon-connection-string...
EXPO_PUBLIC_TREASURY_WALLET=your-treasury-wallet-pubkey
EXPO_PUBLIC_API_URL=http://localhost:8081
```

### Run
```bash
npx expo start          # QR code for Expo Go
npx expo run:android    # Full native build (required for MWA + Health Connect)
```

### Build APK
```bash
npx eas-cli@latest login
npx eas build --platform android --profile preview
```

---

## Database Schema

Neon Postgres with 3 tables:
- `users` — wallet address registry
- `challenges` — active/completed challenges with stake info
- `sleep_records` — per-night sleep logs with goal tracking

---

## Treasury Wallet (Devnet)

```
Brdg78coo8Z5qv6bmxYwGBfEgfP8fJ8nrPj7iek7y6eE
```
Funded with 2 SOL on devnet for testing.

---

## Architecture Notes

- MWA is Android-only — web and iOS fallback to mock signatures for development
- Health Connect requires Android 9+ — manual time picker available as fallback
- API routes run as Expo serverless functions (not deployed separately)
- Staking is simplified: SOL goes to treasury, backend tracks and returns after challenge

---

## Built by

**HeyNeuron** — agentive software studio, Krakow
