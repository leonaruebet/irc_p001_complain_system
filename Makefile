# IRC Complaint System - Makefile
# Author: Leo Naruebet
# Description: Commands to manage both frontend and backend services

.PHONY: help dev start-backend start-frontend stop install clean

# Default target
help:
	@echo "IRC Complaint System - Available Commands:"
	@echo ""
	@echo "  make dev          - Start both backend and frontend in development mode"
	@echo "  make start-backend - Start only backend server (port 3001)"
	@echo "  make start-frontend - Start only frontend server (port 3000)"
	@echo "  make install      - Install dependencies for both services"
	@echo "  make clean        - Clean node_modules and build artifacts"
	@echo "  make stop         - Stop all running services"
	@echo ""

# Start both services concurrently
dev:
	@echo "🚀 Starting IRC Complaint System in development mode..."
	@echo "📡 Backend will run on http://localhost:3001"
	@echo "🌐 Frontend will run on http://localhost:3000"
	@echo ""
	@trap 'kill %1 %2 2>/dev/null; exit' INT TERM; \
	$(MAKE) start-backend & \
	$(MAKE) start-frontend & \
	wait

# Start backend only
start-backend:
	@echo "🔧 Starting backend server on port 3001..."
	@cd backend && npm run dev

# Start frontend only  
start-frontend:
	@echo "🎨 Starting frontend server on port 3000..."
	@cd web && npm run dev

# Install dependencies
install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	@cd web && npm install
	@echo "✅ All dependencies installed successfully!"

# Clean build artifacts and node_modules
clean:
	@echo "🧹 Cleaning build artifacts and dependencies..."
	@rm -rf backend/node_modules
	@rm -rf web/node_modules
	@rm -rf web/.next
	@echo "✅ Cleanup completed!"

# Stop all services (requires manual Ctrl+C for now)
stop:
	@echo "⚠️  Please use Ctrl+C to stop running services"
	@echo "🔍 You can also use: pkill -f 'npm run dev'"