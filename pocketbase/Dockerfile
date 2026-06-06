# Dockerfile para Pocketbase no Render

FROM golang:1.21-alpine as builder

RUN apk add --no-cache git

WORKDIR /app

# Clonar e compilar Pocketbase
RUN git clone https://github.com/pocketbase/pocketbase.git . && \
    go mod download && \
    CGO_ENABLED=0 go build -o pocketbase cmd/main.go

# Stage final
FROM alpine:latest

RUN apk add --no-cache ca-certificates

WORKDIR /pb

COPY --from=builder /app/pocketbase /pb/pocketbase

# Criar volumes para dados persistentes
VOLUME ["/pb/pb_data"]

# Expor porta
EXPOSE 8090

# Comando para rodar
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
