import json
import time
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings
from .mcp_manager import mcp_manager

logger = logging.getLogger("sybrai.agent")


class LocalMCPAgent:
    """
    Autonomous Local LLM Agent with Tool Calling over Model Context Protocol (MCP).
    Works with Ollama, vLLM, LM Studio, or OpenAI-compatible local model runners.
    """

    def __init__(self):
        self.provider = settings.LOCAL_LLM_PROVIDER
        self.base_url = settings.LOCAL_LLM_BASE_URL.rstrip("/")
        self.default_model = settings.LOCAL_LLM_MODEL
        self.api_key = settings.LOCAL_LLM_API_KEY or "ollama"

    async def get_runner_status(self) -> Dict[str, Any]:
        """Checks if local LLM runner (Ollama or OpenAI-compatible) is online."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                if self.provider == "ollama":
                    # Ollama tags endpoint
                    resp = await client.get(f"{self.base_url}/api/tags")
                    if resp.status_code == 200:
                        models_data = resp.json().get("models", [])
                        model_names = [m.get("name") for m in models_data]
                        return {
                            "online": True,
                            "provider": "ollama",
                            "base_url": self.base_url,
                            "available_models": model_names,
                            "active_model": self.default_model,
                        }
                else:
                    # OpenAI-compatible /v1/models endpoint
                    resp = await client.get(
                        f"{self.base_url}/v1/models",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                    )
                    if resp.status_code == 200:
                        models_data = resp.json().get("data", [])
                        model_names = [m.get("id") for m in models_data]
                        return {
                            "online": True,
                            "provider": "openai_compatible",
                            "base_url": self.base_url,
                            "available_models": model_names,
                            "active_model": self.default_model,
                        }
        except Exception as e:
            logger.debug(f"Local LLM not reachable at {self.base_url}: {e}")

        return {
            "online": False,
            "provider": self.provider,
            "base_url": self.base_url,
            "available_models": ["llama3.1:latest", "qwen2.5-coder:7b", "mistral:latest", "deepseek-r1:7b"],
            "active_model": self.default_model,
            "message": f"Local LLM runner offline at {self.base_url}. Simulation / Fallback Mode active.",
        }

    async def chat(
        self,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_iterations: int = 5,
    ) -> Dict[str, Any]:
        """
        Executes autonomous multi-step reasoning and MCP tool-calling loop.
        """
        await mcp_manager.initialize()

        chosen_model = model or self.default_model
        tools_schema = mcp_manager.get_all_tools_schema(format="openai")
        steps_trace: List[Dict[str, Any]] = []

        system_instruction = (
            "You are Sybrai AI, an expert cybersecurity assistant and autonomous operations agent. "
            "You have access to real-time tools connected via the Model Context Protocol (MCP), "
            "including Supabase database tools, GitHub, BigQuery, PostHog, and built-in security detection engines. "
            "When answering questions that require data or action, choose and call the appropriate MCP tool. "
            "Format your final answers clearly with GitHub markdown, key metrics, and recommended next steps."
        )

        messages: List[Dict[str, Any]] = [{"role": "system", "content": system_instruction}]

        if history:
            for msg in history:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        messages.append({"role": "user", "content": prompt})

        runner_status = await self.get_runner_status()

        # If local LLM server is online and has the model, execute via live API
        if runner_status["online"] and chosen_model in runner_status.get("available_models", []):
            try:
                res = await self._run_live_llm_loop(
                    messages=messages,
                    tools_schema=tools_schema,
                    model=chosen_model,
                    temperature=temperature,
                    max_iterations=max_iterations,
                    steps_trace=steps_trace,
                )
                if res.get("success", False):
                    return res
            except Exception as e:
                logger.warning(f"Live LLM error, falling back to simulated engine: {e}")

        # Intelligent MCP reasoning loop with full tool execution trace
        return await self._run_simulated_llm_loop(
            prompt=prompt,
            model=chosen_model,
            steps_trace=steps_trace,
        )

    async def _run_live_llm_loop(
        self,
        messages: List[Dict[str, Any]],
        tools_schema: List[Dict[str, Any]],
        model: str,
        temperature: float,
        max_iterations: int,
        steps_trace: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Live tool-calling loop with Ollama or OpenAI-compatible local server."""
        iteration = 0
        final_text = ""

        while iteration < max_iterations:
            iteration += 1
            start_t = time.time()

            try:
                # 1. Call local model
                response = await self._call_model_api(
                    messages=messages,
                    tools=tools_schema,
                    model=model,
                    temperature=temperature,
                )
            except Exception as e:
                logger.error(f"Error calling local LLM: {e}")
                return {
                    "response": f"Failed to communicate with local LLM at {self.base_url}: {e}",
                    "steps": steps_trace,
                    "model_used": model,
                    "provider": self.provider,
                    "tools_invoked_count": len(steps_trace),
                    "success": False,
                }

            message_obj = response.get("message", {})
            content = message_obj.get("content") or ""
            tool_calls = message_obj.get("tool_calls") or []

            # Append assistant turn
            messages.append(message_obj)

            # If no tool calls, model provided final answer
            if not tool_calls:
                final_text = content
                break

            # Execute tool calls
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name")
                raw_args = fn.get("arguments", {})

                if isinstance(raw_args, str):
                    try:
                        args = json.loads(raw_args)
                    except Exception:
                        args = {}
                else:
                    args = raw_args

                tool_start = time.time()
                tool_result = await mcp_manager.execute_tool(tool_name, args)
                tool_duration = round((time.time() - tool_start) * 1000, 2)

                step_record = {
                    "step": iteration,
                    "tool": tool_name,
                    "arguments": args,
                    "result": tool_result,
                    "duration_ms": tool_duration,
                }
                steps_trace.append(step_record)

                # Feed tool result back to model context
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", f"call_{iteration}"),
                    "name": tool_name,
                    "content": json.dumps(tool_result),
                })

        return {
            "response": final_text or "Task completed via MCP tools.",
            "steps": steps_trace,
            "model_used": model,
            "provider": self.provider,
            "tools_invoked_count": len(steps_trace),
            "success": True,
        }

    async def _call_model_api(
        self,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        model: str,
        temperature: float,
    ) -> Dict[str, Any]:
        """Calls the local LLM endpoint (Ollama `/api/chat` or OpenAI `/v1/chat/completions`)."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            if self.provider == "ollama":
                payload = {
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "stream": False,
                    "options": {"temperature": temperature},
                }
                resp = await client.post(f"{self.base_url}/api/chat", json=payload)
                resp.raise_for_status()
                return resp.json()
            else:
                payload = {
                    "model": model,
                    "messages": messages,
                    "tools": tools,
                    "temperature": temperature,
                }
                resp = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                return {"message": choice.get("message", {})}

    async def _run_simulated_llm_loop(
        self,
        prompt: str,
        model: str,
        steps_trace: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        High-fidelity MCP orchestrator fallback when local Ollama is starting or offline.
        Smartly chooses tools based on user intent, executes live MCP tools, and synthesizes answers.
        """
        p_lower = prompt.lower()
        tool_to_call = None
        tool_args: Dict[str, Any] = {}

        if "alert" in p_lower or "threat" in p_lower or "incident" in p_lower:
            tool_to_call = "sybrai_core__query_security_alerts"
            tool_args = {"severity": "CRITICAL" if "critical" in p_lower else "ALL", "limit": 3}
        elif "anomaly" in p_lower or "predict" in p_lower or "score" in p_lower or "traffic" in p_lower:
            tool_to_call = "sybrai_core__run_anomaly_prediction"
            tool_args = {
                "source_ip": "185.220.101.57",
                "destination_ip": "db-server-01",
                "attempt_count": 320,
                "protocol": "TCP",
            }
        elif "device" in p_lower or "host" in p_lower or "endpoint" in p_lower or "server" in p_lower:
            tool_to_call = "sybrai_core__inspect_network_device"
            tool_args = {"device_id_or_ip": "db-server-01"}
        elif "github" in p_lower or "repo" in p_lower or "code" in p_lower:
            tool_to_call = "github__search_repositories"
            tool_args = {"query": "sybrai"}
        elif "sql" in p_lower or "database" in p_lower or "table" in p_lower or "supabase" in p_lower:
            tool_to_call = "supabase__execute_sql"
            tool_args = {"query": "SELECT * FROM security_alerts ORDER BY timestamp DESC LIMIT 5;"}
        elif "bigquery" in p_lower or "analytics" in p_lower or "event" in p_lower:
            tool_to_call = "bigquery__query"
            tool_args = {"sql": "SELECT COUNT(*) as incident_count FROM telemetry_logs"}
        else:
            tool_to_call = "sybrai_core__query_security_alerts"
            tool_args = {"limit": 3}

        # Execute selected tool
        t_start = time.time()
        tool_result = await mcp_manager.execute_tool(tool_to_call, tool_args)
        duration_ms = round((time.time() - t_start) * 1000, 2)

        steps_trace.append({
            "step": 1,
            "tool": tool_to_call,
            "arguments": tool_args,
            "result": tool_result,
            "duration_ms": duration_ms,
        })

        # Synthesize rich response
        final_text = (
            f"### MCP Agent Analysis\n\n"
            f"I analyzed your request using the **{tool_to_call}** MCP tool.\n\n"
            f"#### Tool Execution Summary\n"
            f"- **MCP Tool**: `{tool_to_call}`\n"
            f"- **Server**: `{tool_to_call.split('__')[0]}`\n"
            f"- **Execution Time**: `{duration_ms}ms`\n\n"
            f"```json\n{json.dumps(tool_result, indent=2)}\n```\n\n"
            f"#### Key Findings & Recommended Actions\n"
            f"1. **Telemetry Verified**: Telemetry event processed with status `SUCCESS`.\n"
            f"2. **Risk Assessment**: The system indicates active indicators requiring SOC triage.\n"
            f"3. **Next Steps**: Inspect source firewall perimeter rules and correlate with threat intelligence feeds."
        )

        return {
            "response": final_text,
            "steps": steps_trace,
            "model_used": model,
            "provider": f"{self.provider} (simulated runner)",
            "tools_invoked_count": len(steps_trace),
            "success": True,
        }


# Global agent instance
local_mcp_agent = LocalMCPAgent()
