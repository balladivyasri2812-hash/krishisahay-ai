import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Square,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';
import { UserAccount } from '../../services/offlineStorage';
import { getTranslation, SupportedLanguage } from '../../services/i18n';

interface VoiceAssistantViewProps {
  user: UserAccount;
  currentLanguage: SupportedLanguage;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  audioUrl?: string;
  audioDurationSec?: number;
}

export const VoiceAssistantView: React.FC<VoiceAssistantViewProps> = ({
  user,
  currentLanguage,
}) => {
  const t = getTranslation(currentLanguage);

  const getGreeting = () => {
    if (currentLanguage === 'te') {
      return `నమస్కారం ${user.name} గారు! నేను కిసాన్ వాణి మీ వ్యవసాయ వాయిస్ సహాయకుడిని. మైక్రోఫోన్ నొక్కి మీ స్వభాషలో మాట్లాడండి. మీ మాటలను రికార్డ్ చేసి సమాధానం వాయిస్ లో వినిపిస్తాను!`;
    }
    if (currentLanguage === 'hi') {
      return `नमस्ते ${user.name} जी! मैं किसानवाणी, आपका कृषि आवाज सहायक हूँ। माइक दबाकर अपनी भाषा में बोलें। आपकी आवाज रिकॉर्ड होगी और उत्तर भी बोलकर सुनाया जाएगा!`;
    }
    if (currentLanguage === 'ta') {
      return `வணக்கம் ${user.name}! நான் கிசான்வாணி உங்கள் விவசாய குரல் உதவியாளர். மைக்ரோஃபோனைத் தட்டி உங்கள் மொழியில் பேசுங்கள். உங்கள் குரல் பதிவு செய்யப்பட்டு பதில் ஒலிக்கப்படும்!`;
    }
    if (currentLanguage === 'mr') {
      return `नमस्कार ${user.name}! मी किसानवाणी, तुमचा शेती आवाज सहाय्यक. माइक दाबून तुमच्या भाषेत बोला. तुमचा आवाज रेकॉर्ड केला जाईल आणि उत्तरही बोलून ऐकवले जाईल!`;
    }
    return `Namaste ${user.name}! I am KisanVaani, your agricultural voice companion. Tap the microphone to record your voice. I will transcribe it and speak back the agronomic answer!`;
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm_welcome',
      sender: 'assistant',
      text: getGreeting(),
      time: 'Just now',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sttTranscript, setSttTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(20);
  const [micError, setMicError] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Quick Vernacular Prompts
  const getSamplePrompts = () => {
    if (currentLanguage === 'te') {
      return [
        { label: '🌶️ మిర్చి ఆకుముడత నివారణ ఏమిటి?' },
        { label: '💧 నా వరి పంటకు ఎప్పుడు నీరు పెట్టాలి?' },
        { label: '🍅 టమోటా మచ్చల తెగులుకు మందు?' },
        { label: '🌱 ఎర్ర నేలలకు ఏ ఎరువులు మంచివి?' },
        { label: '🌾 వరిలో అగ్గి తెగులు నివారణ?' },
      ];
    }
    if (currentLanguage === 'hi') {
      return [
        { label: '🌶️ मिर्च में मरोड़िया रोग का इलाज क्या है?' },
        { label: '💧 गेहूं में अगली सिंचाई कब करनी चाहिए?' },
        { label: '🍅 टमाटर की झुलसा बीमारी कैसे ठीक करें?' },
        { label: '🌱 लाल मिट्टी के लिए सबसे अच्छी खाद?' },
        { label: '🌾 धान के झुलसा रोग हेतु कीटनाशक खुराक?' },
      ];
    }
    if (currentLanguage === 'ta') {
      return [
        { label: '🌶️ மிளகாய் இலை சுருட்டல் மருந்து?' },
        { label: '💧 பயிருக்கு எப்போது தண்ணீர் பாய்ச்ச வேண்டும்?' },
        { label: '🍅 தக்காளி இலை கருகல் தடுப்பு?' },
        { label: '🌱 செம்மண்ணுக்கு ஏற்ற உரம் எது?' },
      ];
    }
    if (currentLanguage === 'mr') {
      return [
        { label: '🌶️ मिरचीच्या बोकड्या रोगावर उपाय?' },
        { label: '💧 गव्हाला पाणी कधी द्यावे?' },
        { label: '🍅 टोमॅटो करपा रोगाचे नियंत्रण?' },
        { label: '🌱 लाल मातीसाठी सर्वोत्तम खत?' },
      ];
    }
    return [
      { label: '🌶️ Chilli leaf curl treatment?' },
      { label: '💧 When to irrigate wheat?' },
      { label: '🍅 How to cure tomato blight?' },
      { label: '🌱 Best fertilizer for red soil?' },
      { label: '🌾 Rice blast pesticide dose?' },
    ];
  };

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  // Start real voice recording
  const startRecording = async () => {
    setMicError(null);
    setSttTranscript('');
    latestTranscriptRef.current = '';
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // 2. Setup Audio Visualizer Analyzer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!isRecording) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.max(15, avg * 1.4)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      } catch (err) {
        console.warn('AudioContext visualizer not supported', err);
      }

      // 3. Setup MediaRecorder
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
      setIsRecording(true);

      // Start duration counter
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 12) {
            // Auto stop after 12 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // 4. Concurrently start Web Speech Recognition for live text transcription
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          recognition.continuous = true;
          recognition.interimResults = true;

          if (currentLanguage === 'te') recognition.lang = 'te-IN';
          else if (currentLanguage === 'hi') recognition.lang = 'hi-IN';
          else if (currentLanguage === 'ta') recognition.lang = 'ta-IN';
          else if (currentLanguage === 'mr') recognition.lang = 'mr-IN';
          else recognition.lang = 'en-IN';

          recognition.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              interim += event.results[i][0].transcript;
            }
            if (interim.trim()) {
              latestTranscriptRef.current = interim;
              setSttTranscript(interim);
              setInputText(interim);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition info:', e.error);
            // Don't kill audio recording if SpeechRecognition is blocked
          };

          recognition.start();
        } catch (err) {
          console.warn('SpeechRecognition failed to start', err);
        }
      }
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setIsRecording(false);
      stopRecordingCleanup();
      setMicError(
        'Microphone permission was denied or not available. Please allow mic permissions in your browser or select a quick question below!'
      );
    }
  };

  // Stop recording and process user query
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    const duration = recordingSeconds || 3;
    const mr = mediaRecorderRef.current;

    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        });
        const recordedAudioUrl = URL.createObjectURL(audioBlob);

        // Final captured query text
        const capturedText =
          latestTranscriptRef.current.trim() ||
          sttTranscript.trim() ||
          inputText.trim() ||
          getDefaultQueryForLanguage(currentLanguage);

        // Send recorded query with audio playback link
        handleSend(capturedText, recordedAudioUrl, duration);
        stopRecordingCleanup();
      };

      mr.stop();
    } else {
      stopRecordingCleanup();
      const capturedText =
        latestTranscriptRef.current.trim() ||
        sttTranscript.trim() ||
        inputText.trim() ||
        getDefaultQueryForLanguage(currentLanguage);
      handleSend(capturedText, undefined, duration);
    }
  };

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = async (
    queryText?: string,
    audioUrl?: string,
    audioDurationSec?: number
  ) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioUrl,
      audioDurationSec,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSttTranscript('');
    latestTranscriptRef.current = '';
    setIsLoading(true);

    // Call server Gemini endpoint or instant agronomic vernacular generator
    try {
      const res = await fetch('/api/gemini/kisan-vaani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          farmProfile: {
            farmerName: user.name,
            location: user.location,
            areaHa: (user.landAcres || 5) * 0.404,
            optimalMoistureThreshold: user.optimalMoistureThreshold || 45,
          },
          language:
            currentLanguage === 'hi'
              ? 'Hindi'
              : currentLanguage === 'te'
              ? 'Telugu'
              : currentLanguage === 'ta'
              ? 'Tamil'
              : currentLanguage === 'mr'
              ? 'Marathi'
              : 'English',
        }),
      });

      let replyText = '';
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply;
      } else {
        replyText = generateFallbackAgronomicReply(textToSend, currentLanguage);
      }

      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      // Spoken voice readout for illiterate farmers
      speakAloud(replyText);
    } catch {
      const fallback = generateFallbackAgronomicReply(textToSend, currentLanguage);
      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        sender: 'assistant',
        text: fallback,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      speakAloud(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  // Speech-to-Text Audio Readout
  const speakAloud = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;

    if (currentLanguage === 'te') utterance.lang = 'te-IN';
    else if (currentLanguage === 'hi') utterance.lang = 'hi-IN';
    else if (currentLanguage === 'ta') utterance.lang = 'ta-IN';
    else if (currentLanguage === 'mr') utterance.lang = 'mr-IN';
    else utterance.lang = 'en-IN';

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-emerald-950 font-serif">
              {t.voice.title}
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            {t.voice.subtitle}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold animate-pulse cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Speaking</span>
            </button>
          )}
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
            🎙️ Live Voice Recording Active
          </span>
        </div>
      </div>

      {micError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="flex-1">{micError}</p>
        </div>
      )}

      {/* Main Layout: Voice Recorder on Left, Live Spoken Chat on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Recording Console */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col items-center justify-between text-center space-y-5">
          <div className="w-full">
            <h3 className="text-sm font-bold text-emerald-950 uppercase font-serif tracking-wider mb-1">
              Voice Recording & Speech Console
            </h3>
            <p className="text-xs text-stone-500">
              {isRecording
                ? `🔴 Recording Voice... (${recordingSeconds}s) Tap to Stop & Process`
                : t.voice.tapToSpeak}
            </p>
          </div>

          {/* Large Animated Microphone & Recording Button */}
          <div className="py-2 flex flex-col items-center">
            <div className="relative">
              {isRecording && (
                <div
                  className="absolute inset-0 rounded-full bg-rose-400 opacity-75 animate-ping"
                  style={{ transform: `scale(${1 + audioLevel / 100})` }}
                />
              )}
              <button
                onClick={handleToggleMic}
                className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center text-4xl shadow-xl transition-all cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white ring-8 ring-rose-200 shadow-rose-300'
                    : 'bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 text-white hover:scale-105 active:scale-95'
                }`}
                title={isRecording ? 'Click to stop recording' : 'Click to start recording voice'}
              >
                {isRecording ? (
                  <Square className="w-12 h-12 fill-white text-white animate-pulse" />
                ) : (
                  <Mic className="w-14 h-14" />
                )}
              </button>
            </div>

            <div className="mt-4 text-xs font-bold">
              {isRecording ? (
                <span className="text-rose-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                  <span>Recording Voice ({recordingSeconds}s)... Tap to Send</span>
                </span>
              ) : (
                <span className="text-blue-700">Tap to Record Voice & Ask in Native Language</span>
              )}
            </div>

            {sttTranscript && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-medium text-emerald-950 max-w-xs shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">
                  Transcribed Voice:
                </span>
                "{sttTranscript}"
              </div>
            )}
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center justify-center space-x-1.5 h-10 w-full px-4">
            {[6, 12, 20, 28, 36, 26, 18, 10, 6, 14, 24, 32, 22, 12, 6].map((baseH, i) => {
              const activeH = Math.max(6, Math.min(38, (baseH * audioLevel) / 30));
              return (
                <span
                  key={i}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isRecording
                      ? 'bg-gradient-to-t from-cyan-500 to-emerald-500'
                      : 'bg-stone-200'
                  }`}
                  style={{ height: isRecording ? `${activeH}px` : '8px' }}
                />
              );
            })}
          </div>

          {/* Vernacular Quick Prompts */}
          <div className="w-full pt-3 border-t border-stone-100">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
              Quick Voice Inquiries / తరచుగా అడిగే ప్రశ్నలు:
            </span>
            <div className="flex flex-wrap justify-center gap-1.5 text-xs">
              {getSamplePrompts().map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.label)}
                  className="px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 text-stone-700 text-[11px] font-semibold transition-all cursor-pointer text-left"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Spoken Chat Stream & Text-to-Speech Playback */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col justify-between h-[560px]">
          <div className="flex justify-between items-center pb-3 border-b border-stone-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-xs text-emerald-950 font-serif uppercase tracking-wider">
                KisanVaani Dialogue Stream
              </span>
            </div>
            <button
              onClick={() => setMessages([])}
              className="text-[11px] text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              Clear Conversation ×
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 no-scrollbar text-xs">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-blue-700 to-cyan-700 text-white rounded-tr-xs'
                        : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {/* If user recorded audio, display audio player note */}
                    {isUser && m.audioUrl && (
                      <div className="mb-2 p-2 bg-white/20 rounded-xl flex items-center space-x-2">
                        <audio src={m.audioUrl} controls className="h-7 w-48 rounded" />
                        <span className="text-[10px] text-white/90 font-mono">
                          🎤 Voice Note ({m.audioDurationSec}s)
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>

                  <div className="flex items-center space-x-2 mt-1 px-1 text-[10px] text-stone-400">
                    <span>{m.time}</span>
                    {!isUser && (
                      <button
                        onClick={() => speakAloud(m.text)}
                        className="text-stone-500 hover:text-emerald-700 p-0.5 flex items-center space-x-1 cursor-pointer"
                        title="Replay Voice Speech"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-700">Listen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center space-x-2 text-stone-500 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200 w-fit">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>KisanVaani is preparing the spoken advice...</span>
              </div>
            )}
          </div>

          {/* Text input alternative */}
          <div className="pt-3 border-t border-stone-100 flex items-center space-x-2">
            <input
              type="text"
              placeholder={t.voice.typePrompt}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:bg-white focus:border-emerald-600 outline-hidden transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              title="Send Text Question"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getDefaultQueryForLanguage(lang: SupportedLanguage): string {
  if (lang === 'te') return 'నా పంటకు నీరు ఎప్పుడు పెట్టాలి?';
  if (lang === 'hi') return 'फसल को पानी कब देना चाहिए?';
  if (lang === 'ta') return 'பயிருக்கு எப்போது தண்ணீர் பாய்ச்ச வேண்டும்?';
  if (lang === 'mr') return 'पिकाला पाणी कधी द्यावे?';
  return 'When should I irrigate my crops?';
}

function generateFallbackAgronomicReply(query: string, lang: SupportedLanguage): string {
  const q = query.toLowerCase();

  if (lang === 'te') {
    if (q.includes('నీరు') || q.includes('water') || q.includes('తడి')) {
      return 'రైతు సోదరా, మీ వ్యవసాయ ప్రొఫైల్ ప్రకారం ప్రస్తుత నేల తేమను పరిశీలించాము. ఉదయం 06:00 గంటలకు 18 L/m² డ్రిప్ పద్ధతిలో నీరు పెట్టడం శ్రేయస్కరం. ఎండ తీవ్రత వల్ల మధ్యాహ్నం నీరు పెట్టవద్దు.';
    }
    if (q.includes('మిర్చి') || q.includes('ఆకుముడత')) {
      return 'మిర్చి ఆకుముడత (జెమిని వైరస్ / రసం పీల్చే పురుగులు) నివారణకు ఎకరాకు డైఫెంథియురాన్ 50% WP (250 గ్రా) లేదా ఫిప్రోనిల్ (2 మి.లీ/లీ) పిచికారీ చేయండి. ముందుగా వేపనూనె (10,000 ppm) పిచికారీ చేయడం మంచిది.';
    }
    return 'నమస్కారం రైతు సోదరా! మీ ప్రశ్నకు వ్యవసాయ శాస్త్రవేత్తల సిఫార్సు: సమతుల్య ఎరువులు వాడండి, చీడపీడల నివారణకు వేపనూనె (10,000 ppm) పిచికారీ చేయండి. నిర్దిష్ట పంట సూచనలు కావాలంటే అడగండి.';
  }

  if (lang === 'hi') {
    if (q.includes('पानी') || q.includes('सिंचाई')) {
      return 'किसान भाई, आपकी ज़मीन की नमी के अनुसार सुबह 6:00 बजे 18 लीटर प्रति वर्ग मीटर ड्रिप सिंचाई करें। दोपहर की कड़ी धूप में पानी देने से वाष्पीकरण अधिक होता है।';
    }
    if (q.includes('मिर्च') || q.includes('मरोड़िया')) {
      return 'मिर्च में मरोड़िया रोग (लीफ कर्ल) थ्रिप्स या माइट्स के कारण होता है। रोकथाम के लिए इमिडाक्लोप्रिड (1 मिली प्रति 3 लीटर) या डाइफेन्थियुरॉन (1 ग्राम/लीटर) का छिड़काव करें। नीम तेल का उपयोग अवश्य करें।';
    }
    return 'नमस्ते किसान भाई! फसल की सुरक्षा के लिए अनुशंसित मात्रा में ही यूरिया और डीएपी का प्रयोग करें। कीटनाशक छिड़काव से पहले मिट्टी में नमी की जांच अवश्य करें।';
  }

  if (lang === 'ta') {
    return 'விவசாயி நண்பரே! உங்கள் பண்ணை ஈரப்பதத்தின்படி, அதிகாலை 6:00 மணிக்கு சொட்டு நீர் பாசனம் செய்யவும். இலைக்கருகல் நோய்க்கு வேப்ப எண்ணெய் அல்லது மேன்கோசெப் மருந்தை பரிந்துரைக்கிறோம்.';
  }

  if (lang === 'mr') {
    return 'शेतकरी मित्रा, तुमच्या शेतातील जमिनीतील ओलावा पाहता, सकाळी ६:०० वाजता ठिबक सिंचनाने पाणी द्यावे. रोगांच्या नियंत्रणासाठी कडुलिंबाचे तेल (१०,००० ppm) फवारावे.';
  }

  return 'Namaste! Based on your field records, soil moisture is near optimal. We recommend scheduling a morning drip irrigation of 18 L/m² before peak heat. Apply neem-based bio-pesticides for foliar protection.';
}
