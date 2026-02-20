
# Makefile

.PHONY: install build-frontend start all

install:
	cd backend && npm install
	cd frontend && npm install

build-frontend:
	cd frontend && npm run build

start:
	cd backend && npm start

all: install build-frontend start