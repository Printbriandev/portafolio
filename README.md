# Portafolio — Brian Guzmán Mañón

Mi portafolio personal como **Junior Backend Developer**. Entrar es como entrar a un cuarto de servidores: arranca el servidor, se abren las puertas del rack y recorres un pasillo de racks, switches y cables de red.

**En vivo:** https://brianguzman.vercel.app

## Qué tiene

- **Entrada:** secuencia de arranque y puertas de rack que se abren. Se muestra una vez por sesión y se puede saltar.
- **Pasillo 3D en `<canvas>`:** racks con LEDs, piso técnico, bandejas de cables y paquetes de datos. Sigue el movimiento del mouse.
- **Switches de 24 puertos RJ45** con cables de colores y LEDs de enlace y actividad.
- **Secciones como endpoints REST** (`GET /proyectos`, `POST /contacto`) y una terminal que "llama" a `/api/me`.
- **Endpoint real:** `/api/me` devuelve mis datos en JSON (rewrite de Vercel a `me.json`).
- Diseño responsive y accesible: sin animaciones si el sistema pide `prefers-reduced-motion` y con menú móvil.

## Stack

HTML, CSS y JavaScript sin frameworks ni dependencias, desplegado en Vercel.

## Ejecutar en local

```bash
npx serve .
```

---
Autor: **Brian Guzmán Mañón** · [LinkedIn](https://www.linkedin.com/in/brian-guzman-manon) · [GitHub](https://github.com/Printbriandev)
