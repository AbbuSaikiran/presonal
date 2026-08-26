"""
Isolation Forest Anomaly Detection Engine for Sybrai.

Scores incoming network and security telemetry events to identify
statistical anomalies, anomalous traffic bursts, port scanning,
credential stuffing, data exfiltration, and lateral movement.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger("sybrai.ml")

# Known sensitive ports often targeted during attacks
SENSITIVE_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    135: "RPC",
    139: "NetBIOS",
    443: "HTTPS",
    445: "SMB",
    1433: "MSSQL",
    1521: "Oracle",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    9200: "Elasticsearch",
    27017: "MongoDB",
}

PROTOCOL_MAP = {
    "HTTP": 1,
    "HTTPS": 2,
    "SSH": 3,
    "DNS": 4,
    "FTP": 5,
    "SMTP": 6,
    "RDP": 7,
    "SMB": 8,
    "TCP": 9,
    "UDP": 10,
    "ICMP": 11,
}

MITRE_MAPPING = {
    "SQL Injection": ("Initial Access", "T1190 - Exploit Public-Facing Application"),
    "Brute Force": ("Credential Access", "T1110 - Brute Force"),
    "Port Scan": ("Discovery", "T1046 - Network Service Discovery"),
    "DDoS": ("Impact", "T1498 - Network Denial of Service"),
    "Malware C2": ("Command and Control", "T1071 - Application Layer Protocol"),
    "Privilege Escalation": ("Privilege Escalation", "T1068 - Exploitation for Privilege Escalation"),
    "Data Exfiltration": ("Exfiltration", "T1048 - Exfiltration Over Alternative Protocol"),
    "Phishing": ("Initial Access", "T1566 - Phishing"),
    "Credential Stuffing": ("Credential Access", "T1110.004 - Credential Stuffing"),
    "Lateral Movement": ("Lateral Movement", "T1021 - Remote Services"),
    "Zero-Day": ("Defense Evasion", "T1211 - Exploitation for Defense Evasion"),
    "DNS Tunneling": ("Exfiltration", "T1071.004 - DNS"),
}


class AnomalyDetector:
    def __init__(self, contamination: float = 0.1, random_state: int = 42) -> None:
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.model = IsolationForest(
            n_estimators=120,
            contamination=self.contamination,
            max_samples="auto",
            random_state=self.random_state,
            n_jobs=-1,
        )
        self._is_fitted = False
        self._fit_baseline_model()

    def _extract_feature_vector(self, event: dict[str, Any]) -> list[float]:
        """Extract a fixed-length numerical feature vector from an event."""
        packets = float(event.get("packets_transferred", 0) or 0)
        bytes_transferred = float(event.get("bytes_transferred", 0) or 0)
        attempts = float(event.get("attempt_count", 1) or 1)
        src_port = float(event.get("source_port", 0) or 0)
        dst_port = float(event.get("destination_port", 0) or 0)
        proto_str = str(event.get("protocol", "TCP")).upper()
        proto_code = float(PROTOCOL_MAP.get(proto_str, 0))

        bytes_per_pkt = bytes_transferred / (packets + 1.0)
        is_priv_port = 1.0 if (0 < dst_port < 1024) else 0.0
        is_sensitive = 1.0 if dst_port in SENSITIVE_PORTS else 0.0
        high_attempts = 1.0 if attempts > 15 else 0.0
        log_bytes = math.log1p(max(0.0, bytes_transferred))
        log_packets = math.log1p(max(0.0, packets))

        return [
            log_packets,
            log_bytes,
            attempts,
            dst_port,
            src_port,
            proto_code,
            bytes_per_pkt,
            is_priv_port,
            is_sensitive,
            high_attempts,
        ]

    def _fit_baseline_model(self) -> None:
        """Train Isolation Forest on synthetic baseline normal and anomalous traffic."""
        rng = np.random.default_rng(self.random_state)
        n_normal = 2000
        n_anomaly = 200

        # Normal traffic: low attempts (1-5), standard ports (80, 443, 53), moderate byte/packet ratios
        normal_packets = rng.exponential(scale=150, size=n_normal) + 5
        normal_bytes = normal_packets * rng.uniform(40, 1500, size=n_normal)
        normal_attempts = rng.integers(1, 4, size=n_normal)
        normal_dst_ports = rng.choice([80, 443, 53, 8080], size=n_normal)
        normal_src_ports = rng.integers(1024, 65535, size=n_normal)
        normal_proto = rng.choice([1, 2, 4], size=n_normal)

        normal_feats = []
        for i in range(n_normal):
            b_per_p = normal_bytes[i] / (normal_packets[i] + 1)
            dp = float(normal_dst_ports[i])
            normal_feats.append([
                math.log1p(normal_packets[i]),
                math.log1p(normal_bytes[i]),
                float(normal_attempts[i]),
                dp,
                float(normal_src_ports[i]),
                float(normal_proto[i]),
                b_per_p,
                1.0 if dp < 1024 else 0.0,
                1.0 if dp in SENSITIVE_PORTS else 0.0,
                0.0,
            ])

        # Anomalous traffic: brute-force bursts, huge data transfers, port sweeps, sensitive db targets
        anom_feats = []
        for _ in range(n_anomaly):
            mode = rng.choice(["brute_force", "exfiltration", "port_scan", "db_probe"])
            if mode == "brute_force":
                p = float(rng.integers(50, 5000))
                b = p * rng.uniform(50, 200)
                att = float(rng.integers(40, 600))
                dp = float(rng.choice([22, 3389, 445, 1433]))
                proto = float(rng.choice([3, 7, 8]))
            elif mode == "exfiltration":
                p = float(rng.integers(5000, 100000))
                b = float(rng.integers(10_000_000, 100_000_000))
                att = float(rng.integers(1, 10))
                dp = float(rng.choice([443, 8443, 53, 21]))
                proto = float(rng.choice([2, 4, 5]))
            elif mode == "port_scan":
                p = float(rng.integers(100, 2000))
                b = p * 40.0
                att = float(rng.integers(50, 400))
                dp = float(rng.integers(1, 10000))
                proto = 9.0  # TCP
            else:  # db_probe
                p = float(rng.integers(20, 800))
                b = p * 600.0
                att = float(rng.integers(15, 120))
                dp = float(rng.choice([5432, 3306, 27017, 6379, 1521]))
                proto = 9.0

            b_per_p = b / (p + 1.0)
            anom_feats.append([
                math.log1p(p),
                math.log1p(b),
                att,
                dp,
                float(rng.integers(1024, 65535)),
                proto,
                b_per_p,
                1.0 if dp < 1024 else 0.0,
                1.0 if dp in SENSITIVE_PORTS else 0.0,
                1.0 if att > 15 else 0.0,
            ])

        X = np.array(normal_feats + anom_feats, dtype=np.float64)
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        self.model.fit(X_scaled)
        self._is_fitted = True
        logger.info("Isolation Forest anomaly detector initialized with %d samples.", len(X))

    def score_event(
        self,
        event: dict[str, Any],
        threshold: float = 0.65,
    ) -> dict[str, Any]:
        """
        Score a single telemetry event.

        Returns:
            anomaly_score: float (0.0 to 1.0)
            is_anomaly: bool
            risk_level: str ("CRITICAL" | "HIGH" | "MEDIUM" | "LOW")
            confidence_score: int (50 to 99)
            false_positive_rate: float
            factors: list of identified anomaly triggers
            mitre_tactic: suggested MITRE ATT&CK tactic
            mitre_technique: suggested MITRE ATT&CK technique
        """
        if not self._is_fitted:
            self._fit_baseline_model()

        feat_vector = self._extract_feature_vector(event)
        X_sample = np.array([feat_vector], dtype=np.float64)
        X_scaled = self.scaler.transform(X_sample)

        # IsolationForest decision_function: lower means more anomalous (negative for anomalies)
        raw_score = float(self.model.decision_function(X_scaled)[0])

        # Normalize score into a friendly 0.0 (safe) to 1.0 (severe anomaly) scale
        # Typically decision_function ranges from -0.35 (severe anomaly) to +0.25 (very normal)
        # Using sigmoid transformation centered around -0.05
        shifted = -raw_score * 4.5
        normalized_score = 1.0 / (1.0 + math.exp(-shifted))
        normalized_score = max(0.0, min(1.0, round(normalized_score, 4)))

        # Rule-based heuristics for critical threats
        attempts = int(event.get("attempt_count", 1) or 1)
        bytes_trans = int(event.get("bytes_transferred", 0) or 0)
        packets_trans = int(event.get("packets_transferred", 0) or 0)
        dst_port = int(event.get("destination_port", 0) or 0)
        event_type = str(event.get("type", "")).lower()

        factors: list[str] = []

        if attempts >= 100:
            factors.append(f"Excessive connection attempts ({attempts:,} attempts in short window)")
            normalized_score = max(normalized_score, 0.88)
        elif attempts >= 25:
            factors.append(f"Elevated attempt volume ({attempts} attempts)")
            normalized_score = max(normalized_score, 0.72)

        if bytes_trans >= 10_000_000:
            mb = bytes_trans / (1024 * 1024)
            factors.append(f"High outbound/inbound volume ({mb:.1f} MB payload)")
            normalized_score = max(normalized_score, 0.86)

        if dst_port in SENSITIVE_PORTS:
            service_name = SENSITIVE_PORTS[dst_port]
            factors.append(f"Targeting sensitive infrastructure port {dst_port} ({service_name})")
            if attempts > 10:
                normalized_score = max(normalized_score, 0.78)

        if packets_trans > 0:
            ratio = bytes_trans / packets_trans
            if ratio > 5000:
                factors.append(f"Abnormal byte-to-packet ratio ({ratio:.0f} bytes/pkt)")
                normalized_score = max(normalized_score, 0.75)

        if any(kw in event_type for kw in ["injection", "sql", "exploit", "c2", "ransomware", "zero-day"]):
            factors.append(f"Signature match for high-severity attack pattern: {event.get('type')}")
            normalized_score = max(normalized_score, 0.85)

        if not factors:
            if normalized_score >= threshold:
                factors.append("Statistical feature outlier in multi-dimensional telemetry space")
            else:
                factors.append("Telemetry metrics within normal baseline distribution")

        # Derive risk level
        if normalized_score >= 0.85:
            risk_level = "CRITICAL"
        elif normalized_score >= 0.70:
            risk_level = "HIGH"
        elif normalized_score >= 0.50:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        is_anomaly = bool(normalized_score >= threshold)

        # Confidence & False Positive Rate
        confidence = int(min(99, max(50, round(50 + (normalized_score * 45)))))
        fp_rate = round(max(0.01, min(0.20, (1.0 - normalized_score) * 0.25)), 3)

        # MITRE ATT&CK Mapping
        mitre_tactic = event.get("mitre_tactic")
        mitre_technique = None
        for key, (tac, tech) in MITRE_MAPPING.items():
            if key.lower() in event_type:
                mitre_tactic = mitre_tactic or tac
                mitre_technique = tech
                break

        if not mitre_tactic:
            if risk_level in ["CRITICAL", "HIGH"]:
                mitre_tactic = "Initial Access"
                mitre_technique = "T1190 - Exploit Public-Facing Application"
            else:
                mitre_tactic = "Reconnaissance"
                mitre_technique = "T1595 - Active Scanning"

        return {
            "anomaly_score": normalized_score,
            "is_anomaly": is_anomaly,
            "risk_level": risk_level,
            "confidence_score": confidence,
            "false_positive_rate": fp_rate,
            "anomaly_factors": factors,
            "mitre_tactic": mitre_tactic,
            "mitre_technique": mitre_technique,
            "threshold": threshold,
        }


# Singleton instance
detector = AnomalyDetector()
