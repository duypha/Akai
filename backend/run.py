"""
Run the IT Support Agent server
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    print("=" * 50)
    print("  🤖 IT Support Agent - Phase 1")
    print("=" * 50)
    print()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"

    print(f"  Server: http://localhost:{port}")
    print(f"  Debug:  {debug}")
    print()
    print("=" * 50)
    print()

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug
    )
