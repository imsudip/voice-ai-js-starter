'use client';

import { useState, useRef, useEffect } from "react";
import * as vad from "@ricky0123/vad-web";
import EventEmitter from "events";
import { Button, Select, SelectItem } from "@nextui-org/react";
import React from "react";

const SERVER_WS_URL = process.env.NEXT_PUBLIC_SERVER_WS_URL ?? "ws://localhost:8000";

const START_LISTENING_TOKEN = "RDY"; // Sent by server to indicate start VAD
const END_OF_SPEECH_TOKEN = "EOS"; // End of speech on client side
const INTERRUPT_TOKEN = "INT"; // Interrupt reported from client side
const CLEAR_BUFFER_TOKEN = "CLR"; // Clear playback buffer request from server

// These are shared between streamer and playback but
// we are using float32arrays of pcm 24k 16bit mono
const AudioContextSettings = {
  sampleRate: 24000,
  bitDepth: 16,
  numChannels: 1,
  echoCancellation: true,
  autoGainControl: true,
  noiseSuppression: true,
  channelCount: 1,
};

export default function VoiceApp() {
  const [logMessage, Logs] = useLogs();
  const ws = useRef<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const streamer = useRef<Streamer | null>(null);
  const playback = useRef<Playback | null>(null);
  const lastEOS = useRef<Date | null>(null);
  const [assistant, setAssistant] = useState<
    "fastest" | "best-quality" | "openai"
  >("fastest");

  const stopRecording = (graceful: boolean = false) => {
    setIsRecording(false);
    streamer.current?.stop(graceful);
    playback.current?.stop(graceful);
    ws.current?.close();
    ws.current = null;
    lastEOS.current = null;
  };

  const startRecording = async () => {
    setIsRecording(true);
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      ws.current = new WebSocket(
        SERVER_WS_URL + "?assistant=" + (assistant || "default")
      );
      ws.current.binaryType = "arraybuffer";
      ws.current.onopen = () => {
        ws.current &&
          (ws.current.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
              playback.current?.addSamples(new Float32Array(event.data));
            } else if (event.data === CLEAR_BUFFER_TOKEN) {
              playback.current?.clear().then((didInterrupt: boolean) => {
                if (didInterrupt) {
                  logMessage("--- interrupt recorded", didInterrupt);
                  ws.current && ws.current.send(INTERRUPT_TOKEN);
                }
              });
            } else if (event.data === START_LISTENING_TOKEN) {
              playback.current?.once("playbackEnd", () => {
                logMessage("--- starting vad");
                streamer.current?.startVoiceDetection();
              });
            } else {
              logMessage(event.data);
            }
          });

        logMessage("start recording", new Date());
        playback.current = new Playback(new AudioContext(AudioContextSettings));
        playback.current.on("playbackStart", () => {
          if (!lastEOS.current) {
            return;
          }
          const responseTime = new Date().getTime() - lastEOS.current.getTime();
          logMessage("--- time.TOTAL_RESPONSE ", responseTime, " ms");
        });
        playback.current.start();
        streamer.current = new Streamer(ws.current!, logMessage);
        streamer.current.on("speechStart", () => {
          playback.current?.clear().then((didInterrupt: boolean) => {
            if (didInterrupt) {
              logMessage("--- interrupt recorded", didInterrupt);
              ws.current && ws.current.send(INTERRUPT_TOKEN);
            }
          });
        });
        streamer.current.on("speechEnd", () => {
          lastEOS.current = new Date();
        });
        streamer.current.start();

        ws.current &&
          (ws.current.onclose = () => {
            logMessage("websocket closed");
            stopRecording(true);
          });
      };

      ws.current.onerror = (event) => {
        logMessage("websocket error", event);
      };
    }
  };

  return (
    <main className="flex flex-col h-screen w-full max-w-lg mx-auto text-yellow-300 px-4 py-8">
      <div className="flex justify-center flex-col">
        <a
          href="https://github.com/botany-labs/voice-ai-js-starter"
          target="_blank"
          className="flex items-center space-x-2 mb-2 group cursor-pointer w-fit"
        >
          <img
            className="w-6 h-6 rounded-full bg-yellow-300 group-hover:bg-yellow-100"
            src="/GitHub-Logo.svg"
            alt="GitHub Logo"
          />
          <h1 className="text-xl font-bold group-hover:text-yellow-100">
            {" "}
            botany-labs/voice-ai-js-starter demo
          </h1>
        </a>
        <p className="text-sm">For best results, use headphones.</p>
      </div>
      <div className="my-8 flex flex-col">
        {isRecording ? (
          <Button
            onClick={() => stopRecording(false)}
            className="mx-auto w-1/2 bg-red-500 font-bold text-white px-4 py-2 rounded-md"
            color="danger"
          >
            Hang Up
          </Button>
        ) : (
          <Button
            onClick={startRecording}
            className="mx-auto w-1/2 bg-yellow-300 text-black font-bold px-4 py-2 rounded-md"
            color="warning"
          >
            Begin Call
          </Button>
        )}
        <div className="flex flex-col w-full justify-center items-start mt-8">
          <div className="text-yellow-300 mr-2"> Configuration: </div>
          <Select
            className="text-yellow-100 bg-black border px-2 my-1 rounded-md"
            value={assistant}
            onChange={(e) => setAssistant(e.target.value as any)}
            disabledKeys={isRecording ? ["fastest", "best-quality", "openai"] : []}
            defaultSelectedKeys={["fastest"]}
            aria-label="Select assistant"
          >
            <SelectItem key="fastest" value="fastest">Fastest</SelectItem>
            <SelectItem key="best-quality" value="best-quality">Best Quality</SelectItem>
            <SelectItem key="openai" value="openai">
              OpenAI Only (decently fast, also multilinugal!)
            </SelectItem>
          </Select>
        </div>
        <div className="text-yellow-100 text-sm w-full flex justify-center items-center">
          {assistant === "fastest" && (
            <>
              {" "}
              TTS: Deepgram Nova-2 Streaming / STT: Deepgram Aura / LLM: ChatGPT
              3.5 Turbo{" "}
            </>
          )}
          {assistant === "best-quality" && (
            <>
              {" "}
              TTS: OpenAI Whisper / STT: Elevenlabs Turbo V2 / LLM: ChatGPT 3.5
              Turbo{" "}
            </>
          )}
          {assistant === "openai" && (
            <>
              {" "}
              TTS: OpenAI Whisper / STT: OpenAI TTS-1 / LLM: ChatGPT 3.5 Turbo{" "}
            </>
          )}
        </div>
      </div>
      <Logs />
    </main>
  );
}

