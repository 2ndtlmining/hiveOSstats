import { describe, expect, it } from "vitest";
import { cleanData, validateRawSnapshot } from "../hiveos";
import type { RawSnapshot } from "@/types";

function validPayload(): Record<string, unknown> {
  const list = (name: string) => [{ name, amount: 0.6 }, { name: `${name}-2`, amount: 0.4 }];
  return {
    coins: list("XMR"),
    algos: list("randomx"),
    gpu_brands: list("nvidia"),
    nvidia_models: list("CMP 50HX 10GB"),
    amd_models: list("Radeon RX 5700 XT 8GB"),
    miners: list("xmrig-new"),
    asic_models: list("Antminer S19JPRO Hiveon"),
  };
}

describe("validateRawSnapshot", () => {
  it("accepts a well-formed payload", () => {
    expect(validateRawSnapshot(validPayload())).toEqual([]);
  });

  it("ignores extra top-level fields the API may add", () => {
    expect(validateRawSnapshot({ ...validPayload(), new_field: 42 })).toEqual([]);
  });

  it("rejects non-object bodies", () => {
    expect(validateRawSnapshot(null)).not.toEqual([]);
    expect(validateRawSnapshot("<html>502 Bad Gateway</html>")).not.toEqual([]);
    expect(validateRawSnapshot([])).not.toEqual([]);
  });

  it("rejects a missing category", () => {
    const p = validPayload();
    delete p.coins;
    expect(validateRawSnapshot(p)).toEqual(["coins: expected a non-empty array"]);
  });

  it("rejects an empty category", () => {
    expect(validateRawSnapshot({ ...validPayload(), miners: [] })).toEqual([
      "miners: expected a non-empty array",
    ]);
  });

  it("rejects non-numeric, non-finite or out-of-range amounts", () => {
    for (const amount of ["0.5", NaN, Infinity, -0.1, 1.5]) {
      const errors = validateRawSnapshot({ ...validPayload(), algos: [{ name: "x", amount }] });
      expect(errors, `amount ${String(amount)}`).toHaveLength(1);
      expect(errors[0]).toMatch(/^algos\[0\]/);
    }
  });

  it("rejects items without a string name", () => {
    expect(validateRawSnapshot({ ...validPayload(), coins: [{ amount: 0.5 }] })).toHaveLength(1);
  });
});

describe("cleanData", () => {
  it("only keeps known categories, so extra API fields don't break cleaning", () => {
    const cleaned = cleanData({ ...validPayload(), new_field: 42 } as unknown as RawSnapshot);
    expect(Object.keys(cleaned).sort()).toEqual(
      ["algos", "amd_models", "asic_models", "coins", "gpu_brands", "miners", "nvidia_models"]
    );
    expect(cleaned.coins.XMR.amount).toBeCloseTo(60);
  });
});
