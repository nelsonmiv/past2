import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  PenTool, 
  Headphones, 
  RefreshCw, 
  Settings, 
  Gauge, 
  Flame, 
  Sparkles, 
  BookOpen, 
  Play, 
  Mic, 
  Volume2, 
  Check, 
  ArrowRight, 
  CheckCircle, 
  User, 
  LogOut, 
  Link, 
  FileSpreadsheet, 
  AlertCircle,
  HelpCircle,
  VolumeX,
  RefreshCw as RefreshIcon
} from 'lucide-react';

import { 
  ExercisePractice, 
  ExerciseShadow, 
  ExerciseReverse, 
  AppState, 
  ConfigSettings, 
  StudentUser 
} from './types';
import { generateAllExercises, verbsDB, shuffle } from './exerciseGenerator';

export default function App() {
  // --- CONFIGURACIÓN Y AJUSTES ---
  const [settings, setSettings] = useState<ConfigSettings>(() => {
    const saved = localStorage.getItem('pastTenseMasterySettings');
    let loaded: ConfigSettings | null = null;
    if (saved) {
      try {
        loaded = JSON.parse(saved);
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }

    const defaultClientId = "1050263760705-9lp9gkpnr9qe15qf46ijdedcn0k7c5dp.apps.googleusercontent.com";
    const oldClientIdWithTypo = "1050263760705-91p9gkpnr9qe15qf46ijdedcn0k7c5dp.apps.googleusercontent.com";

    if (loaded) {
      // Auto-migrate the client ID if they have the old typo version saved
      if (loaded.googleClientId === oldClientIdWithTypo) {
        loaded.googleClientId = defaultClientId;
        localStorage.setItem('pastTenseMasterySettings', JSON.stringify(loaded));
      }
      return loaded;
    }

    return {
      googleClientId: defaultClientId,
      sheetsUrl: "https://script.google.com/macros/s/AKfycbwRiv8YJYyZzGsvbwmBbq4h0ABbekOkBKkD8K6j73QbUOeQq-tedk-64pB9fGD9_-KM8g/exec",
      geminiApiKey: ""
    };
  });

  const [voiceName, setVoiceName] = useState<string>(() => {
    return localStorage.getItem('pastTenseMasteryVoice') || 'Aoede';
  });

  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    const saved = localStorage.getItem('pastTenseMasterySpeed');
    return saved ? parseFloat(saved) : 1.0;
  });

  // --- ESTADO GENERAL ---
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pastTenseMasteryStudentProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          score: parsed.score ?? 0,
          practiceIdx: parsed.practiceIdx ?? 0,
          shadowIdx: parsed.shadowIdx ?? 0,
          reverseIdx: parsed.reverseIdx ?? 0,
          practiceOrder: parsed.practiceOrder ?? [],
          shadowOrder: parsed.shadowOrder ?? [],
          reverseOrder: parsed.reverseOrder ?? [],
          user: parsed.user ?? null
        };
      } catch (e) {
        console.error("Error loading progress:", e);
      }
    }
    return {
      score: 0,
      practiceIdx: 0,
      shadowIdx: 0,
      reverseIdx: 0,
      practiceOrder: [],
      shadowOrder: [],
      reverseOrder: [],
      user: null
    };
  });

  // --- EJERCICIOS Y SECCIÓN ACTIVA ---
  const [activeTab, setActiveTab] = useState<'practice' | 'shadowing' | 'reverse' | 'settings'>('practice');
  const [exercises, setExercises] = useState<{
    practice: ExercisePractice[];
    shadow: ExerciseShadow[];
    reverse: ExerciseReverse[];
  }>(() => generateAllExercises());

  // --- ESTADOS DE FLUJO ---
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<string | null>(null);
  const [practiceAnswerChecked, setPracticeAnswerChecked] = useState<boolean>(false);
  const [conjugationModalVerb, setConjugationModalVerb] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shadowing & Reverse recording flags
  const [isRecordingShadow, setIsRecordingShadow] = useState<boolean>(false);
  const [shadowResult, setShadowResult] = useState<{ accuracy: number; spoken: string } | null>(null);
  const [isDictatingReverse, setIsDictatingReverse] = useState<boolean>(false);

  // Reverse validation states
  const [reverseAnswer, setReverseAnswer] = useState<string>('');
  const [isReverseSubmitted, setIsReverseSubmitted] = useState<boolean>(false);
  const [isReverseCorrect, setIsReverseCorrect] = useState<boolean>(false);

  // Premium TTS loading states
  const [isTtsPlaying, setIsTtsPlaying] = useState<string | null>(null); // Button ID

  const speechRecognitionRef = useRef<any>(null);

  // --- SALVADO EN LOCAL STORAGE ---
  useEffect(() => {
    localStorage.setItem('pastTenseMasteryStudentProgress', JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('pastTenseMasterySettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pastTenseMasterySpeed', playbackRate.toString());
  }, [playbackRate]);

  useEffect(() => {
    localStorage.setItem('pastTenseMasteryVoice', voiceName);
  }, [voiceName]);

  // --- INICIALIZACIÓN DE ÓRDENES ALEATORIOS ---
  useEffect(() => {
    let orderPractice = appState.practiceOrder;
    let orderShadow = appState.shadowOrder;
    let orderReverse = appState.reverseOrder;
    let modified = false;

    if (!orderPractice || orderPractice.length !== exercises.practice.length) {
      orderPractice = shuffle([...Array(exercises.practice.length).keys()]);
      modified = true;
    }
    if (!orderShadow || orderShadow.length !== exercises.shadow.length) {
      orderShadow = shuffle([...Array(exercises.shadow.length).keys()]);
      modified = true;
    }
    if (!orderReverse || orderReverse.length !== exercises.reverse.length) {
      orderReverse = shuffle([...Array(exercises.reverse.length).keys()]);
      modified = true;
    }

    if (modified) {
      setAppState(prev => ({
        ...prev,
        practiceOrder: orderPractice,
        shadowOrder: orderShadow,
        reverseOrder: orderReverse
      }));
    }
  }, [exercises]);

  // --- TOAST NOTIFICATIONS ---
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // --- GSI (GOOGLE IDENTITY) MOUNTING ---
  useEffect(() => {
    const handleCredentialResponse = (response: any) => {
      try {
        const decoded = decodeJwt(response.credential);
        const userObj: StudentUser = {
          id: decoded.sub,
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture
        };
        setAppState(prev => ({ ...prev, user: userObj }));
        showToast(`¡Welcome, ${decoded.given_name || decoded.name}! 🌟`);
        // Sync sheets in backend
        setTimeout(() => syncWithGoogleSheets(userObj, appState.score), 200);
      } catch (e) {
        showToast("Error decodificando token de Google");
      }
    };

    // Initialize/Render Google button when SDK is ready or settings clientId change
    const mountGoogleBtn = () => {
      const btnContainer = document.getElementById('google-signin-btn-container-react');
      const mobileBtnContainer = document.getElementById('google-signin-btn-container-mobile');
      
      if ((btnContainer || mobileBtnContainer) && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: settings.googleClientId,
            callback: handleCredentialResponse,
            context: 'signin',
            ux_mode: 'popup'
          });

          if (btnContainer) {
            btnContainer.innerHTML = "";
            (window as any).google.accounts.id.renderButton(
              btnContainer,
              { theme: "outline", size: "medium", text: "signin_with", shape: "rectangular" }
            );
          }

          if (mobileBtnContainer) {
            mobileBtnContainer.innerHTML = "";
            (window as any).google.accounts.id.renderButton(
              mobileBtnContainer,
              { theme: "outline", size: "medium", text: "signin_with", shape: "rectangular" }
            );
          }
        } catch (err) {
          console.error("GSI init error:", err);
        }
      }
    };

    if (settings.googleClientId && settings.googleClientId.trim() !== "" && !settings.googleClientId.includes("TU_GOOGLE")) {
      const checkGSI = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          mountGoogleBtn();
          clearInterval(checkGSI);
        }
      }, 300);
      return () => clearInterval(checkGSI);
    }
  }, [settings.googleClientId, appState.user, activeTab]);

  function decodeJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(
      decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  }

  const logoutGoogle = () => {
    setAppState(prev => ({ ...prev, user: null }));
    showToast("Cerraste sesión.");
  };

  const syncWithGoogleSheets = async (currentUser: StudentUser | null = appState.user, currentScore = appState.score) => {
    if (!currentUser || !settings.sheetsUrl || settings.sheetsUrl.includes("TU_URL") || settings.sheetsUrl.trim() === "") {
      showToast("Configura un webhook o inicia sesión para sincronizar.");
      return;
    }

    const payload = {
      studentName: currentUser.name,
      studentEmail: currentUser.email,
      score: currentScore,
      practiceProgress: `${appState.practiceIdx}/${exercises.practice.length}`,
      shadowProgress: `${appState.shadowIdx}/${exercises.shadow.length}`,
      reverseProgress: `${appState.reverseIdx}/${exercises.reverse.length}`
    };

    try {
      await fetch(settings.sheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showToast("¡Progreso enviado a la nube! 📈");
    } catch (error) {
      showToast("Error de red al sincronizar.");
    }
  };

  // --- AUDIO GENERATION (GEMINI TTS & fallback) ---
  const playSynthesizedTts = (text: string, buttonId: string) => {
    if (isTtsPlaying) return;
    setIsTtsPlaying(buttonId);

    const usePremium = settings.geminiApiKey && 
                       settings.geminiApiKey.trim() !== "" && 
                       !settings.geminiApiKey.includes("TU_API_KEY");

    if (!usePremium) {
      // Fallback web browser speech synthesizer
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = playbackRate;
        utterance.onend = () => setIsTtsPlaying(null);
        utterance.onerror = () => setIsTtsPlaying(null);
        window.speechSynthesis.speak(utterance);
      } else {
        showToast("TTS no soportado en este navegador.");
        setIsTtsPlaying(null);
      }
      return;
    }

    // Call actual Gemini TTS API using the student's key
    (async () => {
      try {
        const payload = {
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName }
              }
            }
          }
        };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${settings.geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }

        const data = await res.json();
        const b64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!b64Audio) {
          throw new Error("No se devolvió audio del modelo Gemini TTS");
        }

        // Direct WAV encoder format to feed standard Audio
        const binary = atob(b64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const header = new ArrayBuffer(44 + bytes.byteLength);
        const view = new DataView(header);
        const setString = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
          }
        };

        setString(0, 'RIFF');
        view.setUint32(4, 36 + bytes.byteLength, true);
        setString(8, 'WAVE');
        setString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // single channel
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, 24000, true); // 24000hz
        view.setUint32(28, 48000, true); // byte rate (24000 * 2)
        view.setUint16(32, 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        setString(36, 'data');
        view.setUint32(40, bytes.byteLength, true);

        const pcm = new Int16Array(bytes.buffer);
        let offset = 44;
        for (let i = 0; i < pcm.length; i++, offset += 2) {
          view.setInt16(offset, pcm[i], true);
        }

        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = playbackRate;
        audio.onended = () => {
          setIsTtsPlaying(null);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsTtsPlaying(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();

      } catch (err) {
        console.error("Gemini TTS Error, falling back:", err);
        showToast("Gemini TTS falló. Usando motor nativo de voz.");
        // Speech synthesis fallback
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = playbackRate;
        utterance.onend = () => setIsTtsPlaying(null);
        utterance.onerror = () => setIsTtsPlaying(null);
        window.speechSynthesis.speak(utterance);
      }
    })();
  };

  // --- ACCESO A LOS ESTADOS ACTUALES ---
  const currentPracticeIndex = appState.practiceOrder[appState.practiceIdx % exercises.practice.length] ?? 0;
  const currentPractice = exercises.practice[currentPracticeIndex];

  const currentShadowIndex = appState.shadowOrder[appState.shadowIdx % exercises.shadow.length] ?? 0;
  const currentShadow = exercises.shadow[currentShadowIndex];

  const currentReverseIndex = appState.reverseOrder[appState.reverseIdx % exercises.reverse.length] ?? 0;
  const currentReverse = exercises.reverse[currentReverseIndex];

  // --- EVENTOS PRÁCTICA ---
  const handlePracticeOptionClick = (option: string) => {
    if (practiceAnswerChecked) return;
    setSelectedPracticeOption(option);
    setPracticeAnswerChecked(true);

    const isCorrect = option === currentPractice.ans;
    if (isCorrect) {
      setAppState(prev => {
        const nextScore = prev.score + 10;
        if (nextScore % 50 === 0) {
          setTimeout(() => syncWithGoogleSheets(prev.user, nextScore), 100);
        }
        return { ...prev, score: nextScore };
      });
      showToast("+10 XP 🔥 ¡Es correcto!");
      // Play brief correct sound (using speech synthesis for clean responsive user feedback)
      speakSimpleFeedback("Correct.");
      setTimeout(nextPractice, 1200);
    } else {
      showToast("Incorrecto. Sigue practicando.");
      speakSimpleFeedback("Incorrect.");
      setTimeout(nextPractice, 2400);
    }
  };

  const speakSimpleFeedback = (fbText: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(fbText);
      u.lang = 'en-US';
      u.rate = 1.1;
      window.speechSynthesis.speak(u);
    }
  };

  const nextPractice = () => {
    setAppState(prev => ({
      ...prev,
      practiceIdx: prev.practiceIdx + 1
    }));
    setSelectedPracticeOption(null);
    setPracticeAnswerChecked(false);
  };

  // --- EVENTOS SHADOWING (SPEECH RECOGNITION) ---
  const toggleShadowRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Simulate input if browser doesn't support mic
      const input = prompt("El navegador no soporta reconocimiento de voz nativo en este iframe.\nEscribe el texto simulado para calificarte:");
      if (input) {
        evaluateShadowPronunciation(input);
      }
      return;
    }

    if (isRecordingShadow) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsRecordingShadow(false);
      return;
    }

    setIsRecordingShadow(true);
    setShadowResult(null);

    const SpeechRecObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecObj();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      evaluateShadowPronunciation(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error:", e);
      if (e.error === 'not-allowed') {
        showToast("Micrófono denegado por el navegador (¿bloqueo de iframe?)");
        const failInput = prompt("Acceso al micrófono bloqueado por el iframe del sandbox.\nEscribe el enunciado para calificar tu pronunciación manualmente o usa la escritura de abajo:");
        if (failInput) {
          evaluateShadowPronunciation(failInput);
        }
      } else {
        showToast(`Error de voz: ${e.error || 'desconocido'}`);
      }
      setIsRecordingShadow(false);
    };

    recognition.onend = () => {
      setIsRecordingShadow(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const evaluateShadowPronunciation = (spoken: string) => {
    const cleanTarget = currentShadow.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const targetWords = cleanTarget.split(/\s+/);
    const spokenWords = cleanSpoken.split(/\s+/);

    let matches = 0;
    targetWords.forEach(word => {
      if (spokenWords.includes(word)) matches++;
    });

    const accuracy = Math.round((matches / targetWords.length) * 100);
    setShadowResult({ accuracy, spoken });

    const scoreGained = accuracy >= 75 ? 15 : (accuracy >= 40 ? 10 : 5);
    setAppState(prev => {
      const nextScore = prev.score + scoreGained;
      if (nextScore % 50 === 0) {
        setTimeout(() => syncWithGoogleSheets(prev.user, nextScore), 100);
      }
      return { ...prev, score: nextScore };
    });
    showToast(`+${scoreGained} XP 🔥 (${accuracy}% precisión)`);
  };

  const nextShadow = () => {
    setAppState(prev => ({
      ...prev,
      shadowIdx: prev.shadowIdx + 1
    }));
    setShadowResult(null);
    setIsRecordingShadow(false);
  };

  // --- EVENTOS REVERSE (ORACIÓN INTERRACTIVA) ---
  const toggleDictationReverse = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast("Reconocimiento de voz no soportado.");
      return;
    }

    if (isDictatingReverse) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsDictatingReverse(false);
      return;
    }

    setIsDictatingReverse(true);
    const SpeechRecObj = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecObj();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let resultText = event.results[0][0].transcript;
      if (!resultText.endsWith('?')) {
        resultText += '?';
      }
      setReverseAnswer(resultText);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error in reverse:", e);
      if (e.error === 'not-allowed') {
        showToast("Micrófono denegado por el navegador (¿bloqueo de iframe?)");
        const failInput = prompt("El micrófono no está permitido aquí.\nEscribe tu pregunta manualmente en el cuadro:");
        if (failInput) {
          setReverseAnswer(failInput);
        }
      } else {
        showToast(`Error de dictado: ${e.error || 'desconocido'}`);
      }
      setIsDictatingReverse(false);
    };

    recognition.onend = () => {
      setIsDictatingReverse(false);
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleCheckReverseAnswer = () => {
    if (!reverseAnswer.trim()) {
      showToast("Escribe o dicta tu pregunta primero.");
      return;
    }

    const inputCleaned = reverseAnswer.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const targetCleaned = currentReverse.targetQ.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    const isMatch = inputCleaned === targetCleaned || 
                    (targetCleaned.includes(inputCleaned) && inputCleaned.length > 5);

    setIsReverseSubmitted(true);
    setIsReverseCorrect(isMatch);

    if (isMatch) {
      setAppState(prev => {
        const nextScore = prev.score + 20;
        if (nextScore % 50 === 0) {
          setTimeout(() => syncWithGoogleSheets(prev.user, nextScore), 100);
        }
        return { ...prev, score: nextScore };
      });
      showToast("+20 XP 🔥 ¡Excelente gramática!");
      speakSimpleFeedback("Excellent.");
    } else {
      showToast("Intenta analizar la estructura y repite.");
      speakSimpleFeedback("Study the question.");
    }
  };

  const nextReverse = () => {
    setAppState(prev => ({
      ...prev,
      reverseIdx: prev.reverseIdx + 1
    }));
    setReverseAnswer('');
    setIsReverseSubmitted(false);
    setIsReverseCorrect(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      
      {/* HEADER PRINCIPAL - SLEEK INTERFACE */}
      <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-md sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Past Tense Mastery 
              <span className="text-indigo-600 font-medium text-xs bg-indigo-50 px-2 py-0.5 rounded-md hidden xs:inline">AI Edition</span>
            </h1>
          </div>
        </div>

        {/* NAVEGACIÓN DE PESTAÑAS & CONTROLES */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <nav className="flex bg-slate-100 rounded-xl p-1 relative gap-1 border border-slate-200">
            <button 
              type="button"
              onClick={() => setActiveTab('practice')} 
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs rounded-lg transition-all font-semibold ${activeTab === 'practice' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50/50'}`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Práctica</span>
            </button>
            
            <button 
              type="button"
              onClick={() => setActiveTab('shadowing')} 
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs rounded-lg transition-all font-semibold ${activeTab === 'shadowing' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50/50'}`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shadowing</span>
            </button>
            
            <button 
              type="button"
              onClick={() => setActiveTab('reverse')} 
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs rounded-lg transition-all font-semibold ${activeTab === 'reverse' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50/50'}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reverse</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('settings')} 
              className={`md:hidden flex items-center justify-center py-1.5 px-3 text-xs rounded-lg transition-all font-semibold ${activeTab === 'settings' ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-950'}`}
              title="Configuración de Estudiante y Gemini"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Selector de velocidad compacto */}
          <div className="hidden xs:flex bg-slate-100 hover:bg-slate-200/80 px-2.5 h-9 rounded-xl items-center gap-1.5 border border-slate-200 transition-colors" title="Velocidad del audio">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <select 
              value={playbackRate} 
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-transparent text-slate-800 font-bold text-xs outline-none cursor-pointer"
            >
              <option value="0.7">0.7x 🐌</option>
              <option value="0.85">0.85x 🐢</option>
              <option value="1.0">1.0x ⚡</option>
              <option value="1.2">1.2x 🚀</option>
            </select>
          </div>
        </div>
      </header>

      {/* DISEÑO EN DOBLE COLUMNA CON GRID (responsive) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 overflow-y-auto">
        
        {/* ASIDE DE CONFIGURACIÓN Y PROGRESO (SIDEBAR) - Visible en desktop, oculto/tabulado en mobile */}
        <aside className="hidden md:flex md:col-span-4 flex-col space-y-6">
          
          {/* TARJETA CONFIGURACIÓN GEMINI KEY Y TTS */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
                Gemini Configuration
              </h2>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${settings.geminiApiKey ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {settings.geminiApiKey ? 'TTS Premium' : 'Fallback TTS'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-700 mb-1.5">Gemini API Key</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="AIzaSy..." 
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 italic">
                  Guarda tu clave de <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">Google AI Studio</a>.
                </p>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700 mb-1.5">Voice Selection</label>
                <select 
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="Aoede font-sans">Aoede (Natural) 🎙️</option>
                  <option value="Zephyr font-sans">Zephyr (Male Smooth) 🌊</option>
                  <option value="Kore font-sans">Kore (Clear Academic) 🌟</option>
                  <option value="Fenrir font-sans">Fenrir (Expressive Deep) 🐺</option>
                  <option value="Charon font-sans">Charon (Syllabic) 🛶</option>
                  <option value="Puck font-sans">Puck (Cheerful) 🍁</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    localStorage.setItem('pastTenseMasterySettings', JSON.stringify(settings));
                    showToast("¡Claves guardadas al instante! ⚙️");
                  }}
                  className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  Guardar Preferencias
                </button>
                <button 
                  onClick={() => playSynthesizedTts("Gemini Text To Speech online connected.", "sidebar-test")}
                  disabled={isTtsPlaying !== null}
                  className="px-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 text-xs font-bold py-2 rounded-lg active:scale-95 transition-all flex items-center justify-center shrink-0"
                  title="Test Sound"
                >
                  {isTtsPlaying === "sidebar-test" ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* DIARIO GOAL SCORE CARD */}
          <section className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 flex flex-col justify-between">
            <div className="space-y-1">
              <h3 className="text-md font-bold flex items-center gap-1.5">
                <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
                Estadísticas de Práctica
              </h3>
              <p className="text-indigo-100 text-xs">Completa los cuestionarios para acumular puntos.</p>
            </div>
            
            <div className="mt-5 space-y-4">
              <div className="bg-indigo-700/45 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs text-indigo-200 font-semibold">Puntos Obtenidos</span>
                <strong className="text-lg text-white font-extrabold">{appState.score} XP</strong>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Progreso de Sesión</span>
                  <span>{Math.round(((appState.practiceIdx) / exercises.practice.length) * 100)}%</span>
                </div>
                <div className="w-full bg-indigo-400/30 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(5, ((appState.practiceIdx) / exercises.practice.length) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-indigo-250 italic">Cuestionarios: {appState.practiceIdx} respondidos</p>
              </div>
            </div>
          </section>

          {/* CLASSRROOM GOOGLE SPREADSHEET SINC */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Conexión Escolar</h3>
            {appState.user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl">
                  <img 
                    src={appState.user.picture} 
                    alt="Avatar" 
                    className="w-8.5 h-8.5 rounded-full border border-indigo-100 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-800 text-xs truncate">{appState.user.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{appState.user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => syncWithGoogleSheets()}
                    className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Enviar Progreso
                  </button>
                  <button 
                    onClick={logoutGoogle}
                    className="px-2.5 py-2 text-xs text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 py-1">
                <p className="text-xs text-slate-500 leading-relaxed">Inicia sesión con tu cuenta de Google para guardar progreso.</p>
                <div id="google-signin-btn-container-react" className="flex items-center justify-center">
                  <span className="text-xs text-slate-400 italic">Buscando autenticación...</span>
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* ARTÍCULO CONTENEDOR CENTRAL DE EJERCICIOS (col-span-8) */}
        <article className="col-span-1 md:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          
          {/* HEADER DEL CONTENEDOR PRINCIPAL */}
          <div className="bg-slate-50/50 p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 mb-0.5">
                {activeTab === 'practice' && "Unit 4: Simple Past vs Continuous"}
                {activeTab === 'shadowing' && "Unit 4: Listening and Repetition Studio"}
                {activeTab === 'reverse' && "Unit 4: Question Grammatical Structures"}
                {activeTab === 'settings' && "Ajustes del Alumno"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {activeTab === 'practice' && "Practice Session"}
                {activeTab === 'shadowing' && "Shadowing Session"}
                {activeTab === 'reverse' && "Reverse Session"}
                {activeTab === 'settings' && "Caves y Ajustes Local"}
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200/60 shadow-2xs">
              <div className={`w-3 h-3 rounded-full ${activeTab === 'practice' ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              <div className={`w-3 h-3 rounded-full ${activeTab === 'shadowing' ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              <div className={`w-3 h-3 rounded-full ${activeTab === 'reverse' ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            </div>
          </div>

          <div className="flex-1 p-6 sm:p-12 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              
              {/* VISTA DE PRÁCTICA */}
              {activeTab === 'practice' && (
                <motion.div 
                  key="practice-active"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-8 text-center"
                >
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 inline-block w-full text-center relative">
                      <button 
                        type="button"
                        onClick={() => setConjugationModalVerb(currentPractice.verbBase)}
                        className="absolute right-3.5 top-3.5 text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        title="Chequear conjugación"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Ver Conjugación</span>
                      </button>

                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-4">
                        TEMA: <span className="text-indigo-600">{currentPractice.type}</span>
                      </p>

                      <p className="text-xl sm:text-2xl font-medium leading-relaxed text-slate-800">
                        {currentPractice.q.split('___').map((part, index, arr) => (
                          <span key={index}>
                            {part}
                            {index < arr.length - 1 && (
                              <span className="inline-block border-b-2 border-indigo-500 bg-indigo-50/50 px-4.5 mx-1 font-mono text-indigo-600 font-bold rounded-t">
                                ________
                              </span>
                            )}
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="flex items-center justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => playSynthesizedTts(currentPractice.q.replace('___', currentPractice.ans), 'practice-tts-btn')}
                        disabled={isTtsPlaying !== null}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-xs shrink-0 cursor-pointer text-xs font-semibold"
                      >
                        {isTtsPlaying === 'practice-tts-btn' ? (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>Escuchar Oración Completa</span>
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentPractice.options.map((opt, idx) => {
                      let btnStyle = "w-full py-4 px-4 font-bold text-center rounded-2xl shadow-xs transition-all border text-sm cursor-pointer ";
                      if (selectedPracticeOption === null) {
                        btnStyle += "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:scale-101 active:scale-99";
                      } else if (opt === currentPractice.ans) {
                        btnStyle += "bg-green-600 border-green-700 text-white shadow-md";
                      } else if (opt === selectedPracticeOption) {
                        btnStyle += "bg-red-500 border-red-600 text-white shadow-md";
                      } else {
                        btnStyle += "bg-slate-50 text-slate-400 border-slate-100 opacity-60";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={practiceAnswerChecked}
                          onClick={() => handlePracticeOptionClick(opt)}
                          className={btnStyle}
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <span>{opt}</span>
                            {selectedPracticeOption !== null && opt === currentPractice.ans && (
                              <Check className="w-4 h-4 stroke-[3.5px]" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="text-right text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Marcador Práctica: {appState.practiceIdx} Completadas
                  </div>
                </motion.div>
              )}

              {/* VISTA DE SHADOWING */}
              {activeTab === 'shadowing' && (
                <motion.div 
                  key="shadow-active"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-8 text-center"
                >
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 inline-block w-full text-center relative">
                      <button 
                        type="button"
                        onClick={() => setConjugationModalVerb(currentShadow.verbBase)}
                        className="absolute right-3.5 top-3.5 text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Ver Conjugación</span>
                      </button>

                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-4">
                        ESCUCHA Y ENUNCIA EN VOZ ALTA IMPERATIVA
                      </p>

                      <p className="text-xl sm:text-2xl font-semibold italic leading-relaxed text-slate-800">
                        "{currentShadow.text}"
                      </p>
                    </div>

                    <div className="flex items-center justify-center space-x-6 py-4">
                      {/* Enunciado TTS */}
                      <button
                        type="button"
                        onClick={() => playSynthesizedTts(currentShadow.text, 'shadow-tts-playback')}
                        disabled={isTtsPlaying !== null}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isTtsPlaying === 'shadow-tts-playback' ? 'bg-indigo-650 text-white animate-spin' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 active:scale-95 shadow-xs'}`}
                        title="Oír Pronunciación"
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>

                      {/* Microphone audio capture */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={toggleShadowRecording}
                          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all relative z-10 ${isRecordingShadow ? 'bg-red-650 text-white shadow-md' : 'bg-red-50 text-red-500 hover:bg-red-100 hover:scale-105 active:scale-95 shadow-xs'}`}
                          title="Capture Mic"
                        >
                          <Mic className="w-6 h-6" />
                        </button>
                        {isRecordingShadow && (
                          <div className="absolute inset-0 bg-red-400 rounded-full mic-pulse" />
                        )}
                      </div>
                    </div>

                    {isRecordingShadow && (
                      <p className="text-xs text-rose-500 font-bold animate-pulse">
                        🎙️ Capturando audio... Habla en inglés ahora.
                      </p>
                    )}

                    {/* Fallback de escritura manual si el micrófono falla */}
                    <div className="w-full max-w-md mx-auto pt-4 border-t border-slate-100 space-y-2 mt-2">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        ⌨️ Escritura Alternativa o Fallback del Mic
                      </p>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          id="shadow-text-fallback-input"
                          placeholder="Escribe la frase que escuchaste..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val.trim()) {
                                evaluateShadowPronunciation(val);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputElem = document.getElementById('shadow-text-fallback-input') as HTMLInputElement;
                            if (inputElem && inputElem.value.trim()) {
                              evaluateShadowPronunciation(inputElem.value);
                              inputElem.value = '';
                            } else {
                              showToast("Escribe la frase antes de calificar.");
                            }
                          }}
                          className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-4.5 py-2.5 rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                        >
                          Calificar
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                        ¿El micrófono está desactivado por el iframe? Haz clic para <a href={window.location.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-extrabold hover:text-indigo-800">Abrir en pestaña nueva</a> y habilitar el dictado nativo.
                      </p>
                    </div>
                  </div>

                  {/* RESULTADO DE LA CALIFICACIÓN DE SHADOWING */}
                  {shadowResult ? (
                    <div className="w-full max-w-md mx-auto space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-left space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-500 uppercase tracking-wider">Pronunciation Feedback</span>
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${shadowResult.accuracy >= 75 ? 'bg-green-150 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {shadowResult.accuracy}% Precisión
                          </span>
                        </div>
                        <div className="text-xs bg-white rounded-lg p-3 border border-slate-100 font-mono italic text-slate-700">
                          Dijiste: "{shadowResult.spoken || 'No se interpretaron palabras claras.'}"
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={nextShadow}
                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        Siguiente Enunciado
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full max-w-sm mx-auto">
                      <button
                        type="button"
                        onClick={nextShadow}
                        className="w-full bg-slate-100 text-slate-600 text-xs font-bold py-3 rounded-lg hover:bg-slate-200"
                      >
                        Omitir Enunciado
                      </button>
                    </div>
                  )}
                  
                  <div className="text-right text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Shadowings Completados: {appState.shadowIdx} de {exercises.shadow.length}
                  </div>
                </motion.div>
              )}

              {/* VISTA DE REVERSE QUESTION FORMATION */}
              {activeTab === 'reverse' && (
                <motion.div 
                  key="reverse-active"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block text-center">
                    RESPUESTA ENUNCIADA GRAMATICAL:
                  </p>

                  <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r-2xl flex justify-between items-center gap-3">
                    <p className="text-base sm:text-lg font-bold text-indigo-950 italic">
                      "{currentReverse.statement}"
                    </p>
                    <button
                      type="button"
                      onClick={() => playSynthesizedTts(currentReverse.statement, 'reverse-statement-tts')}
                      disabled={isTtsPlaying !== null}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isTtsPlaying === 'reverse-statement-tts' ? 'bg-indigo-650 text-white animate-spin' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                      title="Oír Oración"
                    >
                      <Volume2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-3 text-xs sm:text-sm text-slate-700 font-semibold">
                    <div className="w-7 h-7 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 fill-amber-200" />
                    </div>
                    <span>Formula la pregunta. Recuerda que debe iniciar con: <strong className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-mono font-bold">{currentReverse.wh}</strong></span>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reverse-field" className="text-xs font-bold text-slate-500 uppercase tracking-widest block">
                      Tu Pregunta Escrita o Dictada con Mic:
                    </label>
                    <div className="relative">
                      <input 
                        id="reverse-field"
                        type="text"
                        placeholder={`Comienza con ${currentReverse.wh}...`}
                        value={reverseAnswer}
                        onChange={(e) => setReverseAnswer(e.target.value)}
                        disabled={isReverseSubmitted}
                        className="w-full text-center text-lg font-bold py-3.5 pl-4 pr-12 border-b-2 border-slate-200 focus:border-indigo-600 focus:outline-none bg-transparent disabled:opacity-75"
                      />
                      <button
                        type="button"
                        onClick={toggleDictationReverse}
                        disabled={isReverseSubmitted}
                        className={`absolute right-1 top-2 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isDictatingReverse ? 'bg-indigo-600 text-white mic-pulse mic-pulse-blue' : 'text-slate-400 hover:text-indigo-600'}`}
                        title="Dictar pregunta con voz"
                      >
                        <Mic className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  {isDictatingReverse && (
                    <p className="text-xs text-indigo-600 font-bold animate-pulse text-center">
                      🎙️ Capturando voz... Di la pregunta en inglés.
                    </p>
                  )}

                  <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed mt-1">
                    Puedes escribir o dictar tu respuesta. ¿El dictado no responde? Haz clic para <a href={window.location.href} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-extrabold hover:text-indigo-800">Abrir en pestaña nueva</a> y habilitar permisos nativos.
                  </p>

                  {!isReverseSubmitted ? (
                    <button
                      type="button"
                      onClick={handleCheckReverseAnswer}
                      className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-99 transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4.5 h-4.5 stroke-[3px]" />
                      Check Answer
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl text-left border text-xs sm:text-sm font-semibold flex gap-2.5 ${isReverseCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        {isReverseCorrect ? (
                          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          {isReverseCorrect ? (
                            <p className="font-bold">¡Fantástico! Pregunta perfectamente formulada.</p>
                          ) : (
                            <>
                              <p className="font-bold">No es del todo exacto.</p>
                              <div className="mt-1 bg-white/85 p-2 rounded-lg text-slate-800 font-mono text-[11px] border border-slate-200/50">
                                <span className="text-slate-400 font-semibold select-none">Modelo sugerido:</span> <strong className="font-extrabold">{currentReverse.targetQ}</strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={nextReverse}
                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        Siguiente Pregunta
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="text-right text-xs text-slate-400 font-bold uppercase tracking-wider block">
                    Marcador Reverse: {appState.reverseIdx} de {exercises.reverse.length}
                  </div>
                </motion.div>
              )}

              {/* VISTA DE CONFIGURACIONES (MÓVIL Y AUXILIAR) */}
              {activeTab === 'settings' && (
                <motion.div 
                  key="settings-active"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-5 text-left text-xs text-slate-700"
                >
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Gemini API Key (Sonido Premium)
                    </h3>
                    
                    <div className="space-y-2">
                      <label htmlFor="mobile-gemini-key" className="font-bold block">Tu Gemini API Key:</label>
                      <input 
                        id="mobile-gemini-key"
                        type="password" 
                        placeholder="AIzaSy..." 
                        value={settings.geminiApiKey}
                        onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 font-mono font-semibold"
                      />
                      <p className="text-[10px] text-slate-400">Las claves se guardan localmente en el almacenamiento de tu navegador.</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="mobile-voice-key" className="font-bold block">Voz Preferida:</label>
                      <select 
                        id="mobile-voice-key"
                        value={voiceName}
                        onChange={(e) => setVoiceName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3"
                      >
                        <option value="Aoede font-sans">Aoede (Femenina ideal para pronunciar) 🎙️</option>
                        <option value="Zephyr font-sans">Zephyr (Masculina suave) 🌊</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-500" />
                      Parámetros Escolares
                    </h3>

                    <div className="space-y-1.5">
                      <label className="font-bold block text-slate-500 uppercase text-[9px]">Google Client ID:</label>
                      <input 
                        type="text" 
                        placeholder="Tu ClientID para Oauth" 
                        value={settings.googleClientId}
                        onChange={(e) => setSettings(prev => ({ ...prev, googleClientId: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        ⚠️ **Checklist para evitar Error 401 (invalid_client):**<br />
                        1. Asegúrate de crear un **ID de cliente de OAuth** (tipo *Web Application*) en tu Google Cloud Console.<br />
                        2. Agrega la URL actual de esta aplicación ({window.location.origin}) en la sección de **Orígenes de JavaScript autorizados** dentro de Google Cloud Console. Si despliegas a Vercel, agrega el dominio de Vercel allí.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold block text-slate-500 uppercase text-[9px]">Webscript App URL:</label>
                      <input 
                        type="text" 
                        placeholder="https://script.google.com/macros/s/..." 
                        value={settings.sheetsUrl}
                        onChange={(e) => setSettings(prev => ({ ...prev, sheetsUrl: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 font-mono"
                      />
                    </div>
                  </div>

                  {/* CONEXIÓN ESCOLAR (MOBILE-FRIENDLY GOOGLE CONNECT CARD) */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5 text-indigo-500" />
                      Conexión Cuenta Google
                    </h3>
                    
                    {appState.user ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-150">
                          <img 
                            src={appState.user.picture} 
                            alt="Avatar" 
                            className="w-10 h-10 rounded-full border border-indigo-150 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-800 text-xs truncate">{appState.user.name}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{appState.user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => syncWithGoogleSheets()}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Enviar Progreso Manualmente
                          </button>
                          <button 
                            type="button"
                            onClick={logoutGoogle}
                            className="px-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                            title="Cerrar sesión"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-3 py-2 bg-white rounded-xl p-3 border border-slate-150">
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Inicia sesión con tu cuenta escolar de Google para respaldar tus puntos y progreso en vivo.
                        </p>
                        <div id="google-signin-btn-container-mobile" className="flex items-center justify-center min-h-[40px]">
                          <span className="text-xs text-slate-400 italic font-medium">Cargando botón de Google...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        localStorage.setItem('pastTenseMasterySettings', JSON.stringify(settings));
                        showToast("¡Configuraciones guardadas! ⚙️");
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl active:scale-98 transition-colors text-xs cursor-pointer shadow-xs"
                    >
                      Guardar Configuración
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm("¿Estás seguro de restablecer todo a cero?")) {
                          setAppState({
                            score: 0,
                            practiceIdx: 0,
                            shadowIdx: 0,
                            reverseIdx: 0,
                            practiceOrder: shuffle([...Array(exercises.practice.length).keys()]),
                            shadowOrder: shuffle([...Array(exercises.shadow.length).keys()]),
                            reverseOrder: shuffle([...Array(exercises.reverse.length).keys()]),
                            user: null
                          });
                          showToast("Racha y progreso restablecido.");
                        }
                      }}
                      className="bg-red-50 text-red-500 border border-red-200 px-4 rounded-xl font-bold hover:bg-red-100 transition-colors"
                      title="Restablecer"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </article>

      </div>

      {/* FOOTER DEL SISTEMA - SLEEK INTERFACE */}
      <footer className="h-12 bg-white border-t border-slate-200 px-6 sm:px-8 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto shrink-0 z-10">
        <div>
          API STATUS: <span className={settings.geminiApiKey ? "text-green-500" : "text-amber-500"}>{settings.geminiApiKey ? "Gemini-TTS Connected" : "Local Speech Synthesis"}</span>
        </div>
        <div className="hidden xs:block">
          Build v2.4.0 • Student Mode
        </div>
      </footer>

      {/* MODAL DE CONJUGACIÓN DE VERBOS - EXQUISITE */}
      <AnimatePresence>
        {conjugationModalVerb && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-left space-y-4"
            >
              <div className="flex items-center gap-2 border-b pb-3">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-800 text-base">
                  Conjugación: <span className="text-indigo-600 font-mono capitalize">{conjugationModalVerb}</span>
                </h3>
              </div>
              
              <div className="space-y-2.5">
                {(() => {
                  const dbVerb = verbsDB[conjugationModalVerb] || { v1: conjugationModalVerb, v2: `${conjugationModalVerb}ed`, v3: `${conjugationModalVerb}ed` };
                  return (
                    <>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Infinitive (V1)</span>
                        <strong className="text-xs font-mono font-bold text-slate-800">{dbVerb.v1}</strong>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-indigo-50/70 rounded-xl">
                        <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Simple Past (V2)</span>
                        <strong className="text-xs font-mono font-bold text-indigo-900">{dbVerb.v2}</strong>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Past Participle (V3)</span>
                        <strong className="text-xs font-mono font-bold text-slate-800">{dbVerb.v3}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button 
                type="button"
                onClick={() => setConjugationModalVerb(null)} 
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cerrar Conjugación
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white px-5 py-2 rounded-full shadow-lg font-bold text-xs z-50 flex items-center gap-2 tracking-wide"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
