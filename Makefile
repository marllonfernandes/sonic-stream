# Makefile

.PHONY: install build-frontend start all deploy

install:
	cd backend && npm install
	cd frontend && npm install

build-frontend:
	cd frontend && npm run build

start:
	cd backend && npm start

all: install build-frontend start

deploy: build-frontend
	gcloud builds submit --config cloudbuild.yaml .