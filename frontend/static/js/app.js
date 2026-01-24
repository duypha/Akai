/**
 * Akai - AI Screen Assistant
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

        // KB & Task state
        this.activePlan = null;
        this.currentStep = null;

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
            ttsAudio: document.getElementById('tts-audio'),

            // Sidebar
            sidebar: document.getElementById('sidebar'),
            kbPanel: document.getElementById('kb-panel'),
            kbSolutions: document.getElementById('kb-solutions'),
            taskPanel: document.getElementById('task-panel'),
            taskContent: document.getElementById('task-content'),
            templatePanel: document.getElementById('template-panel'),
            templateContent: document.getElementById('template-content')
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

            case 'kb_match':
                this.showKBSolutions(data.problems, data.top_solutions);
                break;

            case 'template_detected':
                this.showTemplateSuggestion(data.template);
                break;

            case 'task_created':
                this.showTaskPlan(data.plan);
                break;

            case 'task_started':
                this.showTaskPlan(data.plan);
                break;

            case 'step_completed':
                this.updateTaskPlan(data.plan, data.next_step, data.is_complete);
                break;

            case 'step_failed':
                this.handleStepFailed(data.plan, data.failed_step, data.error_message);
                break;

            case 'pong':
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
        // For assistant messages, split by double newlines into multiple bubbles
        if (role === 'assistant') {
            // Split on double newlines or "---"
            const chunks = content.split(/\n\n+|---/).map(c => c.trim()).filter(c => c.length > 0);
            if (chunks.length > 1) {
                this.addMessageChunks(chunks);
                return;
            }
        }

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

    async addMessageChunks(chunks) {
        for (let i = 0; i < chunks.length; i++) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = chunks[i];

            messageDiv.appendChild(contentDiv);
            this.elements.chatMessages.appendChild(messageDiv);

            // Scroll to bottom
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;

            // Small delay between chunks for natural feel (except last one)
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }
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

    speakResponse(text) {
        // Use browser's built-in Web Speech API (free, no API needed)
        if (!('speechSynthesis' in window)) {
            console.log('Browser does not support speech synthesis');
            return;
        }

        // Clean text - remove special chars, limit length
        let cleanText = text.replace(/[*#_`]/g, '').trim();
        if (cleanText.length > 300) {
            cleanText = cleanText.substring(0, 300);
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to use a natural voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.lang.startsWith('en')
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
    }

    // ========================================================================
    // Knowledge Base & Task Planner UI
    // ========================================================================

    showKBSolutions(problems, solutions) {
        if (!solutions || solutions.length === 0) return;

        this.elements.sidebar.classList.remove('hidden');
        this.elements.kbPanel.classList.remove('hidden');

        let html = '';
        solutions.slice(0, 3).forEach((sol, idx) => {
            const successRate = Math.round((sol.success_rate || 0) * 100);
            html += `
                <div class="solution-card" onclick="app.toggleSolution(this, '${sol.id}')">
                    <div class="solution-title">${sol.title}</div>
                    <div class="solution-meta">${sol.problem_title || ''} ${successRate > 0 ? `• ${successRate}% success` : ''}</div>
                    <div class="solution-steps">
                        ${sol.steps.map((step, i) => `
                            <div class="solution-step" data-step="${i + 1}.">${step}</div>
                        `).join('')}
                        <div style="margin-top: 8px; display: flex; gap: 6px;">
                            <button class="btn-step done" onclick="event.stopPropagation(); app.solutionFeedback('${sol.id}', true)">Worked</button>
                            <button class="btn-step skip" onclick="event.stopPropagation(); app.solutionFeedback('${sol.id}', false)">Didn't work</button>
                        </div>
                    </div>
                </div>
            `;
        });

        this.elements.kbSolutions.innerHTML = html;
    }

    toggleSolution(element, solutionId) {
        element.classList.toggle('expanded');
    }

    async solutionFeedback(solutionId, success) {
        try {
            const formData = new FormData();
            formData.append('success', success);

            await fetch(`/api/knowledge/solutions/${solutionId}/feedback`, {
                method: 'POST',
                body: formData
            });

            this.addMessage('assistant', success ? 'Great, glad that worked!' : 'Sorry that didn\'t help. Let me try something else.');
        } catch (err) {
            console.error('Feedback error:', err);
        }
    }

    showTemplateSuggestion(template) {
        this.elements.sidebar.classList.remove('hidden');
        this.elements.templatePanel.classList.remove('hidden');

        this.elements.templateContent.innerHTML = `
            <div class="template-card">
                <div class="template-name">${template.name}</div>
                <div class="template-desc">${template.steps.length} steps to fix this</div>
                <button class="btn-start-plan" onclick="app.startTaskFromTemplate('${template.id}')">
                    Start Guided Fix
                </button>
            </div>
        `;
    }

    async startTaskFromTemplate(templateId) {
        this.elements.templatePanel.classList.add('hidden');

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'task_action',
                action: 'create_from_template',
                template_id: templateId
            }));
        }
    }

    showTaskPlan(plan) {
        this.activePlan = plan;
        this.elements.sidebar.classList.remove('hidden');
        this.elements.templatePanel.classList.add('hidden');
        this.elements.kbPanel.classList.add('hidden');
        this.elements.taskPanel.classList.remove('hidden');

        this.renderTaskPlan(plan);

        // Auto-start if not started
        if (plan.status === 'created') {
            this.startPlan(plan.id);
        }
    }

    renderTaskPlan(plan) {
        const progress = plan.progress || { completed: 0, total: 0, percent: 0 };

        let stepsHtml = '';
        plan.steps.forEach((step, idx) => {
            let stepClass = 'pending';
            if (step.status === 'completed') stepClass = 'completed';
            else if (step.status === 'in_progress') stepClass = 'current';

            stepsHtml += `
                <div class="task-step ${stepClass}">
                    <span class="step-icon"></span>
                    <span>${step.title}</span>
                </div>
            `;

            // Show actions for current step
            if (step.status === 'in_progress') {
                stepsHtml += `
                    <div class="step-actions">
                        <button class="btn-step done" onclick="app.completeStep('${plan.id}', '${step.id}')">Done</button>
                        <button class="btn-step skip" onclick="app.skipStep('${plan.id}', '${step.id}')">Skip</button>
                    </div>
                `;
            }
        });

        this.elements.taskContent.innerHTML = `
            <div class="task-header">
                <div class="task-title">${plan.title}</div>
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress.percent}%"></div>
                    </div>
                    <span class="progress-text">${progress.completed}/${progress.total}</span>
                </div>
            </div>
            <div class="task-steps">${stepsHtml}</div>
        `;
    }

    async startPlan(planId) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'task_action',
                action: 'start_plan',
                plan_id: planId
            }));
        }
    }

    async completeStep(planId, stepId) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'task_action',
                action: 'complete_step',
                plan_id: planId,
                step_id: stepId
            }));
        }
    }

    async skipStep(planId, stepId) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'task_action',
                action: 'skip_step',
                plan_id: planId,
                step_id: stepId
            }));
        }
    }

    updateTaskPlan(plan, nextStep, isComplete) {
        this.activePlan = plan;
        this.renderTaskPlan(plan);

        if (isComplete) {
            this.addMessage('assistant', 'All done! Let me know if you need anything else.');
            setTimeout(() => {
                this.elements.taskPanel.classList.add('hidden');
                if (!this.elements.kbPanel.classList.contains('hidden')) {
                    // Keep sidebar if KB is showing
                } else {
                    this.elements.sidebar.classList.add('hidden');
                }
            }, 2000);
        } else if (nextStep) {
            this.addMessage('assistant', `Next: ${nextStep.title}`);
        }
    }

    handleStepFailed(plan, failedStep, errorMessage) {
        this.activePlan = plan;
        this.renderTaskPlan(plan);
        this.addMessage('assistant', `Step failed: ${errorMessage}`);
    }

    closeSidebar() {
        this.elements.kbPanel.classList.add('hidden');
        this.elements.taskPanel.classList.add('hidden');
        this.elements.sidebar.classList.add('hidden');
    }

    closeTemplatePanel() {
        this.elements.templatePanel.classList.add('hidden');
        if (this.elements.kbPanel.classList.contains('hidden') &&
            this.elements.taskPanel.classList.contains('hidden')) {
            this.elements.sidebar.classList.add('hidden');
        }
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    showError(message) {
        this.addMessage('assistant', `${message}`);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ITSupportAgent();
});
