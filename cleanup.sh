#!/bin/bash

echo "🧹 Cleaning up bot processes..."

# Kill any running ts-node processes
echo "🔍 Looking for ts-node processes..."
pkill -f "ts-node" 2>/dev/null || echo "No ts-node processes found"

# Kill any running node processes that might be the bot
echo "🔍 Looking for node processes..."
pkill -f "node.*index" 2>/dev/null || echo "No node index processes found"

# Kill any processes with telegram in the name
echo "🔍 Looking for telegram-related processes..."
pkill -f "telegram" 2>/dev/null || echo "No telegram processes found"

# Wait a moment for processes to terminate
sleep 2

# Check if any processes are still running
echo "🔍 Checking for remaining processes..."
if pgrep -f "ts-node" > /dev/null; then
    echo "⚠️ Some ts-node processes are still running"
    pgrep -f "ts-node"
else
    echo "✅ All ts-node processes stopped"
fi

if pgrep -f "node.*index" > /dev/null; then
    echo "⚠️ Some node index processes are still running"
    pgrep -f "node.*index"
else
    echo "✅ All node index processes stopped"
fi

echo "🧹 Cleanup complete!"
echo "💡 You can now run: npm run dev" 