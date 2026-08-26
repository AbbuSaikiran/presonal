"""
Claude AI Explainer Service for Sybrai Incident Response.

Translates high-risk statistical and behavioral anomalies into
plain-language incident summaries, threat assessments, and actionable
SOC remediation playbooks using the Anthropic Claude API.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("sybrai.explainer")


class ClaudeExplainer:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.CLAUDE_MODEL
        self._client: AsyncAnthropic | None = None
        if self.api_key:
            try:
                self._client = AsyncAnthropic(api_key=self.api_key)
            except Exception as e:
                logger.warning("Could not initialize Anthropic client: %s", e)

    def _format_event_context(self, event: dict[str, Any]) -> str:
        """Format event dictionary into readable Markdown for Claude."""
        return f"""
- **Alert / Event ID**: {event.get('id', 'NEW-EVENT')}
- **Timestamp**: {event.get('timestamp', 'N/A')}
- **Event Type / Classification**: {event.get('type', 'Unknown Threat')}
- **Risk Level**: {event.get('risk_level', 'HIGH')}
- **Source IP**: {event.get('source', 'Unknown')} (Port: {event.get('source_port', 'N/A')})
- **Target Destination**: {event.get('destination', 'Unknown')} (Port: {event.get('destination_port', 'N/A')})
- **Protocol**: {event.get('protocol', 'TCP')}
- **Geo-Location**: {event.get('country_of_origin', 'Unknown')}
- **Payload Volume**: {event.get('bytes_transferred', 0):,} bytes across {event.get('packets_transferred', 0):,} packets
- **Attempt Count**: {event.get('attempt_count', 1):,}
- **MITRE Tactic**: {event.get('mitre_tactic', 'N/A')}
- **MITRE Technique**: {event.get('mitre_technique', 'N/A')}
- **Confidence Score**: {event.get('confidence_score', 85)}%
- **Identified Anomaly Factors**: {', '.join(event.get('anomaly_factors', ['Multi-dimensional outlier']))}
- **Description / Context**: {event.get('description', 'N/A')}
- **Affected User**: {event.get('user_affected', 'N/A')}
- **CVE Reference**: {event.get('cve_id', 'None')}
""".strip()

    def _generate_fallback_explanation(self, event: dict[str, Any]) -> dict[str, Any]:
        """High-fidelity rule-grounded fallback explanation when Claude API key is absent or unreachable."""
        event_type = event.get("type", "Suspicious Network Anomaly")
        source = event.get("source", "Unknown IP")
        destination = event.get("destination", "Target Host")
        dst_port = event.get("destination_port", 0)
        risk = event.get("risk_level", "HIGH")
        proto = event.get("protocol", "TCP")
        country = event.get("country_of_origin", "Unknown origin")
        attempts = event.get("attempt_count", 1)
        bytes_trans = event.get("bytes_transferred", 0)
        mitre = event.get("mitre_tactic", "Initial Access")
        factors = event.get("anomaly_factors", [])

        # Executive summary
        summary = (
            f"Sybrai AI detected a {risk.lower()}-severity {event_type} originating from {source} ({country}) "
            f"targeting {destination} on port {dst_port} ({proto}). "
            f"The attacker initiated {attempts:,} connection attempt(s) transferring {bytes_trans:,} bytes of data, "
            f"exhibiting statistical signatures consistent with MITRE ATT&CK tactic '{mitre}'."
        )

        # Threat assessment
        assessment = (
            f"The activity represents a significant threat to {destination}. "
            + (f"Key anomaly factors detected: {'; '.join(factors)}. " if factors else "")
            + f"If unauthorized, this vector could allow the adversary to gain initial access, execute arbitrary payloads, "
            f"or escalate privileges across internal network segments. Immediate containment is recommended."
        )

        # Actionable recommendations
        actions = [
            f"Block inbound traffic from source IP {source} at perimeter firewall and cloud security groups.",
            f"Isolate host '{destination}' temporarily to prevent potential lateral movement.",
            f"Inspect connection logs and active daemon processes listening on port {dst_port}.",
            f"Review authentication logs for failed login attempts or session token anomalies associated with target.",
            f"Submit IoC ({source}) to internal Threat Intelligence blacklist and SIEM monitoring.",
        ]

        if "exfiltration" in event_type.lower() or bytes_trans > 5_000_000:
            actions.insert(2, f"Perform forensic payload analysis on the {bytes_trans / (1024*1024):.1f} MB outbound egress data.")

        return {
            "incident_summary": summary,
            "threat_assessment": assessment,
            "recommended_actions": actions,
            "suggested_status": "INVESTIGATING",
            "model_used": "sybrai-local-expert-engine",
            "raw_explanation": f"{summary}\n\n### Threat Assessment\n{assessment}\n\n### Recommended SOC Actions\n" + "\n".join(f"- {a}" for a in actions),
        }

    async def explain_anomaly(self, event: dict[str, Any]) -> dict[str, Any]:
        """
        Generate a plain-language explanation and SOC response plan for an anomaly.
        """
        # If no Anthropic client configured, use the high-fidelity local expert engine
        if not self._client and settings.ANTHROPIC_API_KEY:
            try:
                self._client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            except Exception as e:
                logger.warning("Failed to initialize Anthropic client: %s", e)

        if not self._client:
            logger.info("Claude API key not set or unavailable. Using Sybrai expert engine fallback.")
            return self._generate_fallback_explanation(event)

        event_context = self._format_event_context(event)

        system_prompt = (
            "You are a Tier-3 Cybersecurity Incident Response Specialist and Threat Analyst for Sybrai SOC.\n"
            "Your task is to analyze anomalous network/security telemetry, evaluate the threat, and provide a clear, "
            "actionable incident summary for security operators.\n\n"
            "You MUST respond ONLY with a valid JSON object formatted exactly as follows:\n"
            "{\n"
            '  "incident_summary": "<Plain-language 2-3 sentence executive summary explaining what occurred>",\n'
            '  "threat_assessment": "<Detailed assessment of severity, adversary objective, and potential blast radius>",\n'
            '  "recommended_actions": ["<Action 1>", "<Action 2>", "<Action 3>", "<Action 4>"],\n'
            '  "suggested_status": "INVESTIGATING"\n'
            "}"
        )

        user_prompt = f"Please analyze this high-risk security anomaly and formulate an incident response briefing:\n\n{event_context}"

        try:
            response = await self._client.messages.create(
                model=self.model,
                max_tokens=1000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=0.2,
            )

            response_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    response_text += block.text

            # Parse JSON out of response
            clean_json = response_text.strip()
            # If wrapped in markdown code blocks, strip them
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean_json, re.DOTALL)
            if match:
                clean_json = match.group(1)

            parsed = json.loads(clean_json)

            return {
                "incident_summary": parsed.get("incident_summary", ""),
                "threat_assessment": parsed.get("threat_assessment", ""),
                "recommended_actions": parsed.get("recommended_actions", []),
                "suggested_status": parsed.get("suggested_status", "INVESTIGATING"),
                "model_used": self.model,
                "raw_explanation": response_text,
            }

        except Exception as err:
            logger.error("Claude API invocation error: %s. Falling back to local engine.", err)
            fallback = self._generate_fallback_explanation(event)
            fallback["fallback_reason"] = str(err)
            return fallback


# Singleton instance
explainer = ClaudeExplainer()
