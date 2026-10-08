"""
Native macOS Background Voice Listener
Continuous, system-wide microphone monitoring, wake phrase detection,
command processing, and echo-free single lifecycle management.
Operates independently of web browser focus.
"""

import threading
import time
import audioop
import subprocess
import re
from typing import Optional, Dict, Any, Callable
import sounddevice as sd
import speech_recognition as sr

from backend.app.commands.router import command_router
from backend.app.commands.context import assistant_context
from backend.app.config import settings

class NativeVoiceListener:
    def __init__(self):
        self.samplerate = 16000
        self.blocksize = 1600 # 100ms per block
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = 400
        self.recognizer.dynamic_energy_threshold = True

        self.is_running = False
        self.is_active = True # Activated by default for system-wide assistant
        self.is_speaking = False
        self.worker_thread: Optional[threading.Thread] = None
        self.stream: Optional[sd.RawInputStream] = None

        self.on_state_change: Optional[Callable[[str], None]] = None
        self.on_command_executed: Optional[Callable[[Dict[str, Any]], None]] = None

    def start(self):
        """Starts the native background listener thread."""
        if self.is_running:
            return
        self.is_running = True
        self.is_active = True
        assistant_context.set_active(True)
        self.worker_thread = threading.Thread(target=self._run_loop, daemon=True, name="NativeVoiceListener")
        self.worker_thread.start()
        print("✓ Native macOS Background Voice Listener Started (System-Wide Active)")

    def stop(self):
        """Stops the native background listener."""
        self.is_running = False
        self.is_active = False
        assistant_context.set_active(False)
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None

    def activate(self):
        """Activates JARVIS from standby/sleep."""
        self.is_active = True
        assistant_context.set_active(True)
        self._notify_state("LISTENING")
        print("⚡ JARVIS System-Wide Voice Activated: Listening for commands...")

    def deactivate(self):
        """Puts JARVIS into sleep/standby mode."""
        self.is_active = False
        assistant_context.set_active(False)
        self._notify_state("SLEEPING")
        print("💤 JARVIS Voice Standby / Sleeping")

    def _notify_state(self, state: str):
        assistant_context.set_state(state)
        if self.on_state_change:
            try:
                self.on_state_change(state)
            except Exception:
                pass

    def _speak_sync(self, text: str):
        """Speaks text using macOS native say with Daniel voice, waiting until speech ends."""
        if not text:
            return
        clean_text = re.sub(r'[*#_`]', '', text)
        clean_text = re.sub(r'\n+', ' ', clean_text).strip()
        self.is_speaking = True
        self._notify_state("SPEAKING")
        try:
            p = subprocess.Popen(["say", "-v", "Daniel", clean_text])
            p.wait()
        except Exception as e:
            print("Native speech synthesis error:", e)
        finally:
            time.sleep(0.25)
            self.is_speaking = False
            self._notify_state("LISTENING" if self.is_active else "SLEEPING")

    def _run_loop(self):
        """Main audio capture and speech recognition worker loop."""
        while self.is_running:
            try:
                audio_buffer = []
                recording = False
                silence_frames = 0
                max_silence = 7 # ~700ms of silence after speech ends
                max_recording_frames = 60 # ~6 seconds max speech length

                def audio_callback(indata, frames, time_info, status):
                    if not self.is_running or self.is_speaking:
                        return
                    audio_buffer.append(bytes(indata))

                self.stream = sd.RawInputStream(
                    samplerate=self.samplerate,
                    blocksize=self.blocksize,
                    channels=1,
                    dtype='int16',
                    callback=audio_callback
                )

                with self.stream:
                    self._notify_state("LISTENING" if self.is_active else "SLEEPING")
                    
                    speech_frames = []
                    while self.is_running:
                        if not audio_buffer:
                            time.sleep(0.04)
                            continue

                        # Pop available audio chunk
                        chunk = audio_buffer.pop(0)

                        if self.is_speaking or not self.is_active:
                            # Discard incoming audio while speaking to avoid self-echo
                            continue

                        rms = audioop.rms(chunk, 2)

                        # Simple Voice Activity Detection threshold
                        is_speech = rms > 650

                        if is_speech:
                            recording = True
                            silence_frames = 0
                            speech_frames.append(chunk)
                        elif recording:
                            silence_frames += 1
                            speech_frames.append(chunk)

                            # If enough silence after speech or reached max length
                            if silence_frames >= max_silence or len(speech_frames) >= max_recording_frames:
                                raw_bytes = b''.join(speech_frames)
                                speech_frames = []
                                recording = False
                                silence_frames = 0

                                # Minimum length check (~0.6 seconds of speech)
                                if len(raw_bytes) >= 16000 * 2 * 0.6:
                                    self._process_utterance(raw_bytes)

            except Exception as e:
                print("Native voice listener error:", e)
                time.sleep(1.0) # Graceful recovery

    def _process_utterance(self, raw_pcm_bytes: bytes):
        """Transcribes PCM audio and routes command."""
        try:
            self._notify_state("PROCESSING")
            audio_data = sr.AudioData(raw_pcm_bytes, self.samplerate, 2)
            transcript = self.recognizer.recognize_google(audio_data)
            transcript = transcript.strip()
            if not transcript:
                self._notify_state("LISTENING")
                return

            print(f"\n[MIC HEARD]: \"{transcript}\"")

            # Route command through central CommandRouter
            self._notify_state("EXECUTING")
            result = command_router.route(transcript)

            if result.get("is_sleep"):
                self.deactivate()
                self._speak_sync(result.get("message", "Understood, Boss. I'll stand by."))
                return

            if result.get("is_wake"):
                self.activate()
                self._speak_sync(result.get("message", "Yes, Boss?"))
                return

            # Action or question response
            msg = result.get("message")
            if msg:
                self._speak_sync(msg)
            else:
                self._notify_state("LISTENING")

            if self.on_command_executed:
                try:
                    self.on_command_executed({
                        "transcript": transcript,
                        "result": result
                    })
                except Exception:
                    pass

        except sr.UnknownValueError:
            # Normal background noise, no recognizable words
            self._notify_state("LISTENING" if self.is_active else "SLEEPING")
        except sr.RequestError as e:
            print("Speech recognition network error:", e)
            self._notify_state("LISTENING" if self.is_active else "SLEEPING")
        except Exception as e:
            print("Utterance processing error:", e)
            self._notify_state("LISTENING" if self.is_active else "SLEEPING")

native_voice_listener = NativeVoiceListener()