const Logs = ({
  logLines,
  clearLogs,
}: {
  logLines: React.ReactNode[];
  clearLogs: () => void;
}) => {
  return (
    <>
      <div className="flex w-full justify-between">
        <h1 className="text-xl font-bold mx-2 my-2"> Logs </h1>
        <Button
          onClick={clearLogs}
          className="border-yellow-300 border px-4 my-1 rounded-md"
          color="default"
          variant="bordered"
        >
          Clear
        </Button>
      </div>
      <div className="border-yellow-300 overflow-y-auto hover:justify-normal flex flex-col justify-end py-2 px-1 font-mono text-green-300 rounded-md border-2 min-h-[200px] max-h-1/2">
        {logLines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </>
  );
};

const useLogs = () => {
  const [logs, setLogs] = useState<{ time: Date; message: string }[]>([]);
  const logsRef = useRef<{ time: Date; message: string }[]>([]);

  const clearLogs = () => {
    logsRef.current = [];
    setLogs([]);
  };

  const logMessage = (...args: any[]) => {
    const time = new Date();
    const message = args.join(" ");
    logsRef.current.push({ time, message });
    console.log(`[${time.toLocaleTimeString()}] ${message}`);
    setLogs([...logsRef.current]);
  };

  const logDisplay = () => {
    const logLines = logs.map((log) => (
      <p key={log.time.toISOString()}>
        <b>[{log.time.toLocaleTimeString()}]</b> {log.message}
      </p>
    ));
    return <Logs logLines={logLines} clearLogs={clearLogs} />;
  };
  return [logMessage, logDisplay] as const;
};

class Streamer extends EventEmitter {
  ws: WebSocket;
  stream: MediaStream | null = null;
  processor: ScriptProcessorNode | null = null;
  vadMic: vad.MicVAD | null = null;
  audioContext: AudioContext | null = null;
  userIsSpeaking: boolean = false;

  constructor(ws: WebSocket, private logMessage: (...args: any[]) => void) {
    super();
    this.ws = ws;
  }

  async startVoiceDetection() {
    const micVad = await vad.MicVAD.new({
      onSpeechStart: () => {
        this.logMessage("--- speech start");
        this.userIsSpeaking = true;
        this.emit("speechStart");
        this.ws.send(JSON.stringify({ event: "speechStart" }));
      },
      onSpeechEnd: () => {
        this.logMessage("--- speech end");
        this.userIsSpeaking = false;
        this.emit("speechEnd");
        this.ws.send(JSON.stringify({ event: "speechEnd" }));
        this.ws.send(END_OF_SPEECH_TOKEN);
      },
    });

    this.vadMic = micVad;
    await micVad.start();
  }

  async start(startVoiceDetection: boolean = false) {
    this.audioContext = new AudioContext(AudioContextSettings);
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    this.stream = stream;
    const source = this.audioContext.createMediaStreamSource(stream);

    const processor = this.audioContext.createScriptProcessor(2048, 1, 1);
    processor.onaudioprocess = (e) => {
      if (this.vadMic === null || !this.userIsSpeaking) {
        return;
      }
      const buffer = e.inputBuffer.getChannelData(0);
      this.ws.send(buffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    this.processor = processor;

    if (startVoiceDetection) {
      this.startVoiceDetection();
    }
  }

  async stop(graceful: boolean = false) {
    try {
      if (this.vadMic) {
        await this.vadMic.pause();
      }
      this.stream?.getTracks().forEach((track) => track.stop());
      this.audioContext?.close();

      this.vadMic = null;
      this.stream = null;
      this.audioContext = null;
      this.processor = null;
    } catch (e) {
      console.log("Error stopping streamer", e);
    }
  }
}

class Playback extends EventEmitter {
  samples: Float32Array[] = [];
  lastFramePlayed: "silence" | "non-silence" = "silence";

  constructor(public audioContext: AudioContext) {
    super();
  }

  _isSilence(samples: Float32Array): boolean {
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < -0.01 || samples[i] > 0.01) {
        return false;
      }
    }
    return true;
  }

  async clear() {
    if (this.lastFramePlayed === "non-silence") {
      this.samples = [];
      return true;
    }
    return false;
  }

  start() {
    this._play();
  }

  stop(graceful: boolean = false) {
    try {
      this.samples = [];
      this.audioContext.close();
    } catch (e) {
      console.log("Error stopping playback", e);
    }
  }

  addSamples(samples: Float32Array) {
    this.samples.push(samples);
  }

  async _play() {
    while (true) {
      while (this.samples.length > 0) {
        this.emit("playbackStart");
        const samples = this.samples.shift()!;

        if (this._isSilence(samples)) {
          this.lastFramePlayed = "silence";
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }

        this.lastFramePlayed = "non-silence";
        const buffer = this.audioContext.createBuffer(
          1,
          samples.length,
          this.audioContext.sampleRate
        );
        buffer.getChannelData(0).set(samples);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start();
        await new Promise((resolve) => {
          source.onended = resolve;
        });
      }
      this.emit("playbackEnd");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
} 