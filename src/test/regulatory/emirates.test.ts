import { describe, it, expect } from "vitest";
import { getEmirateConfig, getTariffRate, getEmirateByCoords } from "@/lib/regulatory/emirates";

describe("getEmirateConfig", () => {
  it("returns Dubai config for Dubai coordinates", () => {
    const config = getEmirateConfig(25.2, 55.3);
    expect(config.name).toBe("Dubai");
    expect(config.utility).toBe("DEWA");
  });

  it("returns Abu Dhabi config for Abu Dhabi coordinates", () => {
    const config = getEmirateConfig(24.5, 54.4);
    expect(config.name).toBe("Abu Dhabi");
    expect(config.utility).toBe("ADDC");
  });

  it("returns Sharjah config for Sharjah coordinates", () => {
    const config = getEmirateConfig(25.42, 55.4);
    expect(config.name).toBe("Sharjah");
    expect(config.utility).toBe("SEWA");
  });

  it("returns Fujairah config for Fujairah coordinates", () => {
    const config = getEmirateConfig(25.2, 56.3);
    expect(config.name).toBe("Fujairah");
    expect(config.utility).toBe("FEWA");
  });

  it("falls back to Dubai for unknown coordinates (ocean)", () => {
    const config = getEmirateConfig(10, 50);
    expect(config.name).toBe("Dubai");
  });
});

describe("getEmirateByCoords", () => {
  it("returns 'dubai' for Dubai coordinates", () => {
    expect(getEmirateByCoords(25.2, 55.3)).toBe("dubai");
  });

  it("returns 'abu_dhabi' for Abu Dhabi coordinates", () => {
    expect(getEmirateByCoords(24.5, 54.4)).toBe("abu_dhabi");
  });

  it("falls back to 'dubai' for unknown coordinates", () => {
    expect(getEmirateByCoords(0, 0)).toBe("dubai");
  });
});

describe("getTariffRate", () => {
  it("returns correct rate for first slab in Dubai", () => {
    expect(getTariffRate("dubai", 1000)).toBe(0.23);
  });

  it("returns correct rate for second slab in Dubai", () => {
    expect(getTariffRate("dubai", 3000)).toBe(0.28);
  });

  it("returns correct rate for third slab in Dubai", () => {
    expect(getTariffRate("dubai", 5000)).toBe(0.32);
  });

  it("returns correct rate for highest slab in Dubai", () => {
    expect(getTariffRate("dubai", 10000)).toBe(0.38);
  });

  it("returns default DEWA rate for unknown emirate key", () => {
    expect(getTariffRate("nonexistent", 1000)).toBe(0.32);
  });

  it("returns second slab rate for Abu Dhabi at 3500kWh", () => {
    expect(getTariffRate("abu_dhabi", 3500)).toBe(0.27);
  });
});
