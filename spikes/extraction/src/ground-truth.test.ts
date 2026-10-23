import { describe, expect, it } from "vitest";
import { GroundTruth, inScope } from "./ground-truth.js";
import { GT } from "./fixtures.test-helpers.js";

describe("GroundTruth", () => {
  it("accepte une vérité terrain cohérente", () => {
    expect(GroundTruth.safeParse(GT).success).toBe(true);
  });

  it("refuse une mesure hors des pages de sa section", () => {
    const bad = { ...GT, measures: [{ ...GT.measures[0], page: 3 }] };
    expect(GroundTruth.safeParse(bad).success).toBe(false);
  });

  it("refuse une section inconnue et un id en double", () => {
    expect(GroundTruth.safeParse({ ...GT, measures: [{ ...GT.measures[0], sectionId: "x" }] }).success).toBe(false);
    expect(GroundTruth.safeParse({ ...GT, measures: [GT.measures[0], GT.measures[0]] }).success).toBe(false);
  });

  it("refuse une date mal écrite", () => {
    const m = { ...GT.measures[0], values: [{ label: "date", value: "en 2028", unit: "date" }] };
    expect(GroundTruth.safeParse({ ...GT, measures: [m] }).success).toBe(false);
  });
});

describe("inScope", () => {
  it("dit si une page est dans une section annotée", () => {
    expect(inScope(2, GT.sections)).toBe(true);
    expect(inScope(4, GT.sections)).toBe(false);
  });
});
