"""
Knowledge Base Service - Stores common IT problems and solutions
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class Solution:
    """A solution to an IT problem"""
    id: str
    problem_id: str
    title: str
    steps: List[str]
    success_count: int = 0
    failure_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    @property
    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "problem_id": self.problem_id,
            "title": self.title,
            "steps": self.steps,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": self.success_rate,
            "created_at": self.created_at
        }


@dataclass
class Problem:
    """An IT problem in the knowledge base"""
    id: str
    category: str
    title: str
    description: str
    keywords: List[str]
    solutions: List[Solution] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self, include_solutions: bool = True) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "keywords": self.keywords,
            "created_at": self.created_at
        }
        if include_solutions:
            result["solutions"] = [s.to_dict() for s in self.solutions]
        return result


class KnowledgeBase:
    """Knowledge Base for IT Support - stores common problems and solutions"""

    def __init__(self):
        self.problems: Dict[str, Problem] = {}
        self.solutions: Dict[str, Solution] = {}
        self._init_default_knowledge()
        self._load_feedback_from_db()

    def _load_feedback_from_db(self):
        """Load solution feedback from database"""
        try:
            from .database import db
            all_feedback = db.get_all_feedback()
            for fb in all_feedback:
                sol_id = fb["solution_id"]
                if sol_id in self.solutions:
                    self.solutions[sol_id].success_count = fb["success_count"]
                    self.solutions[sol_id].failure_count = fb["failure_count"]
            print(f"📊 Loaded feedback for {len(all_feedback)} solutions")
        except Exception as e:
            print(f"Could not load KB feedback: {e}")

    def _init_default_knowledge(self):
        """Initialize with common IT support problems and solutions"""

        # Printer Problems
        self._add_problem(
            category="Printer",
            title="Printer Offline",
            description="Printer shows as offline or not responding",
            keywords=["printer", "offline", "not printing", "disconnected", "unavailable"],
            solutions=[
                {
                    "title": "Restart Print Spooler Service",
                    "steps": [
                        "Press Windows + R to open Run dialog",
                        "Type 'services.msc' and press Enter",
                        "Find 'Print Spooler' in the list",
                        "Right-click and select 'Restart'",
                        "Try printing again"
                    ]
                },
                {
                    "title": "Check Printer Connection",
                    "steps": [
                        "Verify the printer is powered on",
                        "Check USB or network cable connections",
                        "For wireless printers, verify WiFi connection",
                        "Try power cycling the printer (off for 30 seconds, then on)",
                        "Set the printer as default in Settings > Printers"
                    ]
                }
            ]
        )

        self._add_problem(
            category="Printer",
            title="Print Jobs Stuck in Queue",
            description="Print jobs won't clear from the queue",
            keywords=["printer", "stuck", "queue", "pending", "won't print", "job stuck"],
            solutions=[
                {
                    "title": "Clear Print Queue",
                    "steps": [
                        "Open Settings > Devices > Printers & scanners",
                        "Click on your printer and select 'Open queue'",
                        "Click 'Printer' menu > 'Cancel All Documents'",
                        "If jobs won't clear, stop Print Spooler service",
                        "Delete files in C:\\Windows\\System32\\spool\\PRINTERS",
                        "Restart Print Spooler service"
                    ]
                }
            ]
        )

        # Network Problems
        self._add_problem(
            category="Network",
            title="No Internet Connection",
            description="Computer cannot connect to the internet",
            keywords=["internet", "no connection", "wifi", "network", "offline", "can't connect"],
            solutions=[
                {
                    "title": "Network Troubleshooter",
                    "steps": [
                        "Right-click the network icon in system tray",
                        "Select 'Troubleshoot problems'",
                        "Follow the automated troubleshooter",
                        "Apply any recommended fixes"
                    ]
                },
                {
                    "title": "Reset Network Adapter",
                    "steps": [
                        "Open Command Prompt as Administrator",
                        "Run: ipconfig /release",
                        "Run: ipconfig /flushdns",
                        "Run: ipconfig /renew",
                        "Restart the computer if issue persists"
                    ]
                },
                {
                    "title": "Reset TCP/IP Stack",
                    "steps": [
                        "Open Command Prompt as Administrator",
                        "Run: netsh winsock reset",
                        "Run: netsh int ip reset",
                        "Restart your computer",
                        "Try connecting again"
                    ]
                }
            ]
        )

        self._add_problem(
            category="Network",
            title="Slow Internet Speed",
            description="Internet connection is slower than expected",
            keywords=["slow", "internet", "speed", "lag", "buffering", "loading"],
            solutions=[
                {
                    "title": "Basic Speed Optimization",
                    "steps": [
                        "Close unnecessary browser tabs and applications",
                        "Run a speed test at speedtest.net",
                        "Restart your router (unplug for 30 seconds)",
                        "Move closer to WiFi router or use ethernet",
                        "Check for Windows updates downloading in background"
                    ]
                }
            ]
        )

        # Password/Login Problems
        self._add_problem(
            category="Login",
            title="Forgot Password",
            description="User cannot remember their password",
            keywords=["password", "forgot", "reset", "login", "can't sign in", "locked out"],
            solutions=[
                {
                    "title": "Self-Service Password Reset",
                    "steps": [
                        "Go to the login screen",
                        "Click 'Forgot password' or 'Reset password'",
                        "Enter your email address",
                        "Check email for reset link",
                        "Follow link to create new password",
                        "Use new password to log in"
                    ]
                },
                {
                    "title": "Contact IT Admin",
                    "steps": [
                        "If self-service is not available",
                        "Contact IT support or helpdesk",
                        "Verify your identity",
                        "IT will reset password and provide temporary one",
                        "Change temporary password on first login"
                    ]
                }
            ]
        )

        # Application Problems
        self._add_problem(
            category="Application",
            title="Application Won't Start",
            description="Program crashes or won't open",
            keywords=["crash", "won't open", "not responding", "frozen", "application", "program"],
            solutions=[
                {
                    "title": "Basic Application Troubleshooting",
                    "steps": [
                        "Close the application completely (check Task Manager)",
                        "Restart the computer",
                        "Try running as Administrator (right-click > Run as admin)",
                        "Check for application updates",
                        "Try reinstalling the application"
                    ]
                },
                {
                    "title": "Repair Application Installation",
                    "steps": [
                        "Open Settings > Apps > Apps & features",
                        "Find the application in the list",
                        "Click on it and select 'Modify' or 'Repair'",
                        "Follow the repair wizard",
                        "Restart and try again"
                    ]
                }
            ]
        )

        self._add_problem(
            category="Application",
            title="Microsoft Office Activation Issues",
            description="Office shows activation required or unlicensed",
            keywords=["office", "activation", "license", "unlicensed", "word", "excel", "outlook"],
            solutions=[
                {
                    "title": "Sign In to Microsoft Account",
                    "steps": [
                        "Open any Office application",
                        "Click 'Sign In' in the top right corner",
                        "Enter your Microsoft account credentials",
                        "Office should activate automatically",
                        "If issue persists, check subscription status at account.microsoft.com"
                    ]
                }
            ]
        )

        # Email Problems
        self._add_problem(
            category="Email",
            title="Outlook Not Receiving Emails",
            description="Emails are not arriving in Outlook",
            keywords=["outlook", "email", "not receiving", "inbox", "mail", "messages"],
            solutions=[
                {
                    "title": "Refresh and Check Folders",
                    "steps": [
                        "Click Send/Receive > Send/Receive All Folders",
                        "Check Junk/Spam folder for missing emails",
                        "Check Focused vs Other inbox (if using Focused Inbox)",
                        "Verify you're online (check bottom status bar)",
                        "Try Outlook on the web to see if emails are there"
                    ]
                },
                {
                    "title": "Repair Outlook Profile",
                    "steps": [
                        "Close Outlook completely",
                        "Go to Control Panel > Mail",
                        "Click 'Email Accounts' > select account",
                        "Click 'Repair' and follow prompts",
                        "Restart Outlook"
                    ]
                }
            ]
        )

        # Performance Problems
        self._add_problem(
            category="Performance",
            title="Computer Running Slow",
            description="Computer is sluggish and unresponsive",
            keywords=["slow", "sluggish", "performance", "laggy", "hanging", "freezing"],
            solutions=[
                {
                    "title": "Basic Performance Optimization",
                    "steps": [
                        "Restart the computer",
                        "Open Task Manager (Ctrl+Shift+Esc)",
                        "Check CPU and Memory usage",
                        "End any processes using excessive resources",
                        "Disable unnecessary startup programs",
                        "Run Disk Cleanup to free up space"
                    ]
                },
                {
                    "title": "Check for Malware",
                    "steps": [
                        "Open Windows Security",
                        "Click 'Virus & threat protection'",
                        "Run 'Quick scan' or 'Full scan'",
                        "Remove any detected threats",
                        "Consider running Malwarebytes for additional scan"
                    ]
                }
            ]
        )

        # Display Problems
        self._add_problem(
            category="Display",
            title="External Monitor Not Detected",
            description="Second monitor or projector not working",
            keywords=["monitor", "display", "screen", "projector", "hdmi", "second screen", "external"],
            solutions=[
                {
                    "title": "Detect Display",
                    "steps": [
                        "Press Windows + P to open projection options",
                        "Select 'Extend' or 'Duplicate'",
                        "Go to Settings > System > Display",
                        "Click 'Detect' button",
                        "Check cable connections are secure",
                        "Try a different port or cable"
                    ]
                }
            ]
        )

        # Audio Problems
        self._add_problem(
            category="Audio",
            title="No Sound from Computer",
            description="Computer audio is not working",
            keywords=["sound", "audio", "speakers", "no sound", "mute", "volume", "headphones"],
            solutions=[
                {
                    "title": "Check Audio Settings",
                    "steps": [
                        "Click the speaker icon in system tray",
                        "Make sure volume is not muted or at 0",
                        "Right-click speaker icon > Open Sound settings",
                        "Check the correct output device is selected",
                        "Click 'Troubleshoot' to run audio troubleshooter"
                    ]
                },
                {
                    "title": "Update Audio Drivers",
                    "steps": [
                        "Right-click Start > Device Manager",
                        "Expand 'Sound, video and game controllers'",
                        "Right-click your audio device > Update driver",
                        "Select 'Search automatically for drivers'",
                        "Restart computer after update"
                    ]
                }
            ]
        )

        # Browser Problems
        self._add_problem(
            category="Browser",
            title="Browser Running Slow",
            description="Web browser is slow or unresponsive",
            keywords=["browser", "chrome", "firefox", "edge", "slow", "freezing", "tabs"],
            solutions=[
                {
                    "title": "Clear Browser Cache",
                    "steps": [
                        "Press Ctrl+Shift+Delete in your browser",
                        "Select 'All time' for time range",
                        "Check 'Cached images and files'",
                        "Click 'Clear data'",
                        "Restart the browser"
                    ]
                },
                {
                    "title": "Disable Extensions",
                    "steps": [
                        "Go to browser settings or extensions page",
                        "Disable all extensions temporarily",
                        "Restart browser and test speed",
                        "Re-enable extensions one by one to find the culprit"
                    ]
                }
            ]
        )

        self._add_problem(
            category="Browser",
            title="Website Not Loading",
            description="Specific website won't load or shows error",
            keywords=["website", "page", "not loading", "error", "can't access", "blocked"],
            solutions=[
                {
                    "title": "Clear Site Data",
                    "steps": [
                        "Click the lock/info icon in the address bar",
                        "Click 'Site settings' or 'Cookies'",
                        "Clear data for this site",
                        "Refresh the page"
                    ]
                },
                {
                    "title": "Try Incognito Mode",
                    "steps": [
                        "Press Ctrl+Shift+N for incognito/private window",
                        "Try accessing the website",
                        "If it works, an extension or cookie is causing the issue"
                    ]
                }
            ]
        )

        # VPN Problems
        self._add_problem(
            category="VPN",
            title="VPN Won't Connect",
            description="Unable to establish VPN connection",
            keywords=["vpn", "connect", "remote", "network", "tunnel", "corporate"],
            solutions=[
                {
                    "title": "Basic VPN Troubleshooting",
                    "steps": [
                        "Check your internet connection is working",
                        "Try disconnecting and reconnecting the VPN",
                        "Restart the VPN application",
                        "Check if your credentials are correct",
                        "Try a different VPN server if available"
                    ]
                },
                {
                    "title": "Reset Network Stack",
                    "steps": [
                        "Open Command Prompt as Administrator",
                        "Run: ipconfig /flushdns",
                        "Run: netsh winsock reset",
                        "Restart your computer",
                        "Try connecting to VPN again"
                    ]
                }
            ]
        )

        # Bluetooth Problems
        self._add_problem(
            category="Bluetooth",
            title="Bluetooth Not Working",
            description="Bluetooth devices won't connect or pair",
            keywords=["bluetooth", "wireless", "headphones", "mouse", "keyboard", "pairing", "connect"],
            solutions=[
                {
                    "title": "Toggle Bluetooth",
                    "steps": [
                        "Click the Action Center icon (bottom right)",
                        "Click Bluetooth to turn it off",
                        "Wait 10 seconds",
                        "Click Bluetooth to turn it back on",
                        "Try pairing your device again"
                    ]
                },
                {
                    "title": "Remove and Re-pair Device",
                    "steps": [
                        "Go to Settings > Bluetooth & devices",
                        "Find your device and click 'Remove device'",
                        "Put your Bluetooth device in pairing mode",
                        "Click 'Add device' and select Bluetooth",
                        "Select your device to pair"
                    ]
                },
                {
                    "title": "Update Bluetooth Driver",
                    "steps": [
                        "Right-click Start > Device Manager",
                        "Expand 'Bluetooth'",
                        "Right-click your Bluetooth adapter > Update driver",
                        "Select 'Search automatically'",
                        "Restart computer"
                    ]
                }
            ]
        )

        # Windows Update Problems
        self._add_problem(
            category="Updates",
            title="Windows Update Stuck",
            description="Windows update is stuck or failing",
            keywords=["update", "windows update", "stuck", "failed", "installing", "pending"],
            solutions=[
                {
                    "title": "Run Update Troubleshooter",
                    "steps": [
                        "Go to Settings > System > Troubleshoot",
                        "Click 'Other troubleshooters'",
                        "Find 'Windows Update' and click 'Run'",
                        "Follow the troubleshooter steps",
                        "Try updating again"
                    ]
                },
                {
                    "title": "Reset Windows Update",
                    "steps": [
                        "Open Command Prompt as Administrator",
                        "Run: net stop wuauserv",
                        "Run: net stop bits",
                        "Run: ren C:\\Windows\\SoftwareDistribution SoftwareDistribution.old",
                        "Run: net start wuauserv",
                        "Run: net start bits",
                        "Try updating again"
                    ]
                }
            ]
        )

        # Storage Problems
        self._add_problem(
            category="Storage",
            title="Low Disk Space",
            description="Computer running low on storage space",
            keywords=["disk", "storage", "space", "full", "low space", "c drive", "hard drive"],
            solutions=[
                {
                    "title": "Run Disk Cleanup",
                    "steps": [
                        "Press Windows key and type 'Disk Cleanup'",
                        "Select your main drive (usually C:)",
                        "Check all boxes for files to delete",
                        "Click 'Clean up system files' for more options",
                        "Click OK and delete the files"
                    ]
                },
                {
                    "title": "Clear Temp Files",
                    "steps": [
                        "Press Windows + R",
                        "Type %temp% and press Enter",
                        "Select all files (Ctrl+A)",
                        "Delete them (skip any in use)",
                        "Empty Recycle Bin"
                    ]
                },
                {
                    "title": "Uninstall Unused Programs",
                    "steps": [
                        "Go to Settings > Apps > Installed apps",
                        "Sort by size to find large programs",
                        "Click on programs you don't use",
                        "Click 'Uninstall'"
                    ]
                }
            ]
        )

        # USB Problems
        self._add_problem(
            category="USB",
            title="USB Device Not Recognized",
            description="USB device not detected or not working",
            keywords=["usb", "device", "not recognized", "flash drive", "external", "drive"],
            solutions=[
                {
                    "title": "Try Different Port",
                    "steps": [
                        "Unplug the USB device",
                        "Try a different USB port",
                        "Preferably use a port directly on the computer",
                        "Avoid USB hubs for troubleshooting"
                    ]
                },
                {
                    "title": "Reinstall USB Drivers",
                    "steps": [
                        "Right-click Start > Device Manager",
                        "Expand 'Universal Serial Bus controllers'",
                        "Right-click each 'USB Root Hub' > Uninstall",
                        "Restart computer",
                        "Windows will reinstall USB drivers"
                    ]
                }
            ]
        )

        # Camera Problems
        self._add_problem(
            category="Camera",
            title="Webcam Not Working",
            description="Camera not detected or showing black screen",
            keywords=["camera", "webcam", "video", "zoom", "teams", "black screen", "not working"],
            solutions=[
                {
                    "title": "Check Camera Privacy Settings",
                    "steps": [
                        "Go to Settings > Privacy & security > Camera",
                        "Make sure 'Camera access' is On",
                        "Scroll down and enable camera for your app",
                        "Restart the app"
                    ]
                },
                {
                    "title": "Update Camera Driver",
                    "steps": [
                        "Right-click Start > Device Manager",
                        "Expand 'Cameras' or 'Imaging devices'",
                        "Right-click your camera > Update driver",
                        "Select 'Search automatically'",
                        "Restart computer"
                    ]
                },
                {
                    "title": "Check Physical Camera",
                    "steps": [
                        "Look for a physical camera shutter or cover",
                        "Check if there's a camera on/off switch",
                        "Some laptops have Fn key combo for camera",
                        "Make sure no tape is covering the lens"
                    ]
                }
            ]
        )

        # Keyboard Problems
        self._add_problem(
            category="Keyboard",
            title="Keyboard Not Working",
            description="Keyboard keys not responding or typing wrong characters",
            keywords=["keyboard", "keys", "typing", "not working", "stuck", "wrong characters"],
            solutions=[
                {
                    "title": "Check Keyboard Settings",
                    "steps": [
                        "Check if Num Lock or Caps Lock is on unintentionally",
                        "Go to Settings > Time & language > Language",
                        "Check keyboard layout is correct",
                        "Try the on-screen keyboard to test"
                    ]
                },
                {
                    "title": "Reconnect Keyboard",
                    "steps": [
                        "For USB keyboard: unplug and replug",
                        "Try a different USB port",
                        "For wireless: replace batteries or recharge",
                        "Re-pair Bluetooth keyboard if needed"
                    ]
                }
            ]
        )

        # File Problems
        self._add_problem(
            category="Files",
            title="Can't Delete File",
            description="File is locked or permission denied when trying to delete",
            keywords=["delete", "file", "locked", "permission", "access denied", "in use"],
            solutions=[
                {
                    "title": "Close Programs Using File",
                    "steps": [
                        "Close all programs that might be using the file",
                        "Check Task Manager for background processes",
                        "Try deleting again",
                        "If still locked, restart computer and try immediately"
                    ]
                },
                {
                    "title": "Take Ownership",
                    "steps": [
                        "Right-click the file > Properties",
                        "Go to Security tab > Advanced",
                        "Click 'Change' next to Owner",
                        "Enter your username and click OK",
                        "Check 'Replace owner on subcontainers'",
                        "Apply and try deleting"
                    ]
                }
            ]
        )

        # Zoom/Teams Problems
        self._add_problem(
            category="Meetings",
            title="Audio/Video Issues in Meetings",
            description="Can't hear or be heard in Zoom/Teams/Meet",
            keywords=["zoom", "teams", "meet", "audio", "video", "microphone", "can't hear", "muted"],
            solutions=[
                {
                    "title": "Check Meeting Settings",
                    "steps": [
                        "Check you're not muted in the meeting",
                        "Click audio/video settings in the meeting",
                        "Select the correct microphone and speaker",
                        "Test audio in the meeting app settings"
                    ]
                },
                {
                    "title": "Check System Permissions",
                    "steps": [
                        "Go to Settings > Privacy > Microphone",
                        "Enable microphone access for the app",
                        "Do the same for Camera if needed",
                        "Restart the meeting app"
                    ]
                }
            ]
        )

    def _add_problem(self, category: str, title: str, description: str,
                     keywords: List[str], solutions: List[Dict]) -> Problem:
        """Helper to add a problem with its solutions"""
        problem_id = str(uuid.uuid4())
        problem = Problem(
            id=problem_id,
            category=category,
            title=title,
            description=description,
            keywords=keywords
        )

        for sol_data in solutions:
            solution_id = str(uuid.uuid4())
            solution = Solution(
                id=solution_id,
                problem_id=problem_id,
                title=sol_data["title"],
                steps=sol_data["steps"]
            )
            problem.solutions.append(solution)
            self.solutions[solution_id] = solution

        self.problems[problem_id] = problem
        return problem

    def get_categories(self) -> List[str]:
        """Get all unique categories"""
        return list(set(p.category for p in self.problems.values()))

    def search(self, query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for problems matching the query

        Args:
            query: Search term
            category: Optional category filter

        Returns:
            List of matching problems with solutions
        """
        query_lower = query.lower()
        results = []

        for problem in self.problems.values():
            # Filter by category if specified
            if category and problem.category.lower() != category.lower():
                continue

            # Calculate match score
            score = 0

            # Check title
            if query_lower in problem.title.lower():
                score += 10

            # Check description
            if query_lower in problem.description.lower():
                score += 5

            # Check keywords
            for keyword in problem.keywords:
                if query_lower in keyword.lower() or keyword.lower() in query_lower:
                    score += 3

            # Check individual words in query
            query_words = query_lower.split()
            for word in query_words:
                if len(word) > 2:  # Skip short words
                    for keyword in problem.keywords:
                        if word in keyword.lower():
                            score += 2
                    if word in problem.title.lower():
                        score += 2

            if score > 0:
                result = problem.to_dict()
                result["match_score"] = score
                results.append(result)

        # Sort by match score (highest first)
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results

    def get_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific problem by ID"""
        problem = self.problems.get(problem_id)
        return problem.to_dict() if problem else None

    def get_solution(self, solution_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific solution by ID"""
        solution = self.solutions.get(solution_id)
        return solution.to_dict() if solution else None

    def record_feedback(self, solution_id: str, success: bool) -> bool:
        """
        Record whether a solution worked or not

        Args:
            solution_id: ID of the solution
            success: True if it worked, False if it didn't

        Returns:
            True if feedback recorded, False if solution not found
        """
        solution = self.solutions.get(solution_id)
        if not solution:
            return False

        if success:
            solution.success_count += 1
        else:
            solution.failure_count += 1

        # Persist to database
        try:
            from .database import db
            db.record_solution_feedback(solution_id, success)
        except Exception as e:
            print(f"Could not save KB feedback: {e}")

        return True

    def get_quick_solutions(self, min_success_rate: float = 0.7, min_uses: int = 3) -> List[Dict[str, Any]]:
        """
        Get solutions with high success rates

        Args:
            min_success_rate: Minimum success rate (0.0 to 1.0)
            min_uses: Minimum number of times solution was used

        Returns:
            List of high-success solutions
        """
        results = []

        for solution in self.solutions.values():
            total_uses = solution.success_count + solution.failure_count
            if total_uses >= min_uses and solution.success_rate >= min_success_rate:
                sol_dict = solution.to_dict()
                # Add problem context
                problem = self.problems.get(solution.problem_id)
                if problem:
                    sol_dict["problem_title"] = problem.title
                    sol_dict["problem_category"] = problem.category
                results.append(sol_dict)

        # Sort by success rate
        results.sort(key=lambda x: x["success_rate"], reverse=True)
        return results

    def get_context_for_query(self, query: str) -> Dict[str, Any]:
        """
        Get KB context for a user query (for Claude integration)

        Returns structured data about matching problems/solutions
        """
        matches = self.search(query)

        if not matches:
            return {"has_matches": False, "problems": [], "top_solutions": []}

        # Get top 3 matching problems
        top_problems = matches[:3]

        # Collect best solutions from top problems
        top_solutions = []
        for problem in top_problems:
            for solution in problem.get("solutions", []):
                solution["problem_title"] = problem["title"]
                top_solutions.append(solution)

        # Sort solutions by success rate
        top_solutions.sort(key=lambda x: x.get("success_rate", 0), reverse=True)

        return {
            "has_matches": True,
            "problems": top_problems,
            "top_solutions": top_solutions[:5]  # Top 5 solutions
        }
