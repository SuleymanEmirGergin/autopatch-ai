### Frontend (Next.js) Dockerfile
### Huawei Cloud / CCE / SWR uyumlu, production için optimize multi-stage build

# 1) BUILD STAGE — Next.js production build
FROM node:18-alpine AS builder

WORKDIR /app

# Bağımlılıkların cache'lenebilmesi için önce package dosyalarını kopyala
COPY package*.json ./

RUN npm install

# Kalan tüm frontend dosyaları
COPY . .

# Production build
RUN npm run build


# 2) RUNTIME STAGE — sadece production dependency'ler
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Sadece production dependency'leri kur
COPY package*.json ./
RUN npm install --omit=dev

# Build çıktısını ve gerekli dosyaları kopyala
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package*.json ./

EXPOSE 3002

# Next.js production server
CMD ["npm", "run", "start"]


