# VoiceChat-Proximity

⚠ **Disclaimer:** This is a Proof of Concept. Some features are missing for a usable solution.

## Overview

This project implements **real-time positional voice chat** for an **MMO** using **WebRTC** and the **Web Audio API**. It enables voice communication where volume is dynamically adjusted based on player proximity, supporting both **3D spatial audio** and **2D distance-based attenuation**.

Key components:
- **AzerothCore MMO Plugin (C++):** Sends real-time positional data via WebSocket.
- **Go Backend:** Handles **data tailoring**, **WebRTC signaling**, and serves the web client.
- **Vue/Nuxt SPA Frontend:** Displays players and manages voice connections.
- **WebRTC Voice Chat:** Direct peer-to-peer voice communication.
- **Web Audio API Processing:** Per-peer spatial audio volume calculations.

## Comparison of Approaches

### ✅ Custom WebRTC-Based Solution (This Project)
✔ **No external software required** (fully browser-based)
✔ **Supports mobile & desktop**
✔ **Easy for users to set up** (no client plugin needed)
✔ **Proximity-based volume scaling**

### 🔶 Mumble-Based Approach
✔ **Cross-platform (Windows/Linux/macOS)**
✔ **Well-established, and proven voice chat**
✖ **Requires client-side install**
✖ **Previous work depends on deprecated/archived documentation**

### ❌ Discord Proximity Chat (e.g., DiscordSRV)
✖ **Does NOT scale voice volume based on distance**
✖ **Can only move players between voice channels**

### ❌ Teamspeak-Based Approach
✖ **Requires a paid license for >30 users**

## Features

✅ **Proximity-based voice chat** (volume scales based on distance)
✅ **Supports 3D positional audio** (HRTF with Web Audio API)
✅ **WebRTC peer-to-peer connections** for low-latency communication
✅ **Server filters positional data** (players only see/hear nearby players)
✅ **Scalable state management** to limit WebRTC connections and prevent flickering

## Missing Features

- Per-peer **gain control** (fine-tuning individual player volume)
- **Mute/unmute functionality**
- **Role-based access control** (e.g., GM mode)
- **Secure authentication** (e.g., secret/token-based access)

## Tech Stack

| Tech              | Description                                      |
|-------------------|--------------------------------------------------|
| [![C++](https://img.shields.io/badge/C++-00599C?style=for-the-badge&logo=cplusplus&logoColor=white)](https://isocpp.org/) | AzerothCore MMO plugin (positional data)         |
| [![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)             | Backend (WebRTC signaling, WebSocket server)     |
| [![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vue.js&logoColor=4FC08D)](https://vuejs.org)  | Frontend (SPA with Nuxt, UI for voice chat)       |
| [![Nuxt](https://img.shields.io/badge/Nuxt-00C58E?style=for-the-badge&logo=nuxt.js&logoColor=white)](https://nuxt.com)      | SSR disabled, Vue framework                       |
| [![WebRTC](https://img.shields.io/badge/WebRTC-20232A?style=for-the-badge)](https://webrtc.org/)   | Peer-to-peer voice transmission                  |
| [![Web Audio API](https://img.shields.io/badge/Web_Audio_API-FF4500?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Spatial sound processing  |

## Mentions
Inspired by the **Mumble Positional Audio Plugin**:
- [WotLK-Mumble-Positional-Voice](https://github.com/ReynoldsCahoon/WotLK-Mumble-Positional-Voice)

Minecraft **3D Voice Chat System without mod**
- [MelodyMine](https://github.com/Vallerian/MelodyMine)

## Future Work

🛠 Completing Missing Features

🔍 Investigate Mumble Client Alternative

### 🔗 Mumble Documentation & Resources
- [Mumble Positional Audio](https://www.mumble.info/documentation/user/positional-audio/)
- [Guide to Creating a Plugin](https://www.mumble.info/documentation/developer/positional-audio/create-plugin/guide/)
- [Linux Build Instructions (Archived)](https://web.archive.org/web/20210228200327/http://wiki.mumble.info/wiki/BuildingLinux)

## How to Try It

### 🏗 Setup

1. **Clone the repository**
```sh
git clone --recurse-submodules https://github.com/sogladev/VoiceChat-Proximity.git
cd VoiceChat-Proximity
```

2. **Build and run the backend**
```sh
make
```

3. **Run a mock client** (simulates the MMO server sending positional data)
```sh
make mockclient
```

4. **Start the frontend**
```sh
bun run dev
```

### 🎮 How It Works

- The **MMO server automatically connects** and transmits player positional data.
- **Player identification is based on GUID** (default setup supports GUIDs `8` and `9`). Adjust as needed.
- Players nearby each other can **hear each other** with **real-time proximity-based voice scaling**.
