"""
Speech Service - Handles Speech-to-Text (Whisper) and Text-to-Speech
"""

import os
import io
import base64
import tempfile
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


class SpeechService:
    """Service for speech recognition and synthesis"""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key) if api_key else None
        self.stt_model = "whisper-1"
        self.tts_model = "tts-1"
        self.tts_voice = "nova"  # Options: alloy, echo, fable, onyx, nova, shimmer

        if not self.client:
            print("⚠️ OpenAI API key not set - speech features disabled")

    async def transcribe(
        self,
        audio_data: bytes,
        filename: Optional[str] = None
    ) -> str:
        """
        Transcribe audio to text using Whisper API

        Args:
            audio_data: Raw audio bytes
            filename: Original filename (used to determine format)

        Returns:
            Transcribed text
        """
        if not self.client:
            raise Exception("OpenAI API key not configured - speech-to-text unavailable")

        try:
            # Determine file extension
            extension = ".webm"  # Default for browser audio
            if filename:
                if "." in filename:
                    extension = "." + filename.split(".")[-1]

            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name

            try:
                # Transcribe with Whisper
                with open(temp_file_path, "rb") as audio_file:
                    transcript = self.client.audio.transcriptions.create(
                        model=self.stt_model,
                        file=audio_file,
                        response_format="text"
                    )

                return transcript.strip()

            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

        except Exception as e:
            print(f"Transcription error: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None
    ) -> str:
        """
        Convert text to speech using OpenAI TTS

        Args:
            text: Text to convert to speech
            voice: Voice to use (optional, defaults to nova)

        Returns:
            Base64 encoded MP3 audio
        """
        if not self.client:
            raise Exception("OpenAI API key not configured - text-to-speech unavailable")

        try:
            response = self.client.audio.speech.create(
                model=self.tts_model,
                voice=voice or self.tts_voice,
                input=text,
                response_format="mp3"
            )

            # Get audio bytes
            audio_bytes = response.content

            # Encode to base64
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

            return audio_base64

        except Exception as e:
            print(f"TTS error: {e}")
            raise Exception(f"Failed to synthesize speech: {str(e)}")

    async def transcribe_stream(self, audio_chunk: bytes) -> Optional[str]:
        """
        Transcribe streaming audio (for real-time transcription)
        Note: Whisper doesn't support true streaming, so this buffers

        Args:
            audio_chunk: Audio data chunk

        Returns:
            Transcribed text if enough audio, None if buffering
        """
        # For Phase 1, we'll use the regular transcribe method
        # True streaming would require a different approach (e.g., local Whisper)
        return await self.transcribe(audio_chunk)

    def set_voice(self, voice: str):
        """
        Change the TTS voice

        Args:
            voice: Voice name (alloy, echo, fable, onyx, nova, shimmer)
        """
        valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
        if voice in valid_voices:
            self.tts_voice = voice
        else:
            raise ValueError(f"Invalid voice. Choose from: {valid_voices}")
