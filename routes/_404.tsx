// routes/_404.tsx
import { Head } from "$fresh/runtime.ts";
import { Navbar } from "../components/Navbar.tsx";
import { Footer } from "../components/Footer.tsx";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Página No Encontrada | StatusZero</title>
      </Head>
      <Navbar />
      <main class="container" style="padding: 100px 24px; text-align: center;">
        <div class="playground-card" style="max-width: 520px; margin: 0 auto;">
          <img
            src="/logo.svg"
            width="64"
            height="64"
            alt="Logo de StatusZero"
            style="margin-bottom: 20px; display: inline-block;"
          />
          <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; margin-bottom: 12px;">
            404
          </h1>
          <h2 style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
            Repositorio o Página No Encontrada
          </h2>
          <p style="color: var(--text-secondary); margin-bottom: 28px; font-size: 0.95rem;">
            La página de estado o ruta solicitada no existe. Comprueba la URL o
            busca un repositorio público de GitHub en el inicio.
          </p>
          <a href="/" class="btn btn-primary">
            Volver al Inicio
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
