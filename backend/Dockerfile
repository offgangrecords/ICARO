# Use uma imagem oficial do Node.js com suporte a Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta que o app vai rodar
EXPOSE 3001

# Variável de ambiente para o Puppeteer rodar em modo headless no Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Comando para rodar a aplicação
CMD ["node", "index.js"]
