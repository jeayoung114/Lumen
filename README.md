# Lumen: The Digital Visual Cortex

> **Bridging the gap between sight and sound with hybrid AI.**

Lumen is a mobile neural prosthetic designed to act as a secondary visual system for the visually impaired. It solves the trade-off between speed and intelligence by utilizing a novel **Hybrid Architecture** that mimics the human brain's multi-system processing.

![Lumen UI](https://placehold.co/800x400/fff7ed/e11d48?text=Lumen+Interface)

## 🧠 The Concept: Three Systems

Lumen operates on three distinct levels of cognition:

1.  **System 1 (Guardian Mode - Reflexes)**:
    *   *Goal:* Immediate physical safety.
    *   *Behavior:* An always-on "Reflex Layer" that overlays other modes. It scans for immediate hazards (obstacles, traffic, drop-offs) and provides sub-200ms haptic and spatial audio warnings.
    *   *State:* Can be toggled ON/OFF independently of the primary mode.

2.  **System 2 (Insight Mode - Cognition)**:
    *   *Goal:* Deep environmental understanding & General Assistance.
    *   *Tech:* **Gemini Live API** (Multimodal Streaming).
    *   *Behavior:* The default conversational mode. Analyzes complex scenes, reads text, identifies objects, checks prices/nutrition via Google Search, and holds real-time conversations.

3.  **System 3 (Navigation Mode - Wayfinding)**:
    *   *Goal:* Getting from Point A to Point B.
    *   *Tech:* **Google Maps** + **Live Vision**.
    *   *Behavior:* Combines GPS routing with visual "Micro-Navigation".
        *   *Macro:* "Turn left in 50 meters." (Maps)
        *   *Micro:* "Turn left at the white post, watch out for the wet floor sign." (Vision)

## ✨ Key Features

-   **Gemini Live Integration**: Real-time, bi-directional voice and video streaming. Talk to Lumen naturally; it sees what you see.
-   **Real-Time Web Search**:
    *   **Shopping**: "How much does this cost?" (Checks prices online).
    *   **Nutrition**: "Is this healthy?" (Checks nutrition facts).
    *   **Media**: "Play a video about this." (Finds and plays content).
-   **Global Media Player**: Integrated player for YouTube videos and audio tracks found by the assistant.
-   **Spatial Audio**: 3D sound alerts indicating the direction of hazards.
-   **Hands-Free Voice Control**: Full control over modes and sessions using voice commands.

## 🎙️ Voice Command Reference

Lumen is designed to be controlled entirely by voice. Commands work even while the AI is speaking.

| Action | Voice Triggers |
| :--- | :--- |
| **Start Live Session** | "Activate session", "Start session", "Open session" |
| **End Live Session** | "End session", "Stop listening", "Turn off", "Disconnect", "Go offline" |
| **Switch to Insight** | "Insight start", "Insight mode", "Switch to Insight", "Standard mode" |
| **Switch to Navigation**| "Navigation start", "Navigate", "Switch to Navigation", "Navigation mode" |
| **Enable Guardian** | "Start Guardian", "Enable Guardian", "Guardian on", "Reflex on" |
| **Disable Guardian** | "Stop Guardian", "Disable Guardian", "Guardian off", "Reflex off" |

## 🛠️ Technical Stack

-   **Frontend**: React 19, TypeScript, Tailwind CSS (Warm/Stone Theme).
-   **AI Core**: Google GenAI SDK (`@google/genai`) - Gemini 2.5 Flash.
-   **Audio Pipeline**:
    *   **AudioWorklet**: Custom processor for non-blocking audio capture.
    *   **Client-Side VAD**: RMS-based Noise Gate to optimize turn-taking latency.
    *   **Spatial Audio**: Web Audio API for 3D hazard positioning.
-   **Geolocation**: Continuous high-accuracy GPS tracking for Navigation Mode.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18+)
-   A Google Cloud Project with the **Gemini API** enabled.
-   **Paid API Key**: Required for Gemini Live / Search features.

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
    *Alternatively, you can select your key via the in-app splash screen.*

4.  **Run the development server**
    ```bash
    npm run dev
    ```

### Browser Permissions

Lumen requires access to:
-   **Camera**: To analyze the environment.
-   **Microphone**: For voice interaction.
-   **Geolocation**: For Navigation Mode routing.
-   **Vibration**: For haptic feedback on mobile devices.

## ⚠️ Performance Note

**Latency**: The Gemini Live API is highly optimized. However, performance depends on your network connection.
-   **Video**: Streamed as JPEG frames (~2 FPS) to balance bandwidth.
-   **Audio**: Streamed as raw 16-bit PCM @ 24kHz.

## 📄 License

MIT License.
