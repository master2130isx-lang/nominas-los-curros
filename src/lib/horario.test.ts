import { describe, expect, it } from "vitest";
import { horasEntre, leerHorario, textoHorario } from "./horario";

describe("horario", () => {
  it("lee los horarios escritos a mano", () => {
    expect(leerHorario("7:00 - 3:00")).toEqual({ entrada: "07:00", salida: "15:00" });
    expect(leerHorario("Jueves a martes de 8am a 3pm")).toEqual({ entrada: "08:00", salida: "15:00" });
    expect(leerHorario("Lunes a domingo de 6am a 8am (2 horas)")).toEqual({ entrada: "06:00", salida: "08:00" });
    expect(leerHorario("Domingo a viernes de 3pm a 9pm")).toEqual({ entrada: "15:00", salida: "21:00" });
    expect(leerHorario("L-S 7 a 14")).toEqual({ entrada: "07:00", salida: "14:00" });
    expect(leerHorario("Martes y sábado de 8am a 12-1pm aprox.")).toEqual({ entrada: "08:00", salida: "12:00" });
    expect(leerHorario("Sábado y domingo")).toBeNull();
  });

  it("calcula las horas por día", () => {
    expect(horasEntre("07:00", "15:00")).toBe(8);
    expect(horasEntre("06:00", "08:00")).toBe(2);
    expect(horasEntre("13:30", "21:00")).toBe(7.5);
    expect(horasEntre("22:00", "02:00")).toBe(4);
  });

  it("escribe el horario para el recibo y la constancia", () => {
    expect(textoHorario({ entrada: "07:00", salida: "15:00" })).toBe("7:00 a 15:00");
  });
});
