import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, X, Activity, Volume2 } from 'lucide-react';
import { Bike, MonthlyStat, Transaction } from '../types';

interface VoiceAgentProps {
  bikes: Bike[];
  financials: MonthlyStat[];
  transactions: Transaction[];
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({ bikes, financials, transactions }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio References
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Gemini Session Reference
  // We use a ref to store the active session object if needed, 
  // though mostly we interact via the initial connect promise.
  const sessionRef = useRef<Promise<any> | null>(null);

  // Helper: Create detailed context for the AI
  const getSystemInstruction = () => {
    return `
      You are MotoBot, the advanced AI Voice Assistant for MotoRent ERP.
      You are speaking to the Professor/Owner of the business.
      
      Your goal is to assist with Fleet Management and Accounting queries verbally.
      Keep answers concise, professional, but conversational (spoken style).
      Do not read out long lists of IDs. Summarize data.

      CURRENT DATA CONTEXT:
      1. Fleet Summary: ${bikes.length} total bikes.
      2. Fleet Details: ${JSON.stringify(bikes)}
      3. Financial Monthly Stats: ${JSON.stringify(financials)}
      4. Recent Transactions: ${JSON.stringify(transactions)}

      If asked about revenue, summarize the trend.
      If asked about maintenance, identify bikes with status 'Maintenance' or 'Overdue'.
    `;
  };

  const stopSession = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // We can't explicitly "close" the session object easily in the current SDK 
    // without storing the result of connect, but closing the WS happens on component unmount
    // or page refresh. For this UI, we just reset state.
    setIsConnected(false);
    setStatus('idle');
    sessionRef.current = null;
  };

  const startSession = async () => {
    setErrorMessage(null);
    setIsConnected(true);
    setStatus('listening');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Initialize Audio Contexts
      // Input: 16kHz for Gemini
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz for playback fidelity
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        sampleRate: 16000
      }});
      streamRef.current = stream;

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            if (!inputAudioContextRef.current || !streamRef.current) return;

            // Setup Input Processing
            const inputCtx = inputAudioContextRef.current;
            sourceRef.current = inputCtx.createMediaStreamSource(streamRef.current);
            processorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Data
                  }
                });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setStatus('speaking');
              await playAudioChunk(audioData);
            }
            
            if (msg.serverContent?.turnComplete) {
              setStatus('listening');
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setErrorMessage("Connection Error");
            stopSession();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start voice session:", err);
      setErrorMessage("Microphone access denied or API Error");
      setIsConnected(false);
    }
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    
    // Create AudioBuffer manually from PCM data (since it's raw PCM, not WAV/MP3)
    // Model output is 24kHz
    const audioBuffer = await decodeAudioData(arrayBuffer, ctx, 24000);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule playback
    const currentTime = ctx.currentTime;
    // Ensure we don't schedule in the past
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    
    source.onended = () => {
       // Optional: logic when a chunk finishes
    };
  };

  // --- Utilities for Audio Encoding/Decoding ---

  // Convert Float32 (Web Audio) to Int16 (PCM)
  const floatTo16BitPCM = (float32Array: Float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  // ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Raw PCM Decode
  const decodeAudioData = async (
    arrayBuffer: ArrayBuffer, 
    ctx: AudioContext, 
    sampleRate: number
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(dataInt16.length);
    
    for (let i = 0; i < dataInt16.length; i++) {
      float32Data[i] = dataInt16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);
    return audioBuffer;
  };

  const toggleAgent = () => {
    if (isActive) {
      stopSession();
      setIsActive(false);
    } else {
      setIsActive(true);
      startSession();
    }
  };

  return (
    <>
      {/* Floating Activation Button */}
      <button
        onClick={toggleAgent}
        className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${
          isActive 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isActive ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </button>

      {/* Voice Agent Overlay */}
      {isActive && (
        <div className="fixed bottom-24 right-8 z-50 w-80 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 p-6 flex flex-col items-center animate-fade-in text-white">
          <div className="flex justify-between w-full items-start mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-accent" />
              <span className="font-bold text-sm tracking-wider uppercase">MotoBot Live</span>
            </div>
            <button onClick={toggleAgent} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Visualizer Orb */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-6">
            <div className={`absolute inset-0 rounded-full bg-accent/20 blur-xl transition-all duration-500 ${
              status === 'speaking' ? 'scale-125 opacity-80' : 
              status === 'listening' ? 'scale-100 opacity-40' : 'scale-75 opacity-20'
            }`}></div>
            
            <div className={`absolute inset-4 rounded-full bg-indigo-500/30 blur-md transition-all duration-300 ${
               status === 'speaking' ? 'animate-ping' : ''
            }`}></div>

            <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-indigo-600 to-slate-800 rounded-full flex items-center justify-center shadow-inner border border-white/10">
               {status === 'speaking' ? (
                 <Volume2 className="w-8 h-8 text-white animate-bounce" />
               ) : (
                 <Mic className={`w-8 h-8 text-white ${status === 'listening' ? 'animate-pulse' : ''}`} />
               )}
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">
              {errorMessage ? 'Error' : 
               status === 'listening' ? 'Listening...' :
               status === 'speaking' ? 'Speaking...' : 'Connecting...'}
            </p>
            <p className="text-xs text-slate-400">
              {errorMessage || "Ask about fleet status, revenue, or overdue bikes."}
            </p>
          </div>
          
          <div className="mt-4 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
             <div className={`h-full bg-accent transition-all duration-300 ${isConnected ? 'w-full' : 'w-0'}`}></div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAgent;