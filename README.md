# Lumen: The Digital Visual Cortex

> **Bridging the gap between sight and sound with hybrid AI.**

Lumen is a mobile neural prosthetic designed to act as a secondary visual system for the visually impaired. It solves the trade-off between speed and intelligence by utilizing a novel **Hybrid Architecture** that mimics the human brain's two-system processing.

![Lumen UI](https://placehold.co/800x400/0f172a/6366f1?text=Lumen+Interface)

## 🧠 The Concept

Lumen operates on two distinct levels:

1.  **System 1 (Guardian Mode - Reflexes)**: 
    *   *Goal:* Immediate physical safety.
    *   *Tech:* Local simulation (Mocked in prototype) / Edge processing.
    *   *Behavior:* Scans for hazards (traffic, obstacles, drop-offs) and provides sub-200ms haptic and spatial audio warnings.
    
2.  **System 2 (Insight Mode - Cognition)**: 
    *   *Goal:* Deep environmental understanding.
    *   *Tech:* **Google Gemini 2.5 Flash** & **Gemini Live API**.
    *   *Behavior:* Analyzes complex scenes, reads text, and holds real-time, low-latency conversations about the video feed.

## ✨ Key Features

-   **Gemini Live Integration**: Real-time, bi-directional voice and video streaming. You can talk to Lumen while it watches your camera feed, and it responds instantly with audio.
-   **Spatial Audio**: 3D sound alerts indicating the direction of hazards (Left, Center, Right).
-   **Haptic Feedback**: Vibration patterns corresponding to hazard severity.
-   **Cyberpunk UI**: High-contrast, low-light friendly interface designed for accessibility and clarity.
-   **Privacy Focused**: Camera toggle and instant "End Session" controls.

## 🛠️ Tech Stack

-   **Frontend**: React 19, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **AI Core**: Google GenAI SDK (`@google/genai`)
-   **Audio**: Web Audio API (for spatial sound & raw PCM processing)
-   **Speech**: Web Speech API (TTS fallback) & Gemini Native Audio

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   A Google Cloud Project with the **Gemini API** enabled.
-   An API Key.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/lumen.git
    cd lumen
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

### Browser Permissions

Lumen requires access to:
-   **Camera**: To analyze the environment.
-   **Microphone**: For voice interaction in Insight Live Mode.
-   **Vibration**: For haptic feedback on mobile devices.

## 📂 Project Structure

-   `src/components/`
    -   `CameraView.tsx`: Handles video stream, canvas rendering, and visual overlays.
    -   `ControlInterface.tsx`: The main conversational UI and mode switcher.
-   `src/services/`
    -   `liveClient.ts`: Manages the WebSocket connection to Gemini Live, handling audio encoding/decoding and video frame transmission.
    -   `geminiService.ts`: Handles single-shot image analysis requests.
    -   `audioService.ts`: Manages spatial audio alerts and TTS.
-   `src/types.ts`: Shared TypeScript interfaces.

## 🎮 How to Use

1.  **Guardian Mode (Default)**:
    -   Open the app. The system immediately simulates scanning.
    -   "Hazards" will randomly appear (simulated for this demo) triggering directional audio and vibration.
    
2.  **Insight Mode (Single Shot)**:
    -   Switch to "Insight" tab.
    -   Type a question or tap "Send" to capture a photo and get a description.

3.  **Insight Mode (Live)**:
    -   In the "Insight" tab, tap the **Microphone** button.
    -   Wait for connection (Red "LIVE" badge appears).
    -   Speak naturally. Lumen sees what your camera sees.
    -   **Interrupt**: Just keep talking; Lumen handles interruptions.
    -   **Stop**: Tap the large Red Power button in the controls or the "Stop" badge in the header.

## ⚠️ Note on Latency

The **Gemini Live API** is highly optimized for low latency. However, performance depends on your network connection. 

-   **Video**: Streamed at ~1 FPS to balance bandwidth and context.
-   **Audio**: Streamed as raw 16-bit PCM @ 24kHz.

## 📄 License

MIT License.
