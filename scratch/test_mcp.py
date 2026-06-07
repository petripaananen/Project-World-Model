import asyncio
import os
import json
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

async def test_mcp():
    env = os.environ.copy()
    env["GITHUB_PERSONAL_ACCESS_TOKEN"] = "fake_token_just_to_start_server"
    
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-github"],
        env=env
    )
    
    print("Starting MCP...")
    try:
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                print("Initialized!")
                
                # We expect auth to fail here, but let's see what the exception looks like
                result = await session.call_tool("list_pull_requests", {"owner": "google", "repo": "generative-ai-python"})
                print(result)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mcp())
