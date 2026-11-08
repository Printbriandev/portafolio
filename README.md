# Portafolio · Brian Guzmán Mañón

Mi portafolio personal como **Junior Backend Developer** y **Fraud Analyst Jr.** Se lee como la traza de una petición: cada sección es un salto (cliente, API, middleware, infraestructura, capa antifraude) hasta la respuesta `200 OK` en Contacto.

**En vivo:** https://printbriandev.github.io/portafolio/

## Qué tiene

- **Inicio con escena en vivo:** una foto fija (generada con IA) de un centro de datos. Encima, `escena.js` monta pantallas alineadas con los monitores de la foto (con perspectiva) donde se escribe código de ejemplo en tiempo real: editor, terminal, pruebas, logs con la hora local del visitante y una tabla de transacciones de demostración. Todo el código y los datos de las pantallas son ficticios.
- **Pausa y accesibilidad:** botón «Pausar animaciones» que congela la escena y el resto de animaciones del sitio (se recuerda en el navegador); la escena también se detiene sola fuera de pantalla, con la pestaña oculta o tras 2 minutos sin actividad. Con `prefers-reduced-motion` se muestra un cuadro fijo. Sin JavaScript, todo el contenido se ve igual.
- **Traza lateral** en escritorio y línea de progreso en móvil.
- **Endpoint real:** `me.json` (y `/api/me` en Vercel) devuelve mis datos en JSON; la ficha de "Sobre mí" lo pide y mide el tiempo en tu navegador.
- Imágenes en WebP con tamaños responsivos y respaldo JPG. Miniatura para compartir: `img/og-v3.jpg` (1200×630).
- Al imprimir o «Guardar como PDF» se ve todo el contenido en fondo claro, sin el header fijo ni la escena.

## Stack

HTML, CSS y JavaScript sin frameworks ni dependencias. Desplegado en GitHub Pages y Vercel.

## Archivos

- `index.html`, `styles.css`
- `script.js`: menú, apariciones, traza, `/api/me` y año.
- `escena.js`: motor de la escena del inicio. `?calibrar` en la URL dibuja los contornos de las pantallas para revisar la alineación.
- `me.json`: si cambias me.json, actualiza también el respaldo en index.html (bloque `GET /api/me`).

## Ejecutar en local

```bash
python -m http.server 8766
```

---
Autor: **Brian Guzmán Mañón** · [LinkedIn](https://www.linkedin.com/in/brian-guzman-manon) · [GitHub](https://github.com/Printbriandev)
