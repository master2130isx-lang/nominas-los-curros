const UNIDADES = [
  "", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete",
  "dieciocho", "diecinueve", "veinte", "veintiún", "veintidós", "veintitrés",
  "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos",
  "seiscientos", "setecientos", "ochocientos", "novecientos",
];

function hasta999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = CENTENAS[c];
  if (r > 0) {
    let resto: string;
    if (r < 30) resto = UNIDADES[r];
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      resto = DECENAS[d] + (u ? ` y ${UNIDADES[u]}` : "");
    }
    s = s ? `${s} ${resto}` : resto;
  }
  return s;
}

function entero(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${hasta999(millones)} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${hasta999(miles)} mil`);
  if (resto) partes.push(hasta999(resto));
  return partes.join(" ");
}

/** 1000 → "Mil pesos 00/100 M.N." */
export function pesosConLetra(monto: number): string {
  const centavos = Math.round(Math.abs(monto) * 100);
  const pesos = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, "0");
  let texto = entero(pesos);
  // "un millón pesos" → "un millón de pesos"
  const de = pesos > 0 && pesos % 1_000_000 === 0 ? " de" : "";
  texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  const unidad = pesos === 1 ? "peso" : "pesos";
  return `${texto}${de} ${unidad} ${cent}/100 M.N.`;
}
