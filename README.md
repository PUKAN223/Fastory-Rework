# Fastory-Rework

ระบบจัดการสินค้าและขายหน้าร้าน (POS)

## Production Deployment with Docker

สามารถนำโปรเจกต์นี้ไปรันบนเครื่องเซิร์ฟเวอร์หรือเครื่องอื่นได้ทันทีโดยใช้ Docker Compose:

### Prerequisities
- Docker & Docker Compose installed

### Option A: Pull pre-built images from Docker Hub (แนะนำสำหรับต่างเครื่อง - รวดเร็ว ไม่ต้อง build)

```bash
# Pull pre-built images from Docker Hub
docker compose -f docker-compose.prod.yml pull

# Start containers
docker compose -f docker-compose.prod.yml up -d
```

### Option B: Build locally from source code

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build
```

### Services & Ports
- **Frontend (Web App)**: `http://localhost:3000`
- **Backend (Elysia API)**: `http://localhost:8080`
- **Database (PostgreSQL 16)**: `localhost:5432`

### Useful Commands

```bash
# Check status of containers
docker compose ps

# View container logs
docker compose logs -f

# Stop services
docker compose down
```

---

## 🛠️ การตั้งค่าบน Docker Hoster (กรณีไม่มีช่องให้แนบไฟล์ docker-compose.prod.yml)

คุณสามารถเลือกตั้งค่าได้ **2 วิธี**:

### วิธีที่ 1: Copy-Paste ข้อความ YAML ไปวางในเว็บ Hoster (Stack / Docker Compose Editor)

ก๊อปปี้ข้อความด้านล่างนี้ไปวางในช่อง YAML/Stack ของเว็บ Hoster ได้ทันที:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: fastory-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: fastory
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d fastory"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    image: kisu221/fastory-backend:latest
    container_name: fastory-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      PORT: 8080
      DATABASE_URL: "postgresql://postgres:postgrespassword@postgres:5432/fastory?schema=public"
      DIRECT_URL: "postgresql://postgres:postgrespassword@postgres:5432/fastory?schema=public"
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    image: kisu221/fastory-web:latest
    container_name: fastory-web
    restart: always
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      API_URL: "http://backend:8080"
      NEXT_PUBLIC_BASE_URL: "http://localhost:8080"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

### วิธีที่ 2: ตั้งค่าราย Container ในหน้าเว็บ Hoster (GUI Form)

หากเว็บ Hoster ให้กรอกข้อมูลราย App/Container ให้กรอกข้อมูลตามนี้:

#### 1. Database Service
- **Image**: `postgres:16-alpine`
- **Port**: `5432`
- **Environment Variables**:
  - `POSTGRES_USER` = `postgres`
  - `POSTGRES_PASSWORD` = `postgrespassword`
  - `POSTGRES_DB` = `fastory`

#### 2. Backend Service
- **Image**: `kisu221/fastory-backend:latest`
- **Port**: `8080`
- **Environment Variables**:
  - `PORT` = `8080`
  - `NODE_ENV` = `production`
  - `DATABASE_URL` = `postgresql://postgres:postgrespassword@<postgres_host_or_ip>:5432/fastory?schema=public`

#### 3. Frontend Service
- **Image**: `kisu221/fastory-web:latest`
- **Port**: `3000`
- **Environment Variables**:
  - `PORT` = `3000`
  - `API_URL` = `http://<backend_host_or_ip>:8080`
  - `NEXT_PUBLIC_BASE_URL` = `http://<backend_public_ip_or_domain>:8080`

---

## ☁️ วิธีการ Deploy บน AWS (Amazon Web Services)

วิธีที่แนะนำ ประหยัด และทำได้ง่ายที่สุดบน AWS คือการใช้ **AWS EC2 (Ubuntu)** ร่วมกับ Docker Compose:

### Step 1: สร้าง EC2 Instance บน AWS Console
1. เข้าไปที่ AWS Management Console -> **EC2** -> **Launch Instance**
2. เลือก OS: **Ubuntu 24.04 LTS** (หรือ Amazon Linux 2023)
3. เลือก Instance Type: `t3.micro` หรือ `t3.small` (มี Free Tier)
4. ตั้งค่า **Security Group (Inbound Rules)** ให้เปิด Port ดังนี้:
   - `SSH (22)` - สำหรับการรีโมทเข้าเครื่อง
   - `HTTP (80)` / `HTTPS (443)`
   - `Custom TCP (3000)` - สำหรับ Web Frontend
   - `Custom TCP (8080)` - สำหรับ Backend API

### Step 2: SSH เข้าเครื่อง EC2 และติดตั้ง Docker
```bash
# SSH เข้าเครื่อง EC2
ssh -i "your-key.pem" ubuntu@<your-ec2-public-ip>

# อัปเดตแพ็กเกจและติดตั้ง Docker & Docker Compose
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
```

### Step 3: ดึงไฟล์โปรเจกต์และรันระบบ
```bash
# Clone Repo หรือสร้างโฟลเดอร์สำหรับโปรเจกต์
git clone <your-repo-url> fastory
cd fastory

# ดึง Image สำเร็จรูปจาก Docker Hub และสั่งรันระบบ
docker compose pull
docker compose up -d
```

### Step 4: ทดสอบการใช้งาน
- **Frontend Web**: `http://<EC2-Public-IP>:3000`
- **Backend API**: `http://<EC2-Public-IP>:8080`

---

## 🌐 วิธีการ Deploy บน GCP (Google Cloud Platform)

### วิธีที่ 1: Google Compute Engine (VM) - แนะนำ ทำได้ง่ายที่สุด

#### Step 1: สร้าง VM Instance บน GCP Console
1. เข้าไปที่ GCP Console -> **Compute Engine** -> **VM instances** -> กด **Create Instance**
2. เลือก Machine Type: `e2-micro` (Free tier) หรือ `e2-small`
3. เลือก Boot Disk: **Ubuntu 24.04 LTS**
4. ในส่วน **Firewall**: ติ๊กเลือก `Allow HTTP traffic` และ `Allow HTTPS traffic`
5. ไปที่ **VPC Network** -> **Firewall** -> กด **Create Firewall Rule**:
   - เปิด Target tags: `http-server`
   - Protocols/Ports: TCP `3000`, `8080`

#### Step 2: SSH เข้า VM และติดตั้ง Docker
```bash
# กดปุ่ม SSH ในหน้าเว็บ GCP Console เพื่อเปิด Terminal เข้าเครื่อง VM

# ติดตั้ง Docker & Docker Compose
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
newgrp docker
```

#### Step 3: ดึงไฟล์โปรเจกต์และสั่งรัน
```bash
# Clone Repo
git clone <your-repo-url> fastory
cd fastory

# ดึง Image จาก Docker Hub และเริ่มทำงาน
docker compose pull
docker compose up -d
```

---

### วิธีที่ 2: Google Cloud Run (Serverless)

หากต้องการรันแบบ Serverless ไม่ต้องดูแลเซิร์ฟเวอร์:

1. **Database**: สร้าง **Cloud SQL for PostgreSQL**
2. **Backend**: ไปที่ **Cloud Run** -> **Create Service** -> ระบุ Container Image `kisu221/fastory-backend:latest` -> ตั้งค่า Environment `DATABASE_URL` ชี้ไปที่ Cloud SQL
3. **Frontend**: ไปที่ **Cloud Run** -> **Create Service** -> ระบุ Container Image `kisu221/fastory-web:latest` -> ตั้งค่า Environment `API_URL` ชี้ไปที่ Cloud Run Backend



