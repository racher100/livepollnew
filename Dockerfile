# Stage 1: build the React app
FROM node:20-alpine AS fe
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: build the Go binary
FROM golang:1.26-alpine AS be
WORKDIR /be
COPY backend/ .
RUN go mod download && CGO_ENABLED=0 go build -o /server .

# Stage 3: tiny runtime image serving API + built frontend
FROM alpine:3.20
RUN adduser -D app
WORKDIR /app
COPY --from=be /server .
COPY --from=fe /fe/dist ./static
USER app
ENV PORT=8080
EXPOSE 8080
CMD ["./server"]
