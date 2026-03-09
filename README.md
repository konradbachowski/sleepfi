# SleepFi — Sleep-to-Earn on Solana

> Stake SOL on your sleep. Hit your goal every night. Earn from the pool of people who failed.

Built for the **Solana Seeker hackathon** by [HeyNeuron](https://heyneuron.com).

---

## How It Works

1. **Connect** your Phantom or Solflare wallet (Mobile Wallet Adapter)
2. **Set a challenge** — choose your sleep goal (6.5–9h), duration (3/7/14 days), stake amount (min 0.05 SOL)
3. **Stake SOL** — locked in an on-chain Anchor program vault (trustless, no one can take it)
4. **Log sleep every morning** — verified automatically via Health Connect (Android only)
5. **Complete the challenge** — claim your stake back + proportional share of the reward pool
6. **Miss a night** — your stake goes to the pool, distributed to winners

### Reward Pool Model

Inspired by Moonwalk. No free bonuses from treasury — rewards come only from other challengers who failed:

- **Win** → stake back + your proportional share of all failed stakes (platform takes 5%)
- **Fail** → stake goes to the pool for winners

The more people fail, the more winners earn. Aligned incentives.

---

## Sleep Tracking Requirements

**Health Connect is required** — manual entry is not supported (trivially gameable).

To use SleepFi you need **one of these apps** installed on your Android device that writes sleep data to Health Connect:

- Samsung Health (built-in on Samsung devices)
- Sleep as Android
- Google Fit
- Garmin Connect
- Fitbit
- Polar Flow
- Any app that syncs to Android Health Connect

**How a night is counted:**
- The app reads your longest sleep session between 20:00 yesterday and 12:00 today
- If duration >= your goal → streak +1, night logged as success
- If duration < your goal → streak broken, night logged as fail
- Logs are submitted to the on-chain oracle daily

**Requirements:**
- Android 9+ (Health Connect minimum)
- Health Connect app installed (pre-installed on Android 14+, downloadable for older versions)
- A wearable that tracks sleep — smartwatch, smart ring (Oura, Galaxy Watch, Garmin, Fitbit, Whoop, etc.) or a phone-based tracker (Samsung Health with phone on the bed)
- At least one sleep-tracking app connected to Health Connect

> No wearable = no data = streak broken. Keep your device charged.

---

## On-Chain Architecture

SOL is locked in a **Program Derived Address (PDA) vault** — not a regular wallet. The Anchor program controls when and to whom it's released.

```
Program ID: 29ZkK7ivpzz6zTEyPh5grfpekJwAmWuueSRDe85xusuc (devnet)
```

**Instructions:**
- `initialize_challenge` — user stakes SOL into vault PDA
- `submit_sleep` — oracle (backend) submits verified Health Connect data on-chain
- `claim` — user claims vault after successful challenge
- `forfeit` — anyone can trigger after time expires on a failed challenge

This means: even if HeyNeuron disappears, your SOL is safe in the program vault.

---

## Stack

| Layer | Tech |
|-------|------|
| Mobile | Expo 53, React Native, Expo Router |
| Wallet | `@solana-mobile/mobile-wallet-adapter-protocol` |
| On-chain | Anchor 0.32, Solana devnet |
| Sleep tracking | `react-native-health-connect` (Android, Health Connect only) |
| Oracle/Backend | Expo API Routes (serverless) |
| Database | Neon Postgres — leaderboard + sleep record history |
| UI | Reanimated 4, Phosphor icons, custom dark theme |
| Fonts | Syne 700, DM Sans, JetBrains Mono |

---

## Screens

- **Welcome** — Connect Wallet (Phantom/Solflare via MWA)
- **Dashboard** — Streak hero number with breathing animation, weekly sleep bar chart
- **New Challenge** — Sleep goal slider (6.5–9h, shown publicly on leaderboard), duration, stake
- **Log Sleep** — Health Connect auto-fetch with refresh button
- **Rewards** — Live pool display, claim button (on-chain)
- **Leaderboard** — Top sleepers ranked by streak, goal hours visible

---

## Setup

### Prerequisites
- Node 18+
- Android device with Phantom or Solflare installed
- Health Connect + a sleep tracker app on the test device

### Install
```bash
npm install
```

### Environment
Create `.env.local`:
```
DATABASE_URL=postgresql://...your-neon-connection-string...
EXPO_PUBLIC_TREASURY_WALLET=your-oracle-wallet-pubkey
TREASURY_PRIVATE_KEY_BASE64=your-oracle-keypair-base64
EXPO_PUBLIC_API_URL=http://localhost:8081
```

### Run
```bash
npx expo run:android    # Full native build (required for MWA + Health Connect)
```

### Build APK
```bash
npx eas-cli@latest login
npx eas build --platform android --profile preview
```

---

## Treasury / Oracle Wallet (Devnet)

```
Brdg78coo8Z5qv6bmxYwGBfEgfP8fJ8nrPj7iek7y6eE
```

Acts as the oracle — signs `submit_sleep` instructions on-chain after verifying Health Connect data.

---

## Built by

**[HeyNeuron](https://heyneuron.com)** — agentive software studio, Krakow
