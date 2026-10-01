import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Send,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  MessageSquare,
  Globe,
  CheckCircle,
  Square,
} from 'lucide-react';
import { FarmProfile, RotationPlan } from '../types/agricultural';
import { askKisanVaani } from '../services/geminiClient';

interface KisanVaaniDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: RotationPlan;
  farm: FarmProfile;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const PRESET_QUESTIONS = [
  { label: 'What crop should I plant next season?', lang: 'English' },
  { label: 'Why did you select chickpea?', lang: 'English' },
  { label: 'What happens if water reduces?', lang: 'English' },
  { label: 'Which crop gives better profit?', lang: 'English' },
  { label: 'Show my 3-year rotation.', lang: 'English' },
  { label: 'Na field ki next season em crop veyyali?', lang: 'Telugu' },
  { label: 'आगामी मौसम में कौन सी फसल बोनी चाहिए?', lang: 'Hindi' },
];

export const KisanVaaniDrawer: React.FC<KisanVaaniDrawerProps> = ({
  isOpen,
  onClose,
  plan,
  farm,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Telugu' | 'Hindi'>('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');

  // Initialize greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const firstCrop = plan.seasons[0]?.crop.name || 'Maize';
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Namaste ${farm.farmerName}! I am KisanVaani, your agricultural decision companion. Based on your current soil NPK (${farm.nitrogenKgPerHa} N) and ${farm.availableWaterM3PerHa} m³/ha irrigation quota, KrishiSahay AI has calculated **${firstCrop}** for your next season. How can I assist you with your rotation schedule today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, plan, farm, messages.length]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await askKisanVaani(textToSend, plan, farm, selectedLanguage);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real Voice Recording Handling
  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      return;
    }

    liveTranscriptRef.current = '';
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const textToQuery = liveTranscriptRef.current.trim() || inputText.trim() || (selectedLanguage === 'Telugu' ? 'నా పంటకు నీరు ఎప్పుడు పెట్టాలి?' : 'फसल को पानी कब देना चाहिए?');
        handleSend(textToQuery);
      };

      mr.start();
      setIsRecording(true);

      // Concurrently run SpeechRecognition if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          recognitionRef.current = rec;
          rec.continuous = false;
          rec.interimResults = true;
          rec.lang = selectedLanguage === 'Telugu' ? 'te-IN' : selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-IN';

          rec.onresult = (evt: any) => {
            const current = evt.resultIndex;
            const transcript = evt.results[current][0].transcript;
            liveTranscriptRef.current = transcript;
            setInputText(transcript);
          };

          rec.start();
        } catch {}
      }
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsRecording(false);
    }
  };

  // Text-to-Speech voice readout
  const handleSpeakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    if (selectedLanguage === 'Hindi') utterance.lang = 'hi-IN';
    else if (selectedLanguage === 'Telugu') utterance.lang = 'te-IN';
    else utterance.lang = 'en-IN';

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-emerald-900/10">
        {/* Drawer Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400 text-emerald-950 flex items-center justify-center font-bold">
              <Bot className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold font-serif text-white">KisanVaani AI</h3>
                <span className="text-[10px] font-bold bg-emerald-800 text-lime-300 px-2 py-0.5 rounded-full">
                  Voice & Chat
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Ground-truth agricultural advisor synchronized with your optimizer plan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onClose}
              className="p-2 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Switcher Bar */}
        <div className="bg-emerald-900 px-4 py-2 flex items-center justify-between text-xs text-white border-b border-emerald-800">
          <div className="flex items-center space-x-1.5 text-emerald-200">
            <Globe className="w-3.5 h-3.5" />
            <span>Response Language:</span>
          </div>
          <div className="flex items-center space-x-1">
            {(['English', 'Telugu', 'Hindi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedLanguage === lang
                    ? 'bg-lime-400 text-emerald-950 shadow-xs'
                    : 'text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Active Rotation Snapshot Card */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200 flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Synchronized Plan:</span>
            <span className="font-bold text-emerald-950 font-serif">
              {plan.strategyName} • ₹{Math.round(plan.metrics.netProfitInr).toLocaleString()} Net Profit
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-1 rounded-md border border-emerald-200">
            {plan.seasons.length} Seasons
          </span>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-50/50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-tr-xs'
                      : 'bg-white text-stone-800 border border-stone-200 shadow-xs rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                <div className="flex items-center space-x-2 mt-1 px-1">
                  <span className="text-[10px] text-stone-400 font-mono">{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleSpeakText(msg.text)}
                      className="text-stone-400 hover:text-emerald-700 p-0.5"
                      title="Read aloud with speech synthesis"
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-stone-500 text-xs bg-white p-3 rounded-2xl border border-stone-200 w-fit">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>KisanVaani is querying the optimization facts...</span>
            </div>
          )}
        </div>

        {/* Preset Questions Chips */}
        <div className="p-3 bg-white border-t border-stone-100 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 whitespace-nowrap">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q.label)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 text-stone-700 border border-stone-200 transition-all shrink-0"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToggleRecord}
            className={`p-2.5 rounded-xl transition-all shadow-xs cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
            }`}
            title={isRecording ? 'Stop Recording' : 'Record Voice'}
          >
            {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isRecording ? '🎙️ Recording voice... Tap square to stop' : `Ask in ${selectedLanguage} (e.g. "What crop should I plant next season?")...`}
            className="flex-1 bg-stone-100 text-xs rounded-xl px-3.5 py-2.5 border border-transparent focus:border-emerald-600 focus:bg-white outline-hidden"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
