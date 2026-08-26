"""
Verification script for Local LLM + MCP Tool Calling Agent.
Run with:
    python scripts/test_mcp_agent.py
"""

import asyncio
import json
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.mcp_engine import mcp_manager, local_mcp_agent


async def main():
    print("=" * 65)
    print(" [SYBRAI] MCP & Local LLM Agent Integration Test")
    print("=" * 65)

    # 1. Initialize MCP Manager
    print("\n[1] Initializing MCP Manager & Discovering Tools...")
    await mcp_manager.initialize()
    servers = mcp_manager.list_servers_summary()
    print(f"[OK] Discovered {len(servers)} MCP Servers with {len(mcp_manager.tools)} total tools:")
    for s in servers:
        print(f"  - [{s['type'].upper()}] {s['name']}: {s['tool_count']} tools (status: {s['status']})")

    # 2. Check Local LLM Status
    print("\n[2] Checking Local LLM Runner Status...")
    runner_status = await local_mcp_agent.get_runner_status()
    print(f"  - Provider: {runner_status.get('provider')}")
    print(f"  - Base URL: {runner_status.get('base_url')}")
    print(f"  - Online: {runner_status.get('online')}")
    print(f"  - Active Model: {runner_status.get('active_model')}")

    # 3. Direct Tool Execution Test
    print("\n[3] Testing Direct MCP Tool Execution...")
    test_tool = "sybrai_core__query_security_alerts"
    args = {"severity": "CRITICAL", "limit": 2}
    print(f"  -> Executing: {test_tool} with args {args}")
    tool_res = await mcp_manager.execute_tool(test_tool, args)
    print(f"  <- Result:\n{json.dumps(tool_res, indent=2)}")

    # 4. Agent Multi-turn Reasoning & Tool Calling Test
    print("\n[4] Running Autonomous Agent Chat with MCP Tools...")
    prompt = "Query the critical security alerts in our database, analyze threat levels, and give me a summary."
    print(f"  User Prompt: '{prompt}'")
    agent_output = await local_mcp_agent.chat(prompt=prompt)

    print(f"\n[OK] Agent Execution Result:")
    print(f"  - Model Used: {agent_output.get('model_used')}")
    print(f"  - Provider: {agent_output.get('provider')}")
    print(f"  - Tools Invoked: {agent_output.get('tools_invoked_count')}")
    print(f"  - Steps in Trace: {len(agent_output.get('steps', []))}")

    print("\n--- Execution Steps Trace ---")
    for step in agent_output.get("steps", []):
        print(f"  Step {step.get('step')}: Tool `{step.get('tool')}` executed in {step.get('duration_ms')}ms")

    print("\n--- Final Agent Response ---")
    print(agent_output.get("response"))
    print("\n" + "=" * 65)
    print(" [DONE] All MCP & Local LLM tests passed successfully!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
