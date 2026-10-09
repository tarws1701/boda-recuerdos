const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const uploadButton = document.getElementById("uploadButton");
const statusMessage = document.getElementById("statusMessage");

// =====================================================
// CONEXIÓN: SOLO GOOGLE DRIVE PRINCIPAL
// =====================================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzKAuez5pEZwSym7uron25V6TFXsK7Mzx3kOTFwlAdjjduhUy4NTjP0lzJzpI1PrWAW/exec";
// =====================================================
// LÍMITES
// =====================================================

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;       // 8 MB
const MAX_VIDEO_SIZE = 80 * 1024 * 1024;     // 80 MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;    // 100 MB
const MAX_VIDEO_DURATION = 90;               // 1 minuto y 30 segundos

let selectedFiles = [];

// =====================================================
// SELECCIONAR ARCHIVOS
// =====================================================

fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);

    if (files.length === 0) return;

    for (const file of files) {
        const yaExiste = selectedFiles.some(
            f => f.name === file.name &&
                 f.size === file.size &&
                 f.lastModified === file.lastModified
        );

        if (yaExiste) continue;

        if (
            !file.type.startsWith("image/") &&
            !file.type.startsWith("video/")
        ) {
            mostrarEstado(`❌ ${file.name} no es una foto ni un video.`, true);
            continue;
        }

        if (file.type.startsWith("image/") && file.size > MAX_IMAGE_SIZE) {
            mostrarEstado(`❌ ${file.name} supera los 8 MB.`, true);
            continue;
        }

        if (file.type.startsWith("video/") && file.size > MAX_VIDEO_SIZE) {
            mostrarEstado(`❌ ${file.name} supera los 80 MB.`, true);
            continue;
        }

        if (file.type.startsWith("video/")) {
            const duracion = await obtenerDuracionVideo(file);

            if (duracion > MAX_VIDEO_DURATION) {
                mostrarEstado(
                    `❌ ${file.name} dura más de 1 minuto y 30 segundos.`,
                    true
                );
                continue;
            }
        }

        const totalActual = selectedFiles.reduce(
            (total, f) => total + f.size,
            0
        );

        if (totalActual + file.size > MAX_TOTAL_SIZE) {
            mostrarEstado(
                "❌ No puedes superar los 100 MB por envío. Elimina algún archivo e inténtalo nuevamente.",
                true
            );
            continue;
        }

        selectedFiles.push(file);
    }

    // Permite volver a elegir los mismos archivos.
    fileInput.value = "";
    actualizarLista();
});

// =====================================================
// MOSTRAR ARCHIVOS SELECCIONADOS
// =====================================================

function actualizarLista() {
    fileList.innerHTML = "";

    if (selectedFiles.length === 0) {
        uploadButton.disabled = true;
        mostrarEstado("", false);
        return;
    }

    selectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.classList.add("file-item");

        const preview = document.createElement("div");
        preview.classList.add("file-preview");

        if (file.type.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src);
            preview.appendChild(img);
        } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.muted = true;
            video.playsInline = true;
            preview.appendChild(video);
        }

        const info = document.createElement("div");
        info.classList.add("file-info");

        const nombre = document.createElement("div");
        nombre.classList.add("file-name");
        nombre.textContent = file.name;

        const tamano = document.createElement("div");
        tamano.classList.add("file-size");
        tamano.textContent = formatearTamano(file.size);

        info.appendChild(nombre);
        info.appendChild(tamano);

        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-file");
        deleteButton.type = "button";
        deleteButton.textContent = "✕";
        deleteButton.title = "Eliminar archivo";

        deleteButton.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            actualizarLista();
        });

        item.appendChild(preview);
        item.appendChild(info);
        item.appendChild(deleteButton);
        fileList.appendChild(item);
    });

    const total = selectedFiles.reduce(
        (sum, file) => sum + file.size,
        0
    );

    const totalElement = document.createElement("div");
    totalElement.classList.add("total-size");
    totalElement.textContent =
        `📦 Total seleccionado: ${formatearTamano(total)} / 100 MB`;

    fileList.appendChild(totalElement);
    uploadButton.disabled = false;
}

// =====================================================
// SUBIR ARCHIVOS AL DRIVE PRINCIPAL
// =====================================================

uploadButton.addEventListener("click", async () => {
    if (selectedFiles.length === 0) return;

    uploadButton.disabled = true;

    const archivosParaSubir = [...selectedFiles];
    let enviados = 0;
    let errores = 0;

    mostrarEstado("💕 Preparando tus recuerdos...", false);

    for (let i = 0; i < archivosParaSubir.length; i++) {
        const file = archivosParaSubir[i];

        try {
            mostrarEstado(
                `💕 Enviando ${i + 1} de ${archivosParaSubir.length}: ${file.name}`,
                false
            );

            const base64 = await convertirBase64(file);

            const datos = {
                nombre: file.name,
                tipo: file.type,
                archivo: base64
            };

            // Envío sin leer la respuesta, para evitar el bloqueo CORS.
            await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(datos)
            });

            enviados++;
        } catch (error) {
            errores++;
            console.error(`Error al enviar ${file.name}:`, error);
        }
    }

    if (errores === 0) {
        mostrarEstado(
            `💕 Se enviaron ${enviados} archivo(s). Revisa el Drive principal para confirmar que se guardaron.`,
            false
        );

        // Limpiar la selección al terminar el envío.
        selectedFiles = [];
        fileInput.value = "";
        fileList.innerHTML = "";
        uploadButton.disabled = true;
    } else {
        uploadButton.disabled = false;

        mostrarEstado(
            `⚠️ Se enviaron ${enviados} archivo(s) y hubo ${errores} error(es) de envío. Revisa el Drive antes de volver a intentarlo.`,
            true
        );
    }
});

// =====================================================
// CONVERTIR ARCHIVO A BASE64
// =====================================================

function convertirBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };

        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(file);
    });
}

// =====================================================
// OBTENER DURACIÓN DEL VIDEO
// =====================================================

function obtenerDuracionVideo(file) {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);

        video.preload = "metadata";

        video.onloadedmetadata = () => {
            const duracion = video.duration;
            URL.revokeObjectURL(url);
            resolve(duracion);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(999);
        };

        video.src = url;
    });
}

// =====================================================
// FORMATEAR TAMAÑO
// =====================================================

function formatearTamano(bytes) {
    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(1) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function mostrarEstado(mensaje, error) {
    statusMessage.textContent = mensaje;
    statusMessage.classList.toggle("error", error);
}
