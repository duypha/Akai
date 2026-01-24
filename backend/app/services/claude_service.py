"""
Claude Service - Handles AI Vision and Chat using Anthropic Claude
"""

import os
import anthropic
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class ClaudeService:
    """Service for interacting with Claude API"""

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
        self.model = "claude-sonnet-4-20250514"  # Use Claude Sonnet for good balance of speed/quality
        self.vision_model = "claude-sonnet-4-20250514"  # Vision capable model

        # System prompt for IT Support Agent
        self.system_prompt = """You are a friendly and helpful IT Support Agent. Your role is to help users solve computer problems.

PERSONALITY:
- Speak in a warm, professional tone like a helpful IT technician
- Be patient and understanding - users may not be tech-savvy
- Explain things simply without jargon
- Always reassure users that their problem can be solved

CAPABILITIES:
- You can SEE the user's screen through screenshots they share
- You can GUIDE users step by step through solutions
- You will eventually be able to CONTROL their mouse/keyboard (not yet in Phase 1)

WHEN ANALYZING SCREENSHOTS:
1. Describe what you see on the screen
2. Identify any error messages, dialog boxes, or relevant UI elements
3. Determine the current state of the system
4. Provide clear, numbered steps for the user to follow
5. Ask the user to share another screenshot after they complete steps if needed

RESPONSE FORMAT:
- Keep responses concise but complete
- Use numbered steps for instructions
- Highlight important buttons or menu items in quotes (e.g., Click "Settings")
- If you need more information, ask specific questions
- Always end with a clear next action for the user

IMPORTANT:
- If you cannot solve a problem, be honest and suggest escalation
- Never ask users to do anything that could harm their computer
- If you see sensitive information (passwords, personal data), do not mention or reference it"""

    async def analyze_screen(
        self,
        image_base64: str,
        user_message: Optional[str] = None,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Analyze a screenshot using Claude Vision

        Args:
            image_base64: Base64 encoded screenshot image
            user_message: User's question or description of the problem
            conversation_history: Previous messages in the conversation

        Returns:
            Dict with 'response' key containing AI's analysis
        """
        try:
            # Build messages array
            messages = []

            # Add conversation history (excluding images for token efficiency)
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages for context
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            # Build current message with image
            content = []

            # Add the screenshot
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": image_base64
                }
            })

            # Add user's message or default prompt
            if user_message:
                content.append({
                    "type": "text",
                    "text": user_message
                })
            else:
                content.append({
                    "type": "text",
                    "text": "Please analyze this screenshot and tell me what you see. If there are any issues or error messages, explain what they mean and how to fix them."
                })

            messages.append({
                "role": "user",
                "content": content
            })

            # Call Claude API
            response = self.client.messages.create(
                model=self.vision_model,
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages
            )

            return {
                "response": response.content[0].text,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens
                }
            }

        except anthropic.APIError as e:
            print(f"Claude API error: {e}")
            return {
                "response": "I'm having trouble analyzing the screen right now. Please try again in a moment.",
                "error": str(e)
            }

    async def chat(
        self,
        message: str,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Chat with Claude without an image

        Args:
            message: User's message
            conversation_history: Previous messages in the conversation

        Returns:
            Dict with 'response' key containing AI's response
        """
        try:
            # Build messages array
            messages = []

            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            # Add current message
            messages.append({
                "role": "user",
                "content": message
            })

            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self.system_prompt,
                messages=messages
            )

            return {
                "response": response.content[0].text,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens
                }
            }

        except anthropic.APIError as e:
            print(f"Claude API error: {e}")
            return {
                "response": "I'm having trouble responding right now. Please try again in a moment.",
                "error": str(e)
            }

    async def plan_task(
        self,
        goal: str,
        current_screen: str,
        conversation_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """
        Plan a series of steps to accomplish a goal

        Args:
            goal: What the user wants to achieve
            current_screen: Base64 encoded screenshot of current state
            conversation_history: Previous messages

        Returns:
            Dict with planned steps
        """
        planning_prompt = f"""The user wants to: {goal}

Please analyze the current screen and create a step-by-step plan to help them achieve this goal.

For each step, specify:
1. What action to take (click, type, scroll, etc.)
2. What element to interact with (describe it clearly)
3. What should happen after the action
4. How to verify the step was successful

Format your response as a numbered list of clear, specific steps."""

        return await self.analyze_screen(
            image_base64=current_screen,
            user_message=planning_prompt,
            conversation_history=conversation_history
        )
