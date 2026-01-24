/**
 * IT Support Agent - Frontend Application
 * Phase 1: Foundation
 */

class ITSupportAgent {
    constructor() {
        // Session state
        this.sessionId = null;
        this.sessionCode = null;
        this.websocket = null;

        // Screen sharing state
        this.screenStream = null;
        this.isSharing = false;

        // Voice recording state
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;

        // DOM Elements
        this.elements = {
            // Session entry
            sessionEntry: document.getElementById('session-entry'),
            btnNewSession: document.getElementById('btn-new-session'),
            sessionCodeInput: document.getElementById('session-code'),
            btnJoinSession: document.getElementById('btn-join-session'),

            // Support interface
            supportInterface: document.getElementById('support-interface'),
            displaySessionCode: document.getElementById('display-session-code'),
            sessionStatus: document.getElementById('session-status'),

            // Chat
            chatMessages: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            btnSend: document.getElementById('btn-send'),

            // Screen sharing
            btnShareScreen: document.getElementById('btn-share-screen'),
            btnStopShare: document.getElementById('btn-stop-share'),
            btnCapture: document.getElementById('btn-capture'),
            screenPreview: document.getElementById('screen-preview'),
            screenVideo: document.getElementById('screen-video'),
            screenCanvas: document.getElementById('screen-canvas'),

            // Voice
            btnVoice: document.getElementById('btn-voice'),
            voiceStatus: document.getElementById('voice-status'),

            // Audio playback
            ttsAudio: document.getElementById('tts-audio')
        };

        // Initialize
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('🤖 IT Support Agent initialized');
    }

