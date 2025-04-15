# Voice AI Next.js Demo

This is a Next.js port of the [botany-labs/voice-ai-js-starter](https://github.com/botany-labs/voice-ai-js-starter) demo, rebuilt using Next.js and NextUI components.

## Features

- Real-time voice communication with AI
- Voice Activity Detection (VAD) for natural conversation flow
- Multiple AI assistants to choose from (fastest, best-quality, or OpenAI)
- Responsive UI built with NextUI components

## Prerequisites

- Node.js 18 or later
- Running voice-ai server (from the original [botany-labs/voice-ai-js-starter](https://github.com/botany-labs/voice-ai-js-starter) repository)

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Make sure the voice-ai server is running on `ws://localhost:8000`
4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
NEXT_PUBLIC_SERVER_WS_URL=ws://localhost:8000
```

## Technology Stack

- [Next.js](https://nextjs.org/)
- [NextUI](https://nextui.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [VAD (Voice Activity Detection)](https://github.com/ricky0123/vad-web)

## License

This project is licensed under the same terms as the original [botany-labs/voice-ai-js-starter](https://github.com/botany-labs/voice-ai-js-starter).
