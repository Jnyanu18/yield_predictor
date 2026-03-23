import { create } from "zustand";
import { persist } from "zustand/middleware";

type AnyObj = Record<string, any> | null;

type FarmState = {
  currentAnalysis: AnyObj;
  fieldSnapshot: AnyObj;
  yieldPrediction: AnyObj;
  diseaseRisk: AnyObj;
  irrigationAdvice: AnyObj;
  harvestPlan: AnyObj;
  storageAdvice: AnyObj;
  marketRecommendation: AnyObj;
  profitSimulation: AnyObj;
  setCurrentAnalysis: (value: AnyObj) => void;
  setFieldSnapshot: (value: AnyObj) => void;
  setPipeline: (value: AnyObj) => void;
  resetFarm: () => void;
};

const initialState = {
  currentAnalysis: null,
  fieldSnapshot: null,
  yieldPrediction: null,
  diseaseRisk: null,
  irrigationAdvice: null,
  harvestPlan: null,
  storageAdvice: null,
  marketRecommendation: null,
  profitSimulation: null
};

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentAnalysis: (value: AnyObj) => set({ currentAnalysis: value }),
      setFieldSnapshot: (value: AnyObj) => set({ fieldSnapshot: value }),
      setPipeline: (value: AnyObj) =>
        set({
          fieldSnapshot: (value as any)?.fieldContext ?? null,
          currentAnalysis: (value as any)?.cropAnalysis ?? null,
          yieldPrediction: (value as any)?.yieldPrediction ?? null,
          diseaseRisk: (value as any)?.disease ?? null,
          irrigationAdvice: (value as any)?.irrigation ?? null,
          harvestPlan: (value as any)?.harvest ?? null,
          storageAdvice: (value as any)?.storage ?? null,
          marketRecommendation: (value as any)?.market ?? null,
          profitSimulation: (value as any)?.profit ?? null
        }),
      resetFarm: () => set({ ...initialState })
    }),
    {
      name: "agri:zustand:farm"
    }
  )
);
