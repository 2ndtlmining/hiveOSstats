import { getTimeSeries, getTopItems } from "@/lib/data";
import { TrendsClient } from "./trends-client";

export const dynamic = "force-dynamic";

export default function TrendsPage() {
  // Pre-built views
  const gpuBrands = getTopItems("gpu_brands", 10).map((i) => i.name);
  const gpuSeries = getTimeSeries("gpu_brands", gpuBrands);

  const topCoins = getTopItems("coins", 10).map((i) => i.name);
  const coinSeries = getTimeSeries("coins", topCoins);

  const topMiners = getTopItems("miners", 10).map((i) => i.name);
  const minerSeries = getTimeSeries("miners", topMiners);

  const topAlgos = getTopItems("algos", 10).map((i) => i.name);
  const algoSeries = getTimeSeries("algos", topAlgos);

  const topNvidia = getTopItems("nvidia_models", 10).map((i) => i.name);
  const nvidiaSeries = getTimeSeries("nvidia_models", topNvidia);

  const topAmd = getTopItems("amd_models", 10).map((i) => i.name);
  const amdSeries = getTimeSeries("amd_models", topAmd);

  return (
    <TrendsClient
      views={[
        { title: "GPU Market Share", names: gpuBrands, data: gpuSeries },
        { title: "Top 10 Coins", names: topCoins, data: coinSeries },
        { title: "Mining Software Popularity", names: topMiners, data: minerSeries },
        { title: "Top Algorithms", names: topAlgos, data: algoSeries },
        { title: "Top NVIDIA Models", names: topNvidia, data: nvidiaSeries },
        { title: "Top AMD Models", names: topAmd, data: amdSeries },
      ]}
    />
  );
}
