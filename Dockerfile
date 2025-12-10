### Backend (Scanner Service) Dockerfile
### Huawei Cloud / CCE / SWR uyumlu, production için optimize multi-stage build

# 1) BUILD STAGE — tüm dev dependency'ler burada
# TensorFlow.js için tam Debian image kullanıyoruz (slim yeterli değil)
FROM node:18 AS builder

WORKDIR /usr/src/app

# Sadece package dosyalarını kopyala (cache için önemli)
COPY package*.json ./

# Dev dependency'ler dahil tam kurulum (build için gerekli)
RUN npm install

# TypeScript, test config ve kaynak kodlar
COPY tsconfig.json jest.config.cjs ./
COPY src ./src
COPY tests ./tests

# Prod build (dist klasörü oluşur)
RUN npm run build


# 2) RUNTIME STAGE — sadece production dependency'ler
# TensorFlow.js için tam Debian image kullanıyoruz
FROM node:18 AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

# Sadece production dependency'leri kur
COPY package*.json ./
RUN npm install --omit=dev

# Build edilmiş kodu kopyala
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]

