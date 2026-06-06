# Dockerfile para Pocketbase - Usando imagem oficial
# Muito mais rápido e sem problemas de compilação

FROM ghcr.io/pocketbase/pocketbase:latest

# Expor porta
EXPOSE 8090

# Dados persistentes
VOLUME ["/pb/pb_data"]

# Comando para rodar
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
