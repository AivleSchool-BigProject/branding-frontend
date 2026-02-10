# -------- Build stage --------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # 의존성 설치
    COPY package.json package-lock.json* ./
    RUN npm install
    
    # 소스 복사 후 빌드
    COPY . .

    ARG VITE_API_BASE_URL
    ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

    RUN npm run build
    
    
    # -------- Run stage --------
    FROM nginx:1.25-alpine
    
    # 기본 nginx 설정 제거
    RUN rm /etc/nginx/conf.d/default.conf
    
    # 커스텀 nginx 설정 복사
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # 빌드 결과물 복사 (Vite = dist)
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    EXPOSE 80
    
    CMD ["nginx", "-g", "daemon off;"]