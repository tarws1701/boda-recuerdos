const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");

// URL de tu Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKAuez5pEZwSym7uron25V6TFXsK7Mzx3kOTFwlAdjjduhUy4NTjP0lzJzpI1PrWAW/exec";

fileInput.addEventListener("change", async () => {

    fileList.innerHTML = "";

    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        return;
    }

    for (const file of files) {

        const item = document.createElement("div");
        item.classList.add("file-item");

        item.textContent = `Subiendo ${file.name}...`;
        fileList.appendChild(item);

        try {

            // Convertir archivo a Base64
            const base64 = await convertirBase64(file);

            // Datos que enviaremos al Apps Script
            const datos = {
                nombre: file.name,
                tipo: file.type,
                archivo: base64
            };

            // Enviar archivo al Apps Script
            const respuesta = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            if (resultado.success) {

                item.textContent = `❤️ ${file.name} — ¡Guardado correctamente!`;

            } else {

                item.textContent = `❌ ${file.name} — ${resultado.mensaje}`;

            }

        } catch (error) {

            console.error(error);

            item.textContent =
                `❌ ${file.name} — No se pudo subir`;

        }
    }

});


// Convierte el archivo en Base64
function convertirBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => {

            // Quitamos "data:image/...;base64,"
            // y dejamos solamente el contenido Base64
            const base64 = reader.result.split(",")[1];

            resolve(base64);
        };

        reader.onerror = error => {
            reject(error);
        };

        reader.readAsDataURL(file);

    });

}