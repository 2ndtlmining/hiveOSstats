export type CategoryKey =
  | "coins"
  | "algos"
  | "gpu_brands"
  | "nvidia_models"
  | "amd_models"
  | "miners"
  | "asic_models";

export interface RawItem {
  name: string;
  amount: number;
}

export interface CleanedItem {
  name: string;
  amount: number;
  snapshot: string;
}

export type CleanedCategory = Record<string, CleanedItem>;
export type CleanedSnapshot = Record<CategoryKey, CleanedCategory>;

export type RawSnapshot = Record<CategoryKey, RawItem[]>;

export interface TimeSeriesPoint {
  date: string;
  [itemName: string]: number | string;
}

export interface DataItem {
  name: string;
  amount: number;
  snapshot: string;
}

export const CATEGORIES: { label: string; value: CategoryKey }[] = [
  { label: "Coins", value: "coins" },
  { label: "Algorithms", value: "algos" },
  { label: "GPU Brands", value: "gpu_brands" },
  { label: "NVIDIA Models", value: "nvidia_models" },
  { label: "AMD Models", value: "amd_models" },
  { label: "Miners", value: "miners" },
  { label: "ASIC Models", value: "asic_models" },
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  coins: "Coins",
  algos: "Algorithms",
  gpu_brands: "GPU Brands",
  nvidia_models: "NVIDIA Models",
  amd_models: "AMD Models",
  miners: "Miners",
  asic_models: "ASIC Models",
};
