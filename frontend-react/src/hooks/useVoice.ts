import { useState, useCallback, useRef } from 'react';

interface UseVoiceReturn {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

export function useVoice(sessionId: string | null): UseVoiceReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((value: string | null) => void) | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          resolveRef.current?.(null);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (!sessionId) {
          resolveRef.current?.(null);
          return;
        }

        setIsProcessing(true);

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('session_id', sessionId);

          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) throw new Error('Transcription failed');

          const data = await response.json();
          resolveRef.current?.(data.transcript);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed');
          resolveRef.current?.(null);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else {
        setError('Could not access microphone');
      }
    }
  }, [sessionId]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;

      if (mediaRecorderRef.current && isRecording) {
        setIsRecording(false);
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, [isRecording]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    // Clean text
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/[#*_~]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Google') ||
      v.name.includes('Natural')
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking
  };
}
