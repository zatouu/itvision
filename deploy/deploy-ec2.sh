#!/bin/bash
# === Deploy Ligey backend to EC2 ===
# Usage: ssh user@EC2_IP 'bash -s' < deploy/deploy-ec2.sh
# Or run directly on EC2 after git clone

set -e

echo "=== 1. Install dependencies ==="
cd /home/ubuntu/itvision-1  # adjust path
npm ci --production=false

echo "=== 2. Build Next.js ==="
npm run build

echo "=== 3. Seed categories ==="
npx tsx scripts/seed-categories.ts || echo "Seed skipped (may already exist)"

echo "=== 4. Start with PM2 ==="
npm install -g pm2 || true
pm2 delete ligey 2>/dev/null || true
pm2 start server.js --name ligey --env production

echo "=== 5. Open firewall ==="
# Make sure port 3000 is open in EC2 security group!
echo "IMPORTANT: Open port 3000 (or 80/443 with nginx) in your EC2 Security Group"

echo "=== Done! Server running on port 3000 ==="
echo "Test: curl http://localhost:3000/api/services/categories"
pm2 logs ligey --lines 5
