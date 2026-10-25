import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CABECERA_USUARIO } from "@/lib/supabase/cabecera";

// Refresca la sesión en cada visita, manda a /login a quien no la tenga y pasa
// el id del usuario validado a las páginas (una sola llamada a getUser por petición).
export async function middleware(request: NextRequest) {
  const nuevas: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          nuevas.push(...lista);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !enLogin) return redirigir(request, "/login", nuevas);
  if (user && enLogin) return redirigir(request, "/", nuevas);

  // Nadie de afuera puede mandar esta cabecera: se borra y solo se pone tras validar.
  const cabeceras = new Headers(request.headers);
  cabeceras.delete(CABECERA_USUARIO);
  if (user) cabeceras.set(CABECERA_USUARIO, user.id);
  const response = NextResponse.next({ request: { headers: cabeceras } });
  nuevas.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

function redirigir(
  request: NextRequest,
  destino: string,
  nuevas: { name: string; value: string; options: CookieOptions }[],
) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  const response = NextResponse.redirect(url);
  nuevas.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}

// Pasa por todas las rutas de la aplicación (no hay archivos en /public), para
// que la cabecera interna siempre se limpie antes de llegar a una página.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
