# 🚀 PushToWeb — SMS & Push to Telegram Gateway

<p align="center">
  <b>Autonomous self-hosted gateway and control panel for reliable real-time forwarding of SMS and mobile push notifications to Telegram.</b><br/>
  <i>Автономный шлюз и центр управления для надежной пересылки SMS и push-уведомлений приложений в Telegram в реальном времени.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v1.0.12--stable-0284c7.svg?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Android%208.0--15%20%7C%20Web%20%7C%20Docker-10b981.svg?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/telegram-Bot%20API%207.0+-0ea5e9.svg?style=flat-square" alt="Telegram Bot API" />
  <img src="https://img.shields.io/badge/privacy-100%25%20Zero--Telemetry-8b5cf6.svg?style=flat-square" alt="Privacy" />
  <img src="https://img.shields.io/badge/license-MIT-f59e0b.svg?style=flat-square" alt="License" />
</p>

<p align="center">
  <a href="#-english-documentation"><b>🇬🇧 English Documentation</b></a> • 
  <a href="#-документация-на-русском"><b>🇷🇺 Документация на русском</b></a>
</p>

---

<a name="-english-documentation"></a>
## 🇬🇧 English Documentation

### 📖 About the Project

**PushToWeb** is a modern, open-source, self-hosted forwarding gateway and control panel designed to securely capture incoming SMS messages and mobile application push notifications (including banking alerts, messengers, 2FA/OTP authentication codes) from your Android smartphone and deliver them directly into your personal Telegram bot, private group, or channel in real time.

Built inspired by the best self-hosted web control panels (such as 3x-ui / 3x-manager), PushToWeb focuses on maximum autonomy, high delivery reliability, sleek responsive dark/light interface, zero telemetry, and zero third-party dependencies.

---

### ✨ Key Features

1. **Real-Time SMS & Push Forwarding**
   - Independent switches for SMS forwarding and Application Push notifications.
   - Low latency delivery directly via Telegram Bot API with retry mechanism.
   - One-click connection test button to verify delivery instantaneously.

2. **Smart 2FA / OTP Code Extraction**
   - Built-in heuristics for extracting 4-8 digit verification codes from banks and services.
   - Formats one-time codes into Telegram mono-spaced `<code>123456</code>` format for 1-tap instant copying on phone or desktop.

3. **Application Filtering & Anti-Spam**
   - Pre-configured profiles for major banking and financial services.
   - Granular Whitelist and Blacklist routing modes.
   - Keyword filtering (inclusion / exclusion) and Regex matching.
   - **"2FA / OTP Only" global filter mode** to automatically suppress marketing spam while delivering critical verification codes.
   - **Automatic background notification suppression (`isOngoing=true`)**: filters persistent music player status, downloads, and system foreground tasks by default.

4. **Automated Telegram Bot Profile Setup**
   - One-click setup of official bot profile photo (avatar) and default descriptions:
     - **Profile Avatar**: Pre-bundled high-resolution square application icon.
     - **Welcome Description**: Shown when a user opens the bot dialog prior to pressing `/start`.
     - **About / Short Description**: Displayed in the bot's profile card and link previews.

5. **Dual SIM & Carrier Name Detection**
   - Identifies active SIM slot (SIM 1 / SIM 2) and formats carrier tags (e.g., MTS, Beeline, MegaFon, t2) in Telegram notifications.
   - Selective SIM slot filtering.

6. **Android Native Service & Background Persistence**
   - Background foreground service with persistent status bar notification (`🟢 Active: SMS [ON] · Push [ON]`).
   - Battery optimization exemption guide and native Android bridge integration.
   - Ready-to-build Native Android Kotlin project export (Gradle, NotificationListenerService, SmsBroadcastReceiver).

7. **Security & Zero Telemetry**
   - 100% zero analytics, telemetry, or external tracking.
   - Masking of sensitive 16-digit bank card numbers (e.g. `4276 **** **** 9012`).
   - All bot tokens, chat IDs, and rules remain stored locally in your browser and on your private server.

---

### 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Android Device                       │
│  • Incoming SMS (BroadcastReceiver)                    │
│  • App & Bank Notifications (NotificationListener)     │
│  • Foreground Service with Status Bar Icon             │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST (Secured with Gateway API Key)
                            ▼
┌────────────────────────────────────────────────────────┐
│             PushToWeb Gateway / Server                 │
│  • Gateway API Key Authentication                      │
│  • Background & Ongoing Notification Filtering         │
│  • Duplicate Suppression (configurable window)         │
│  • Regex, Keywords & Whitelist/Blacklist Engine        │
│  • Smart 2FA / OTP Code Detection                      │
│  • Telegram HTML Template Renderer                     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Telegram Bot API 7.0+)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Telegram Chat / Channel                  │
│  📩 Instant formatted alert with 1-tap copy OTP code!  │
└────────────────────────────────────────────────────────┘
```

---

### ⚡ Quick Start

#### 1. Configure Telegram Bot
1. Open [@BotFather](https://t.me/BotFather) in Telegram and send `/newbot` to create a new bot.
2. Copy the generated **HTTP API Bot Token**.
3. Open your new bot in Telegram and click **START** (`/start`) — *this is required by Telegram for bots to message users*.
4. Retrieve your **Chat ID** (e.g., using [@userinfobot](https://t.me/userinfobot) or your channel ID).
5. In the PushToWeb panel under **«Telegram & Gateway»**:
   - Paste your **Bot Token** and click **Verify Token**.
   - Paste your **Chat ID** or click **Auto-detect Chat ID**.
   - Click **Apply Bot Profile & Avatar** to automatically set up the bot's avatar and descriptions in Telegram.
   - Click **Send Test Message** to confirm delivery.

#### 2. Connect Your Android Device
Choose one of 3 simple methods:
- **Method A: Native Android APK Project** — Download the Kotlin source archive in the panel, build with Android Studio, or install the compiled APK.
- **Method B: MacroDroid / Tasker** — Download the one-click template file in the panel and import it into MacroDroid or Tasker.
- **Method C: Direct Webhook** — Send standard HTTP POST requests to the gateway endpoint.

---

### 📡 Webhook API Specification

**Endpoint:** `POST /api/forward?key=<gatewayApiKey>`  
**Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "type": "sms",
  "sender": "900",
  "text": "Card *4276: Purchase 1,250 RUB at SUPERMARKET. Balance: 14,200 RUB. Code: 7491",
  "appName": "SberBank",
  "packageName": "ru.sberbankmobile",
  "title": "Payment Authorization",
  "simSlot": 1,
  "operator": "MTS",
  "isOngoing": false
}
```

