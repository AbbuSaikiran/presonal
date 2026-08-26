/**
 * Mock threat alert data for Sybrai dashboard.
 * In production, replace with real API calls.
 */

const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'FALSE_POSITIVE']
const SOURCES = [
  '192.168.1.104', '10.0.5.231', '172.16.8.42', '185.220.101.57',
  '45.142.212.100', '89.248.167.131', '103.21.244.0', '198.51.100.14',
  '203.0.113.8', '91.108.4.5', '192.99.168.50', '77.88.21.3',
]
const ATTACK_TYPES = [
  'SQL Injection Attempt', 'Brute Force Attack', 'Port Scan Detected',
  'DDoS Traffic Spike', 'Malware C2 Beacon', 'Privilege Escalation',
  'Data Exfiltration', 'Phishing Link Clicked', 'Zero-Day Exploit Attempt',
  'Credential Stuffing', 'XSS Payload Injected', 'Ransomware Signature Detected',
  'Lateral Movement', 'Insider Threat Behavior', 'DNS Tunneling',
]
const PROTOCOLS = ['HTTP', 'HTTPS', 'SSH', 'FTP', 'SMTP', 'DNS', 'RDP', 'SMB']
const DESTINATIONS = [
  'db-server-01', 'web-proxy-02', 'auth-service', 'api-gateway',
  'file-server-03', 'mail-relay', 'vpn-endpoint', 'k8s-master',
]
const COUNTRIES = ['Russia', 'China', 'North Korea', 'Iran', 'Unknown', 'USA', 'Netherlands', 'Germany']

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateTimestamp(daysAgo, hoursAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(d.getHours() - hoursAgo)
  d.setMinutes(randomInt(0, 59))
  d.setSeconds(randomInt(0, 59))
  return d.toISOString()
}

export const mockAlerts = Array.from({ length: 38 }, (_, i) => {
  const risk = RISK_LEVELS[Math.min(i % 6, 4)]
  const type = randomFrom(ATTACK_TYPES)
  const src = randomFrom(SOURCES)
  const dst = randomFrom(DESTINATIONS)
  const proto = randomFrom(PROTOCOLS)
  const country = randomFrom(COUNTRIES)
  const port = randomInt(1024, 65535)
  const dstPort = randomInt(20, 8443)
  const packetsTransferred = randomInt(100, 150000)
  const bytesTransferred = randomInt(1024, 50000000)
  const attemptCount = randomInt(1, 500)

  return {
    id: `ALT-${String(2024 + i).padStart(4, '0')}`,
    timestamp: generateTimestamp(Math.floor(i / 6), i % 24),
    source: src,
    destination: dst,
    source_port: port,
    destination_port: dstPort,
    protocol: proto,
    risk_level: risk,
    status: randomFrom(STATUSES),
    type,
    country_of_origin: country,
    packets_transferred: packetsTransferred,
    bytes_transferred: bytesTransferred,
    attempt_count: attemptCount,
    cve_id: i % 4 === 0 ? `CVE-${randomInt(2020, 2024)}-${randomInt(10000, 99999)}` : null,
    user_affected: i % 3 === 0 ? `user${randomInt(100, 999)}@corp.internal` : null,
    description: `${type} detected from ${src} targeting ${dst} on port ${dstPort} via ${proto}. ` +
      `${attemptCount} attempt${attemptCount > 1 ? 's' : ''} recorded. ` +
      `Traffic originated from ${country}.`,
    timeline: [
      {
        time: generateTimestamp(Math.floor(i / 6), i % 24),
        event: 'Alert triggered by IDS signature match',
        actor: 'System',
      },
      {
        time: generateTimestamp(Math.floor(i / 6), Math.max(0, (i % 24) - 1)),
        event: 'Automated threat correlation completed',
        actor: 'Threat Intelligence Engine',
      },
      i % 3 !== 0 ? null : {
        time: generateTimestamp(Math.floor(i / 6), Math.max(0, (i % 24) - 2)),
        event: 'Assigned to security analyst for review',
        actor: 'SOC Automation',
      },
    ].filter(Boolean),
    tags: [proto, country !== 'Unknown' ? 'geo-flagged' : null, risk === 'CRITICAL' ? 'priority-1' : null].filter(Boolean),
    assigned_to: i % 4 === 0 ? `analyst${randomInt(1, 5)}@sybrai.io` : null,
    mitre_tactic: randomFrom([
      'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
      'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
      'Collection', 'Exfiltration', 'Impact',
    ]),
    confidence_score: randomInt(55, 99),
    false_positive_rate: parseFloat((Math.random() * 0.15).toFixed(3)),
  }
}).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

export const mockStats = {
  total_alerts_today: 47,
  critical_open: 6,
  mitigated_24h: 23,
  avg_response_time_minutes: 12,
  threats_blocked: 184,
  endpoints_monitored: 342,
  active_investigations: 8,
  false_positive_rate: '4.2%',
}

export const mockThreatTrend = [
  { time: '00:00', critical: 2, high: 5, medium: 8, low: 12 },
  { time: '02:00', critical: 1, high: 3, medium: 6, low: 9 },
  { time: '04:00', critical: 0, high: 2, medium: 4, low: 7 },
  { time: '06:00', critical: 3, high: 7, medium: 11, low: 15 },
  { time: '08:00', critical: 5, high: 12, medium: 18, low: 22 },
  { time: '10:00', critical: 8, high: 15, medium: 24, low: 30 },
  { time: '12:00', critical: 6, high: 11, medium: 20, low: 25 },
  { time: '14:00', critical: 9, high: 18, medium: 27, low: 35 },
  { time: '16:00', critical: 7, high: 14, medium: 22, low: 28 },
  { time: '18:00', critical: 4, high: 9, medium: 16, low: 20 },
  { time: '20:00', critical: 3, high: 7, medium: 13, low: 17 },
  { time: '22:00', critical: 2, high: 5, medium: 10, low: 14 },
]

export const mockTopSources = [
  { ip: '185.220.101.57', country: 'Russia', count: 42, risk: 'CRITICAL' },
  { ip: '45.142.212.100', country: 'China', count: 38, risk: 'HIGH' },
  { ip: '89.248.167.131', country: 'Netherlands', count: 27, risk: 'HIGH' },
  { ip: '103.21.244.0', country: 'Unknown', count: 19, risk: 'MEDIUM' },
  { ip: '91.108.4.5', country: 'Iran', count: 15, risk: 'CRITICAL' },
]