    bindEvents() {
        // Session events
        this.elements.btnNewSession.addEventListener('click', () => this.createSession());
        this.elements.btnJoinSession.addEventListener('click', () => this.joinSession());
        this.elements.sessionCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinSession();
        });

        // Chat events
        this.elements.btnSend.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Screen sharing events
        this.elements.btnShareScreen.addEventListener('click', () => this.startScreenShare());
        this.elements.btnStopShare.addEventListener('click', () => this.stopScreenShare());
        this.elements.btnCapture.addEventListener('click', () => this.captureAndAnalyze());

        // Voice events - hold to speak
        this.elements.btnVoice.addEventListener('mousedown', () => this.startRecording());
        this.elements.btnVoice.addEventListener('mouseup', () => this.stopRecording());
        this.elements.btnVoice.addEventListener('mouseleave', () => {
            if (this.isRecording) this.stopRecording();
        });

        // Touch events for mobile
        this.elements.btnVoice.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.elements.btnVoice.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    async createSession() {
        try {
            this.elements.btnNewSession.disabled = true;
            this.elements.btnNewSession.innerHTML = '<span class="loading"></span> Creating...';

            const response = await fetch('/api/session/create', {
                method: 'POST'
            });

            const data = await response.json();

            if (response.ok) {
                this.sessionId = data.session_id;
                this.sessionCode = data.code;
                this.showSupportInterface();
                this.connectWebSocket();
            } else {
                this.showError('Failed to create session');
            }
        } catch (error) {
            console.error('Create session error:', error);
            this.showError('Connection error. Please try again.');
        } finally {
            this.elements.btnNewSession.disabled = false;
            this.elements.btnNewSession.innerHTML = 'Start New Session';
        }
    }

    async joinSession() {
        const code = this.elements.sessionCodeInput.value.trim();

        if (code.length !== 4) {
            this.showError('Please enter a 4-digit code');
            return;
        }

        try {
            this.elements.btnJoinSession.disabled = true;

            const formData = new FormData();
            formData.append('code', code);

            const response = await fetch('/api/session/join', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.sessionId = data.session_id;
                this.sessionCode = code;
                this.showSupportInterface();
                this.connectWebSocket();
            } else {
                this.showError('Invalid session code');
            }
        } catch (error) {
            console.error('Join session error:', error);
            this.showError('Connection error. Please try again.');
        } finally {
            this.elements.btnJoinSession.disabled = false;
        }
    }

    showSupportInterface() {
        this.elements.sessionEntry.classList.add('hidden');
        this.elements.supportInterface.classList.remove('hidden');
        this.elements.displaySessionCode.textContent = this.sessionCode;
    }

    // ========================================================================
    // WebSocket Connection
    // ========================================================================

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;

        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            console.log('✅ WebSocket connected');
            this.elements.sessionStatus.textContent = '● Connected';
            this.elements.sessionStatus.style.color = '#22c55e';
        };

        this.websocket.onclose = () => {
            console.log('❌ WebSocket disconnected');
            this.elements.sessionStatus.textContent = '● Disconnected';
            this.elements.sessionStatus.style.color = '#ef4444';

            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (this.sessionId) {
                    console.log('🔄 Attempting to reconnect...');
                    this.connectWebSocket();
                }
            }, 3000);
        };

        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'ai_response':
                this.addMessage('assistant', data.response);
                this.speakResponse(data.response);
                break;

            case 'transcript':
                this.addMessage('user', data.text);
                break;

            case 'pong':
                // Keep-alive response
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // ========================================================================
    // Chat
    // ========================================================================

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();

        if (!message) return;

        // Clear input
        this.elements.messageInput.value = '';

        // Add user message to chat
        this.addMessage('user', message);

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // If screen is being shared, capture and send with message
            let screenshot = null;
            if (this.isSharing) {
                screenshot = this.captureScreenshot();
            }

            const formData = new FormData();
            formData.append('message', message);
            formData.append('session_id', this.sessionId);

            if (screenshot) {
                const blob = await fetch(screenshot).then(r => r.blob());
                formData.append('screenshot', blob, 'screenshot.jpg');
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Remove typing indicator
            this.hideTypingIndicator();

            if (response.ok) {
                this.addMessage('assistant', data.response);
                this.speakResponse(data.response);
            } else {
                this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.hideTypingIndicator();
            this.addMessage('assistant', 'Connection error. Please check your internet and try again.');
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);
        this.elements.chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.elements.chatMessages.appendChild(indicator);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // ========================================================================
    // Screen Sharing
    // ========================================================================

    async startScreenShare() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 5 }  // Low framerate to save bandwidth
                },
                audio: false
            });

            // Show video preview
            this.elements.screenVideo.srcObject = this.screenStream;
            this.elements.screenPreview.classList.remove('hidden');

            // Update buttons
            this.elements.btnShareScreen.classList.add('hidden');
            this.elements.btnStopShare.classList.remove('hidden');
            this.elements.btnCapture.classList.remove('hidden');

            this.isSharing = true;

            // Handle stream end (user clicks browser's stop button)
            this.screenStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };

            this.addMessage('assistant', '📺 I can now see your screen! Tell me what you need help with, or click "Capture Screen" to send me a snapshot.');

        } catch (error) {
            console.error('Screen share error:', error);
            if (error.name === 'NotAllowedError') {
                this.showError('Screen sharing permission denied');
            } else {
                this.showError('Could not start screen sharing');
            }
        }
    }

    stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        this.elements.screenVideo.srcObject = null;
        this.elements.screenPreview.classList.add('hidden');

        // Update buttons
        this.elements.btnShareScreen.classList.remove('hidden');
        this.elements.btnStopShare.classList.add('hidden');
        this.elements.btnCapture.classList.add('hidden');

        this.isSharing = false;

        this.addMessage('assistant', '📺 Screen sharing stopped.');
    }

    captureScreenshot() {
        if (!this.isSharing) return null;

        const video = this.elements.screenVideo;
        const canvas = this.elements.screenCanvas;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Return as JPEG data URL (smaller than PNG)
        return canvas.toDataURL('image/jpeg', 0.75);
    }

    async captureAndAnalyze() {
        const screenshot = this.captureScreenshot();
        if (!screenshot) return;

        this.addMessage('user', '[Shared screenshot]');
        this.showTypingIndicator();

        try {
            // Convert data URL to blob
            const blob = await fetch(screenshot).then(r => r.blob());

            const formData = new FormData();
            formData.append('screenshot', blob, 'screenshot.jpg');
            formData.append('session_id', this.sessionId);
            formData.append('user_message', 'Please analyze what you see on my screen and help me.');

            const response = await fetch('/api/screen/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            this.hideTypingIndicator();

            if (response.ok) {
                this.addMessage('assistant', data.response);
                this.speakResponse(data.response);
            } else {
                this.addMessage('assistant', 'Sorry, I could not analyze the screenshot. Please try again.');
            }
        } catch (error) {
            console.error('Screenshot analysis error:', error);
            this.hideTypingIndicator();
            this.addMessage('assistant', 'Error analyzing screenshot. Please try again.');
        }
    }

    // ========================================================================
    // Voice Input/Output
    // ========================================================================

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm'
            });

            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await this.transcribeAudio(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Update UI
            this.elements.btnVoice.classList.add('recording');
            this.elements.btnVoice.textContent = '🎤 Recording...';
            this.elements.voiceStatus.textContent = 'Listening...';

        } catch (error) {
            console.error('Recording error:', error);
            if (error.name === 'NotAllowedError') {
                this.showError('Microphone permission denied');
            } else {
                this.showError('Could not access microphone');
            }
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            // Update UI
            this.elements.btnVoice.classList.remove('recording');
            this.elements.btnVoice.textContent = '🎤 Hold to Speak';
            this.elements.voiceStatus.textContent = 'Processing...';
        }
    }

    async transcribeAudio(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('session_id', this.sessionId);

            const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            this.elements.voiceStatus.textContent = '';

            if (response.ok && data.transcript) {
                // Put transcript in input and send
                this.elements.messageInput.value = data.transcript;
                this.sendMessage();
            } else {
                this.showError('Could not understand audio. Please try again.');
            }
        } catch (error) {
            console.error('Transcription error:', error);
            this.elements.voiceStatus.textContent = '';
            this.showError('Error processing audio');
        }
    }

    async speakResponse(text) {
        try {
            // Limit text length for TTS
            const ttsText = text.length > 500 ? text.substring(0, 500) + '...' : text;

            const formData = new FormData();
            formData.append('text', ttsText);

            const response = await fetch('/api/voice/synthesize', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.audio) {
                // Play audio
                this.elements.ttsAudio.src = `data:audio/mp3;base64,${data.audio}`;
                this.elements.ttsAudio.play();
            }
        } catch (error) {
            console.error('TTS error:', error);
            // Silent fail - text is still shown in chat
        }
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    showError(message) {
        // For now, show as a chat message
        this.addMessage('assistant', `⚠️ ${message}`);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ITSupportAgent();
});