#### Successful Response:
```json
{
  "success": true,
  "forwarded": true,
  "telegramMessageId": 1428,
  "logId": "log_1728562300000_a1b2c"
}
```

---

### 💻 Installation & Self-Hosting

#### Using Node.js:
```bash
# Clone repository
git clone https://github.com/vegych/PushToWeb.git
cd PushToWeb

# Install dependencies
npm install

# Start development server
npm run dev

# Production build and run
npm run build
npm start
```
The server will start at `http://localhost:3000`.

---

<a name="-документация-на-русском"></a>
## 🇷🇺 Документация на русском

### 📖 О проекте

**PushToWeb** — современный открытый инструмент для пересылки входящих SMS-сообщений и системных уведомлений мобильных приложений (банковских пушей, мессенджеров, сервисов двухфакторной аутентификации) в личный Telegram бот, группу или канал в реальном времени.

Проект создан по образу лучших self-hosted панелей управления (в стиле 3x-ui / 3x-manager) с упором на максимальную автономность, отзывчивый интерфейс, безопасность и нулевую телеметрию.

---

### 📸 Возможности системы

1. **Главный дашборд (Dashboard & Telemetry)**
   - Мониторинг сервиса в реальном времени, 99.8% успешности доставки.
   - Раздельное управление SMS и Push-уведомлениями.
   - Быстрый тест связи с Telegram ботом в один клик.

2. **Фильтрация приложений и антиспам (App Rules & Banking)**
   - Предустановленные профили банков (СберБанк, Т-Банк, ВТБ, Альфа-Банк, Райффайзен, Госуслуги).
   - Черные и белые списки ключевых слов и регулярных выражений.
   - Режим «Только 2FA/OTP коды» для отсечения рекламного спама.
   - Автоматическая фильтрация фоновых/постоянных уведомлений Android (`isOngoing=true`) по умолчанию.

3. **Автоматическая настройка бота Telegram**
   - Установка фирменной аватарки бота и стандартных описаний (экран приветствия и карточка профиля) в один клик.

4. **Конструктор шаблонов оформления**
   - Выбор готовых стилей: «Классика», «Компактный», «Только код», «Подробный».
   - Умное распознавание OTP-кодов с форматированием в `<code>123456</code>` для мгновенного копирования в Telegram.
   - Поддержка Dual SIM с отображением оператора связи (МТС, билайн, МегаФон, t2).

5. **Android агент и строка состояния (Foreground Service)**
   - Постоянное системное уведомление в шторке (`🟢 Активен: SMS [ВКЛ] · Push [ВКЛ]`).
   - Работа 24/7 без выгрузки системой благодаря исключению из оптимизации батареи.
   - Защищенный локальный Webhook с проверкой API-ключа.

6. **Журнал событий и аудит (Live Audit Log)**
   - Полная история входящих сообщений со статусами доставки и причинами блокировок.
   - Поиск по отправителю, тексту и дате.

---

### ⚡ Быстрый старт

#### 1. Настройка Telegram бота
1. Откройте [@BotFather](https://t.me/BotFather) в Telegram и создайте нового бота командой `/newbot`.
2. Скопируйте полученный **Bot Token**.
3. Обязательно откройте вашего нового бота и нажмите кнопку **СТАРТ** (`/start`).
4. Узнайте ваш **Chat ID** (например, через бота [@userinfobot](https://t.me/userinfobot) или добавьте бота в нужную группу/канал).
5. В панели управления перейдите во вкладку **«Телеграм и шлюз»** и сохраните настройки.

#### 2. Подключение Android устройства
Доступно 3 удобных способа на выбор:
- **Способ А: Нативный Android APK проект** — скачайте исходники в панели управления, соберите в Android Studio или установите готовый APK.
- **Способ Б: MacroDroid / Tasker** — скачайте готовый файл шаблона макроса в один клик и импортируйте на телефон.
- **Способ В: Прямой Webhook** — отправляйте HTTP POST запросы на URL шлюза.

---

### 🔒 Безопасность и конфиденциальность

- **Zero Telemetry**: сервис не собирает никакой аналитики, метрик и пользовательских данных.
- **Локальное хранение**: все токены и правила хранятся локально в браузере и на вашем сервере.
- **API-Key авторизация**: шлюз отклоняет любые неавторизованные запросы.
- **Маскирование банковских данных**: скрытие номеров карт в сообщениях (`4276 **** **** 9012`).

---

### 📄 Лицензия

Распространяется под лицензией **MIT**. Полная свобода для личного и коммерческого использования.
