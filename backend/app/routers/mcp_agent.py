from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from app.mcp_engine import mcp_manager, local_mcp_agent

router = APIRouter(prefix="/api/mcp", tags=["MCP Local LLM Agent"])


class ChatMessage(BaseModel):
    role: str
    content: str


class MCPChatRequest(BaseModel):
    prompt: str = Field(..., description="User prompt or instructions for the agent")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Previous chat messages")
    model: Optional[str] = Field(None, description="Local model name e.g. llama3.1:latest")
    temperature: float = Field(0.2, ge=0.0, le=2.0)
    max_iterations: int = Field(5, ge=1, le=10)


class MCPExecuteRequest(BaseModel):
    tool_name: str = Field(..., description="Qualified MCP tool name e.g. supabase__execute_sql")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Parameters payload for the tool")


@router.get("/status")
async def get_mcp_status():
    """Returns the connection status of the Local LLM runner and MCP services."""
    await mcp_manager.initialize()
    runner_status = await local_mcp_agent.get_runner_status()
    servers_summary = mcp_manager.list_servers_summary()
    
    return {
        "status": "ready",
        "llm_runner": runner_status,
        "servers_count": len(servers_summary),
        "total_tools_count": len(mcp_manager.tools),
        "servers": servers_summary,
    }


@router.get("/servers")
async def list_mcp_servers():
    """Lists all configured MCP servers and their available tools."""
    await mcp_manager.initialize()
    return {
        "servers": mcp_manager.list_servers_summary(),
        "total_tools": len(mcp_manager.tools),
    }


@router.post("/chat")
async def chat_with_mcp_agent(req: MCPChatRequest):
    """
    Sends a query to the Local LLM agent.
    The agent autonomously decides which MCP tools to invoke, executes them,
    and synthesizes a complete response.
    """
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history] if req.history else []
    
    result = await local_mcp_agent.chat(
        prompt=req.prompt,
        history=history_dicts,
        model=req.model,
        temperature=req.temperature,
        max_iterations=req.max_iterations,
    )
    return result


@router.post("/execute")
async def execute_tool_directly(req: MCPExecuteRequest):
    """Directly executes a single MCP tool for testing or manual operations."""
    await mcp_manager.initialize()
    result = await mcp_manager.execute_tool(req.tool_name, req.arguments)
    return result
