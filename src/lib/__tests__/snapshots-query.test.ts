import { describe, expect, it } from "vitest";
import { parseSnapshotsQuery } from "../snapshots-query";

const q = (s: string) => parseSnapshotsQuery(new URLSearchParams(s));

describe("parseSnapshotsQuery", () => {
  it("accepts a series request and trims and dedupes names", () => {
    expect(q("category=coins&names=XMR, PRL,XMR,")).toEqual({
      action: "series", category: "coins", names: ["XMR", "PRL"],
    });
  });

  it("accepts summary, names and latest", () => {
    expect(q("action=summary")).toEqual({ action: "summary" });
    expect(q("action=names&category=miners")).toEqual({ action: "names", category: "miners" });
    expect(q("action=latest")).toEqual({ action: "latest", category: null });
  });

  it("rejects unknown categories, including prototype keys", () => {
    expect(q("category=foo&names=XMR")).toHaveProperty("error");
    expect(q("action=latest&category=__proto__")).toHaveProperty("error");
  });

  it("rejects unknown actions and the old dump-everything mode", () => {
    expect(q("action=everything&category=coins")).toHaveProperty("error");
    expect(q("category=coins")).toHaveProperty("error");
  });

  it("caps the number of names", () => {
    const names = Array.from({ length: 21 }, (_, i) => `N${i}`).join(",");
    expect(q(`category=coins&names=${names}`)).toHaveProperty("error");
    expect(q("category=coins&names=,,")).toHaveProperty("error");
  });
});
