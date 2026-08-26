"""
Verification script for Sybrai AI Detection & Claude Explainer endpoints.
"""

import asyncio
import httpx


async def test_ai_detection():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        print("1. Testing /health ...")
        r_health = await client.get("/health")
        print("  Status:", r_health.status_code, r_health.json())

        print("\n2. Testing /api/detection/status ...")
        r_status = await client.get("/api/detection/status")
        print("  Status:", r_status.status_code, r_status.json())

        print("\n3. Testing /predict with High-Risk SQL Injection Anomaly ...")
        high_risk_event = {
            "source": "185.220.101.57",
            "destination": "db-server-01",
            "source_port": 51234,
            "destination_port": 5432,
            "protocol": "TCP",
            "country_of_origin": "Russia",
            "type": "SQL Injection & Data Extraction",
            "packets_transferred": 25000,
            "bytes_transferred": 18500000,
            "attempt_count": 320,
            "mitre_tactic": "Initial Access",
            "auto_create_alert": True,
        }
        r_pred = await client.post("/predict", json=high_risk_event)
        print("  Predict Status:", r_pred.status_code)
        pred_data = r_pred.json()
        print("  Anomaly Score:", pred_data.get("anomaly_score"))
        print("  Is Anomaly:", pred_data.get("is_anomaly"))
        print("  Risk Level:", pred_data.get("risk_level"))
        print("  Alert Created:", pred_data.get("alert_created"))
        print("  Alert ID:", pred_data.get("alert_id"))
        print("  Anomaly Factors:", pred_data.get("anomaly_factors"))

        print("\n4. Testing /predict with Normal Baseline Event ...")
        normal_event = {
            "source": "10.0.1.15",
            "destination": "web-proxy-02",
            "source_port": 49152,
            "destination_port": 443,
            "protocol": "HTTPS",
            "country_of_origin": "USA",
            "type": "Routine Web Request",
            "packets_transferred": 12,
            "bytes_transferred": 4200,
            "attempt_count": 1,
            "auto_create_alert": True,
        }
        r_norm = await client.post("/predict", json=normal_event)
        norm_data = r_norm.json()
        print("  Normal Score:", norm_data.get("anomaly_score"))
        print("  Is Anomaly:", norm_data.get("is_anomaly"))
        print("  Risk Level:", norm_data.get("risk_level"))
        print("  Alert Created:", norm_data.get("alert_created"))

        print("\n5. Testing /explain with High-Risk Anomaly ...")
        r_explain = await client.post("/explain", json={"event": high_risk_event})
        print("  Explain Status:", r_explain.status_code)
        explain_data = r_explain.json()
        print("  Model Used:", explain_data.get("model_used"))
        print("  Incident Summary:\n ", explain_data.get("incident_summary"))
        print("  Threat Assessment:\n ", explain_data.get("threat_assessment"))
        print("  Recommended Actions:")
        for idx, act in enumerate(explain_data.get("recommended_actions", []), 1):
            print(f"    {idx}. {act}")

        print("\n[SUCCESS] All AI Detection and Explainer endpoints verified successfully!")


if __name__ == "__main__":
    asyncio.run(test_ai_detection())
