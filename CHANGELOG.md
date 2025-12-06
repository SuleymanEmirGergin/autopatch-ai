# Değişiklik Geçmişi

## [2025-12-03] Tek Localhost Portu (8080) Üzerinden Erişim

### Yapılan Değişiklikler

#### 1. Backend Port Değişikliği
- **Eski Port**: 3000 (Antigravity ile çakışma)
- **Yeni Port**: 5000
- **Dosya**: `src/config/index.ts`

#### 2. Nginx Reverse Proxy Eklendi
- **Port**: 8080
- **Dosyalar**: 
  - `nginx.conf` (yeni)
  - `docker-compose.yml` (güncellendi)

#### 3. Frontend API URL Yapılandırması
- **Client-side**: `/api` (nginx üzerinden)
- **Server-side**: `http://localhost:5000` (direkt backend)
- **Dosyalar**:
  - `frontend/lib/api.ts`
  - `frontend/lib/websocket.ts`
  - `frontend/pages/api/*.ts` (tüm API route'ları)

#### 4. WebSocket Yapılandırması
- **Client-side**: `window.location.origin` (nginx üzerinden)
- **Server-side**: `http://localhost:5000` (direkt backend)
- **Dosya**: `frontend/lib/websocket.ts`

### Servis Yönlendirmeleri (Nginx)

- `http://localhost:8080/` → Frontend (Next.js)
- `http://localhost:8080/api` → Backend API
- `http://localhost:8080/docs` → Swagger UI
- `http://localhost:8080/health` → Health Check
- `http://localhost:8080/socket.io` → WebSocket

### Kullanım

#### Servisleri Başlatma

1. **MongoDB ve Nginx**:
   ```bash
   docker compose up -d mongo nginx
   ```

2. **Backend** (port 5000):
   ```bash
   cd /home/emir/Masaüstü/Huawei
   PORT=5000 npm run dev
   ```

3. **Frontend** (port 3002):
   ```bash
   cd /home/emir/Masaüstü/Huawei/frontend
   PORT=3002 npm run dev
   ```

4. **Tarayıcı**: http://localhost:8080

### Port Yapılandırması

- **3000**: Antigravity (değişmedi)
- **5000**: Backend API (yeni)
- **3002**: Frontend (değişmedi)
- **8080**: Nginx Reverse Proxy (yeni)
- **27017**: MongoDB (değişmedi)

### Notlar

- Tüm servisler tek port (8080) üzerinden erişilebilir
- Frontend API çağrıları otomatik olarak `/api` üzerinden yönlendirilir
- WebSocket bağlantıları nginx üzerinden çalışır
- Server-side rendering için direkt backend'e erişim kullanılır

