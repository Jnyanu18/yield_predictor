// @ts-nocheck
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceArea } from "recharts";
import { BarChart3, CalendarDays, Camera, LineChart, Printer, SlidersHorizontal, Sparkles, UploadCloud, X, MapPin, Phone, User } from "lucide-react";

import { AgriVisionHeader } from "@/components/agrivision/header";
import { BottomDock, type DockView } from "@/components/agrivision/bottom-dock";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

import { DetectionTab } from "@/components/agrivision/detection-tab";
import { HarvestForecastTab } from "@/components/agrivision/harvest-forecast-tab";
import { YieldForecastTab } from "@/components/agrivision/yield-forecast-tab";
import { MarketTab } from "@/components/agrivision/market-tab";
import { ChatTab } from "@/components/agrivision/chat-tab";

import type {
  AppControls,
  ChatMessage,
  DetectionResult,
  ForecastResult,
  PlantAnalysisResult,
  YieldForecastOutput,
} from "@/lib/types";
import type { MarketPriceForecastingOutput } from "@/lib/types";
import { calculateYieldForecast as calculateMockHarvestForecast } from "@/lib/mock-data";
import { dataURLtoFile, formatNumber, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { runPlantAnalysis, predictYield as runYieldForecast, advisorChat, bestMarketRoute } from "@/lib/api";
import { ReportPage } from "@/components/agrivision/report-page";
import { QuickActions, type QuickAction } from "@/components/agrivision/quick-actions";

const resizeImage = (dataUrl: string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
};

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function daysUntil(dateIso: string) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(dateIso).getTime();
  return Math.max(0, Math.round((target - startOfToday) / (1000 * 60 * 60 * 24)));
}

export function Dashboard() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [view, setView] = useState<DockView>("detect");
  const [isInputsOpen, setIsInputsOpen] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isYieldForecastLoading, setIsYieldForecastLoading] = useState(false);
  const [priceScenarioPct, setPriceScenarioPct] = useState(0);
  const [storageTemp, setStorageTemp] = useState(26);
  const [storageHumidity, setStorageHumidity] = useState(62);
  const [ventilationScore, setVentilationScore] = useState(0.7);
  const [totalStorageCapacity, setTotalStorageCapacity] = useState(5000);

  const [image, setImage] = useState<{ url: string | null; file: File | null; contentType: string | null }>({
    url: null,
    file: null,
    contentType: null,
  });

  const [controls, setControls] = useState<AppControls>({
    avgWeightG: 85,
    postHarvestLossPct: 7,
    numPlants: 10,
    forecastDays: 14,
    gddBaseC: 10,
    harvestCapacityKgDay: 20,
    useDetectionModel: true,
    useLiveWeather: false,
    includePriceForecast: true,
    district: "Coimbatore",
    farmerName: "Rajesh Kumar",
    phoneNumber: "+91 98765 43210",
    farmSizeAcres: 2.5,
  });

  // Sync profile data from server on mount
  React.useEffect(() => {
    const syncProfile = async () => {
      try {
        const response = await fetch('/api/profile', { method: 'GET', credentials: 'include' });
        const body = await response.json();
        if (response.ok && body?.profile) {
          const p = body.profile;
          setControls(prev => ({
            ...prev,
            farmerName: p.personal?.fullName || prev.farmerName,
            district: p.personal?.district || prev.district,
            phoneNumber: p.personal?.phone || prev.phoneNumber,
            farmSizeAcres: p.land?.landAreaAcres || prev.farmSizeAcres
          }));
        }
      } catch (e) {
        console.error("Dashboard profile sync failed", e);
      }
    };
    syncProfile();
  }, []);

  const [plantAnalysisResult, setPlantAnalysisResult] = useState<PlantAnalysisResult | null>(null);
  const [harvestForecastResult, setHarvestForecastResult] = useState<ForecastResult | null>(null);
  const [yieldForecastResult, setYieldForecastResult] = useState<YieldForecastOutput | null>(null);
  const [marketResult, setMarketResult] = useState<MarketPriceForecastingOutput | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUploadedImage = Boolean(image.url);
  const uploadButtonLabel = hasUploadedImage ? "Uploaded" : "Upload";
  const uploadImageButtonLabel = hasUploadedImage ? "Uploaded image" : "Upload image";

  const stageCount = useCallback(
    (stage: string) => {
      const entry = plantAnalysisResult?.stages?.find((s: { stage: string; count: number }) => (s?.stage || "").toLowerCase() === (stage || "").toLowerCase());
      return entry?.count ?? 0;
    },
    [plantAnalysisResult]
  );

  const saveToProfile = async () => {
    try {
      setIsLoading(true);
      const payload = {
        personal: { fullName: controls.farmerName, district: controls.district, phone: controls.phoneNumber },
        land: { landAreaAcres: controls.farmSizeAcres },
      };
      const response = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        toast({ title: 'Profile Updated', description: 'Dashboard settings synced to your farmer profile.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Sync failed', description: 'Could not update profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const preview = useMemo(() => {
    if (!plantAnalysisResult) return null;
    const mature = stageCount("mature");
    const yieldNowKg = (mature * controls.avgWeightG) / 1000 * controls.numPlants;
    const sellableKg = yieldNowKg * (1 - controls.postHarvestLossPct / 100);
    const profitAtBestPrice = marketResult?.bestPrice ? sellableKg * marketResult.bestPrice : null;
    return {
      mature,
      sellableKg,
      profitAtBestPrice,
    };
  }, [controls.avgWeightG, controls.numPlants, controls.postHarvestLossPct, marketResult?.bestPrice, plantAnalysisResult, stageCount]);

  const detectionForUi: DetectionResult | null = useMemo(() => {
    if (!plantAnalysisResult || !image.url) return null;
    return {
      plantId: Date.now(),
      plantType: plantAnalysisResult.cropType || "Unknown",
      detections: (plantAnalysisResult.stages || []).reduce(
        (sum: number, stage: { stage?: string; count?: number }) => sum + ((stage.stage || "").toLowerCase() !== "flower" ? (stage.count || 0) : 0),
        0
      ),
      boxes: [],
      stageCounts: (plantAnalysisResult.stages || []).reduce((acc: any, s: { stage?: string; count?: number }) => {
        if (s.stage) acc[s.stage.toLowerCase()] = s.count || 0;
        return acc;
      }, {} as any),
      stages: plantAnalysisResult.stages || [],
      growthStage: "Varies",
      avgBboxArea: 0,
      confidence: 0.9,
      imageUrl: image.url,
      summary: plantAnalysisResult.summary,
    };
  }, [plantAnalysisResult, image.url]);

  const handleImageUpload = (file: File) => {
    const newImageUrl = URL.createObjectURL(file);
    setImage({ url: newImageUrl, file, contentType: file.type });
    setPlantAnalysisResult(null);
    setHarvestForecastResult(null);
    setYieldForecastResult(null);
    setMarketResult(null);
  };

  const handleAnalyze = useCallback(async () => {
    if (!image.url) {
      toast({ variant: "destructive", title: "No image", description: "Upload a plant image to start." });
      return;
    }

    setIsAnalysisLoading(true);
    setPlantAnalysisResult(null);
    setHarvestForecastResult(null);
    setYieldForecastResult(null);

    try {
      const reader = new FileReader();
      const fileToRead =
        image.file || (await dataURLtoFile(image.url, "analysis-image.jpg", image.contentType ?? "image/jpeg"));
      reader.readAsDataURL(fileToRead);

      const analysis = await new Promise<PlantAnalysisResult>((resolve, reject) => {
        reader.onload = async () => {
          try {
            let photoDataUri = reader.result as string;
            // Resize image to prevent 413 or timeout errors
            photoDataUri = await resizeImage(photoDataUri);
            
            const response = await runPlantAnalysis(photoDataUri, image.contentType!);
            if (!response.success || !response.data) {
              let errorMessage = response.error || "Analysis failed.";
              if (errorMessage.includes("API key not valid")) {
                errorMessage = "Your Gemini API key is not valid. Check your .env file.";
              }
              throw new Error(errorMessage);
            }
            resolve(response.data);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read image file."));
      });

      setPlantAnalysisResult(analysis);

      const detectionResultForForecast: DetectionResult = {
        plantId: Date.now(),
        plantType: analysis.cropType || "Unknown",
        detections: (analysis.stages || []).reduce(
          (sum, stage) => sum + ((stage.stage || "").toLowerCase() !== "flower" ? (stage.count || 0) : 0),
          0
        ),
        boxes: [],
        stageCounts: (analysis.stages || []).reduce((acc, s) => {
          if (s.stage) (acc as any)[s.stage.toLowerCase()] = s.count || 0;
          return acc;
        }, {} as any),
        stages: analysis.stages || [],
        growthStage: "Varies",
        avgBboxArea: 0,
        confidence: 0.9,
        imageUrl: image.url!,
        summary: analysis.summary,
      };

      const forecast = calculateMockHarvestForecast(detectionResultForForecast, controls);
      setHarvestForecastResult(forecast);

      toast({ title: "Analysis ready", description: "Detection and harvest forecast updated." });
      setView("home");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Analysis failed", description: err?.message || "Please try again." });
    } finally {
      setIsAnalysisLoading(false);
    }
  }, [controls, image.contentType, image.file, image.url, toast]);

  const handleYieldForecast = useCallback(async () => {
    if (!plantAnalysisResult) {
      toast({ variant: "destructive", title: "Run detection first", description: "Analyze the image to enable yield forecast." });
      return;
    }

    setIsYieldForecastLoading(true);
    setYieldForecastResult(null);

    try {
      const response = await runYieldForecast({ analysis: plantAnalysisResult, controls });
      if (!response.success || !response.data) throw new Error(response.error || "Yield forecast failed.");
      setYieldForecastResult(response.data);
      toast({ title: "Yield forecast ready", description: "AI yield curve updated." });
      setView("plan");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Yield forecast failed", description: err?.message || "Please try again." });
    } finally {
      setIsYieldForecastLoading(false);
    }
  }, [controls, plantAnalysisResult, toast]);

  const totalSellableKg = harvestForecastResult?.sellable_kg ?? null;
  const harvestWindowText = harvestForecastResult?.harvestWindow
    ? `${harvestForecastResult.harvestWindow.start} – ${harvestForecastResult.harvestWindow.end}`
    : null;
  const bestPrice = marketResult?.bestPrice ?? null;
  const simulatedBestPrice = bestPrice !== null ? bestPrice * (1 + priceScenarioPct / 100) : null;
  const simulatedEstimatedProfit = totalSellableKg !== null && simulatedBestPrice !== null ? totalSellableKg * simulatedBestPrice : null;

  const cropName = plantAnalysisResult?.cropType || // @ts-ignore
    plantAnalysisResult?.plantType || "Tomato";

  const district = controls.district || "District";

  const capacityLeft = Math.max(0, totalStorageCapacity - (totalSellableKg || 0));

  let baseDays = 14;
  let optimalTemp = 15;
  let optimalHumidity = 80;
  
  const cropLower = cropName.toLowerCase();
  
  if (cropLower.includes("tomato")) {
     baseDays = 14; optimalTemp = 18; optimalHumidity = 85;
  } else if (cropLower.includes("apple")) {
     baseDays = 60; optimalTemp = 2; optimalHumidity = 90;
  } else if (cropLower.includes("potato")) {
     baseDays = 120; optimalTemp = 8; optimalHumidity = 95;
  } else if (cropLower.includes("onion")) {
     baseDays = 90; optimalTemp = 4; optimalHumidity = 65;
  } else if (cropLower.includes("banana")) {
     baseDays = 7; optimalTemp = 14; optimalHumidity = 90;
  }
  
  const tempDiff = Math.abs(storageTemp - optimalTemp);
  const humidityDiff = Math.abs(storageHumidity - optimalHumidity);
  
  const safeStorageDays = Math.max(1, Math.round(baseDays - (tempDiff * 2.0) - (humidityDiff * 0.5) + (ventilationScore * 5)));

  const forecastSeries = (harvestForecastResult?.daily || []).map(d => ({
    date: d.date.slice(5),
    ready_kg: d.ready_kg,
  }));

  const optimalStart = harvestForecastResult?.harvestWindow?.start ?? null;
  const optimalEnd = harvestForecastResult?.harvestWindow?.end ?? null;

  const appState = useMemo(
    () => ({
      controls,
      detectionResult: detectionForUi,
      forecastResult: harvestForecastResult,
      marketResult,
    }),
    [controls, detectionForUi, harvestForecastResult, marketResult]
  );

  const primaryAction = useMemo(() => {
    if (!plantAnalysisResult) {
      return { label: "Upload & analyze", hint: "Start by analyzing a plant photo.", action: "analyze" as const };
    }
    if (!marketResult) {
      return { label: "Run market forecast", hint: "Get the best sell date and price.", action: "market" as const };
    }
    if (!yieldForecastResult) {
      return { label: "Run AI yield", hint: "Generate a lifecycle yield curve.", action: "yield" as const };
    }
    return { label: "Ask advisor", hint: "Get tailored recommendations.", action: "advisor" as const };
  }, [marketResult, plantAnalysisResult, yieldForecastResult]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "go-home",
        label: "Go to Main Dashboard",
        description: "Decision summary and outcomes",
        icon: BarChart3,
        onSelect: () => setView("home"),
      },
      { id: "go-detect", label: "Go to Detect", description: "Upload and verify detection", icon: Camera, onSelect: () => setView("detect") },
      { id: "go-plan", label: "Go to Plan", description: "Harvest plan + AI yield curve", icon: CalendarDays, onSelect: () => setView("plan") },
      { id: "go-market", label: "Go to Market", description: "Forecast prices and profit", icon: LineChart, onSelect: () => setView("market") },
      { id: "go-advisor", label: "Go to Advisor", description: "Ask questions with context", icon: Sparkles, onSelect: () => setView("advisor") },
      {
        id: "open-inputs",
        label: "Open Inputs",
        description: "Adjust farm controls and presets",
        icon: SlidersHorizontal,
        onSelect: () => setIsInputsOpen(true),
      },
      {
        id: "upload",
        label: "Upload Image",
        description: "Choose a plant photo",
        icon: UploadCloud,
        onSelect: () => fileInputRef.current?.click(),
      },
      {
        id: "analyze",
        label: "Run Analysis",
        description: "Detect stages and build harvest forecast",
        icon: Sparkles,
        disabled: isAnalysisLoading || !image.url,
        onSelect: () => handleAnalyze(),
      },
      {
        id: "yield",
        label: "Run AI Yield Forecast",
        description: "Generate lifecycle yield curve",
        icon: CalendarDays,
        disabled: isYieldForecastLoading || !plantAnalysisResult,
        onSelect: () => handleYieldForecast(),
      },
      {
        id: "print",
        label: "Print / Download Report",
        description: "Use browser print to export PDF",
        icon: Printer,
        onSelect: () => window.print(),
      },
    ],
    [handleAnalyze, handleYieldForecast, image.url, isAnalysisLoading, isYieldForecastLoading, plantAnalysisResult]
  );

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{cropName}</span> · {district} ·{" "}
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {plantAnalysisResult ? "Updated" : "Ready"}
          </span>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <Card className="relative overflow-hidden border-0 shadow-md bg-card/60 backdrop-blur-md transition-all hover:shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="font-headline text-2xl font-bold text-foreground">{controls.farmerName || "Farmer Name"}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {district || "Coimbatore, Tamil Nadu"}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">🌾 {controls.farmSizeAcres || 0} Acres</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {controls.phoneNumber || "+91 XXXXX XXXXX"}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsInputsOpen(true)} variant="outline" size="sm" className="rounded-full">Edit Profile</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-white/5 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-lg flex flex-col gap-1 sm:flex-row sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary/70" />
                Scenario Simulator
              </div>
            </CardTitle>
            <CardDescription className="text-xs">
              Simulate market price fluctuations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-headline text-4xl font-bold tracking-tight text-foreground">
              {simulatedEstimatedProfit === null ? "-" : `INR ${formatNumber(simulatedEstimatedProfit, 0)}`}
            </div>
            <div className="mt-2 text-sm font-medium text-muted-foreground flex justify-between items-center">
              <span>{simulatedBestPrice ? `Simulated Price: INR ${formatNumber(simulatedBestPrice, 2)}/kg` : "Run Market forecast for pricing."}</span>
              {priceScenarioPct !== 0 && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", priceScenarioPct > 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600")}>
                  {priceScenarioPct > 0 ? "+" : ""}{priceScenarioPct}%
                </span>
              )}
            </div>
            {simulatedEstimatedProfit !== null && (
              <div className="mt-6 px-1">
                <div className="text-xs text-muted-foreground mb-3 flex justify-between">
                  <span>Price drop (-30%)</span>
                  <span>Price boom (+30%)</span>
                </div>
                <Slider
                  value={[priceScenarioPct]}
                  min={-30}
                  max={30}
                  step={5}
                  onValueChange={(val) => setPriceScenarioPct(val[0])}
                  className="[&_[role=slider]]:bg-primary"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary/70" />
              Harvest timing
            </CardTitle>
            <CardDescription className="text-xs">Actionable window you can plan for.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-headline text-4xl font-bold tracking-tight text-foreground">
              {harvestWindowText ?? "-"}
            </div>
            <div className="mt-2 text-sm font-medium text-muted-foreground">
              {harvestForecastResult?.harvestWindow?.start
                ? `Starts in ${daysUntil(harvestForecastResult.harvestWindow.start)} days`
                : "Run analysis to compute optimal window."}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-headline text-2xl font-bold">Storage Advisor</h2>
          <p className="text-muted-foreground text-sm">Know exactly how long your crop will stay fresh in current conditions.</p>
        </div>

        <Card className="bg-card/40 backdrop-blur-md border border-white/5">
          <CardContent className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Crop Type</label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm">
                  {cropName}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Temperature (°C)</label>
                <Input type="number" value={storageTemp} onChange={e => setStorageTemp(Number(e.target.value))} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Humidity (%)</label>
                <Input type="number" value={storageHumidity} onChange={e => setStorageHumidity(Number(e.target.value))} className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Total Capacity (kg)</label>
                <Input type="number" value={totalStorageCapacity} onChange={e => setTotalStorageCapacity(Number(e.target.value))} className="bg-background/50" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-background/40">
                <div className="text-green-500 mb-2 font-headline text-3xl font-bold text-center">
                  {storageTemp}°C
                </div>
                <div className="text-xs text-muted-foreground mt-1">Storage Temperature</div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-background/40">
                <div className="text-blue-500 mb-2 font-headline text-3xl font-bold text-center">
                  {storageHumidity}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Relative Humidity</div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-background/40">
                <div className="text-green-500 mb-2 font-headline text-3xl font-bold text-center">
                  <span className="flex items-center justify-center gap-2"><CalendarDays className="h-6 w-6" /> {safeStorageDays} days</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Safe Storage Duration</div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-background/40">
                <div className="text-amber-500 mb-2 font-headline text-3xl font-bold text-center">
                   {formatNumber(capacityLeft, 0)} kg
                </div>
                <div className="text-xs text-muted-foreground mt-1">Capacity Left</div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
               <div className="p-2 bg-green-500/20 rounded-lg text-green-600 shrink-0">
                  <Sparkles className="h-5 w-5" />
               </div>
               <div>
                  <h4 className="font-semibold text-green-700 text-sm mb-1">AI Recommendation</h4>
                  <p className="text-sm text-green-800/80">
                     {safeStorageDays < 5 
                       ? `Store ${cropName} for ${Math.max(1, safeStorageDays - 1)} days, then re-evaluate market price immediately.` 
                       : `Store ${cropName} up to ${safeStorageDays} days safely. Capacity is ${capacityLeft < 500 ? 'running low' : 'sufficient'}.`}
                  </p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Local Risk Matrix</CardTitle>
          <CardDescription>Disease susceptibility based on current maturity.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center flex flex-col justify-center">
                 <div className="text-sm font-medium text-green-600 mb-1">Pest Risk</div>
                 <div className="text-2xl font-bold text-green-700">Low</div>
              </div>
              <div className={cn("p-4 rounded-xl border text-center flex flex-col justify-center transition-colors", (preview?.mature || 0) > 5 ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20")}>
                 <div className={cn("text-sm font-medium mb-1", (preview?.mature || 0) > 5 ? "text-amber-600" : "text-green-600")}>Spoilage Risk</div>
                 <div className={cn("text-2xl font-bold", (preview?.mature || 0) > 5 ? "text-amber-700" : "text-green-700")}>{(preview?.mature || 0) > 5 ? "Elevated" : "Low"}</div>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center flex flex-col justify-center">
                 <div className="text-sm font-medium text-orange-600 mb-1">Weather Delay</div>
                 <div className="text-2xl font-bold text-orange-700">20%</div>
              </div>
           </div>
           {(preview?.mature || 0) > 5 && (
             <div className="mt-5 text-sm text-amber-600 bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 flex items-start gap-4">
               <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
               <p>Elevated spoilage risk due to high concentration of mature fruits. Consider harvesting within 48 hours to minimize losses.</p>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDetect = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">{t("detection_stage")}</div>
          <div className="text-xs text-muted-foreground">Upload → Analyze → Verify evidence.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button onClick={handleAnalyze} disabled={isAnalysisLoading || !image.url}>
                {isAnalysisLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Tip: keep the plant centered and well-lit for better counts.
            </div>
          </div>
        </CardContent>
      </Card>

      <DetectionTab 
        result={detectionForUi} 
        isLoading={isAnalysisLoading} 
        imageUrl={image.url} 
        onUploadClick={() => fileInputRef.current?.click()}
      />
    </div>
  );

  const renderPlan = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">Plan</div>
          <div className="text-xs text-muted-foreground">Harvest schedule + AI yield curve.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleYieldForecast} disabled={isYieldForecastLoading || !plantAnalysisResult}>
            {isYieldForecastLoading ? "Forecasting..." : "Run AI yield"}
          </Button>
          <ControlsSheet
            controls={controls}
            setControls={setControls}
            onQuickAnalyze={handleAnalyze}
            isLoading={isAnalysisLoading}
            preview={preview}
            open={isInputsOpen}
            onOpenChange={setIsInputsOpen}
          />
        </div>
      </div>

      <HarvestForecastTab result={harvestForecastResult} isLoading={isAnalysisLoading} />
      <YieldForecastTab result={yieldForecastResult} isLoading={isYieldForecastLoading} />
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">{t("price_profit")}</div>
          <div className="text-xs text-muted-foreground">Forecast prices and pick the best sell date.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>

      <MarketTab
        sellableKg={harvestForecastResult?.sellable_kg || 0}
        district={controls.district}
        onMarketResultChange={setMarketResult}
      />
    </div>
  );

  const renderAdvisor = () => (
    <div className="space-y-6 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-headline text-lg font-semibold">Crop Advisor</div>
          <div className="text-xs text-muted-foreground">Ask questions with context from your latest results.</div>
        </div>
        <ControlsSheet
          controls={controls}
          setControls={setControls}
          onQuickAnalyze={handleAnalyze}
          isLoading={isAnalysisLoading}
          preview={preview}
          open={isInputsOpen}
          onOpenChange={setIsInputsOpen}
        />
      </div>
      <ChatTab appState={appState} chatHistory={chatHistory} setChatHistory={setChatHistory} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AgriVisionHeader />
      <QuickActions actions={quickActions} />
      {/* Hidden global file input so "Upload" works from any view (and via Ctrl/Cmd+K). */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
        }}
      />

      <main className="mx-auto max-w-5xl px-4 py-6 pl-28 md:pl-32 pb-6">
        {view === "home" ? renderHome() : null}
        {view === "detect" ? renderDetect() : null}
        {view === "plan" ? renderPlan() : null}
        {view === "market" ? renderMarket() : null}
        {view === "advisor" ? renderAdvisor() : null}

        <ReportPage
          imageUrl={image.url}
          detectionResult={detectionForUi}
          forecastResult={harvestForecastResult}
          marketResult={marketResult}
          controls={controls}
        />
      </main>

      <BottomDock
        value={view}
        onValueChange={next => {
          setView(next);
        }}
      />
    </div>
  );
}

function ControlsSheet({
  controls,
  setControls,
  onQuickAnalyze,
  isLoading,
  preview,
  open,
  onOpenChange,
}: {
  controls: AppControls;
  setControls: React.Dispatch<React.SetStateAction<AppControls>>;
  onQuickAnalyze: () => void;
  isLoading: boolean;
  preview: { mature: number; sellableKg: number; profitAtBestPrice: number | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = <K extends keyof AppControls>(key: K, value: AppControls[K]) => {
    setControls(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: Partial<AppControls>) => {
    setControls(prev => ({ ...prev, ...preset }));
  };

  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Open inputs" onClick={() => onOpenChange(true)}>
        <SlidersHorizontal className="h-5 w-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 transition-opacity"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <div className="relative z-50 w-full max-w-md h-full bg-background p-6 shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold font-headline">Inputs</h2>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="mt-6 space-y-5">
              {preview ? (
                <Card className="bg-card/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Live preview</div>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Mature fruits</div>
                        <div className="mt-1 font-headline text-lg font-semibold tabular-nums">{preview.mature}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Sellable now</div>
                        <div className="mt-1 font-headline text-lg font-semibold tabular-nums">
                          {formatNumber(preview.sellableKg, 2)} kg
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {preview.profitAtBestPrice === null
                        ? "Run Market once to preview profit."
                        : `Profit at best price: INR ${formatNumber(preview.profitAtBestPrice, 0)}`}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Presets</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset({ numPlants: 5, harvestCapacityKgDay: 6, postHarvestLossPct: 5 })}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    Home garden
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset({ numPlants: 40, harvestCapacityKgDay: 25, postHarvestLossPct: 7 })}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    Small farm
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset({ numPlants: 250, harvestCapacityKgDay: 120, postHarvestLossPct: 10 })}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    Commercial
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setControls({
                        avgWeightG: 85,
                        postHarvestLossPct: 7,
                        numPlants: 10,
                        forecastDays: 14,
                        gddBaseC: 10,
                        harvestCapacityKgDay: 20,
                        useDetectionModel: true,
                        useLiveWeather: false,
                        includePriceForecast: true,
                        district: "Coimbatore",
                      })
                    }
                    className="rounded-full bg-background px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/60 transition-colors hover:text-foreground"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="avgWeightG" className="text-sm font-medium leading-none">Avg fruit weight</label>
                  <span className="text-sm text-muted-foreground">{controls.avgWeightG} g</span>
                </div>
                <input
                  type="range"
                  id="avgWeightG"
                  className="w-full"
                  min={10}
                  max={400}
                  step={1}
                  value={controls.avgWeightG}
                  onChange={e => update("avgWeightG", parseInt(e.target.value, 10))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="postHarvestLossPct" className="text-sm font-medium leading-none">Post-harvest loss</label>
                  <span className="text-sm text-muted-foreground">{controls.postHarvestLossPct}%</span>
                </div>
                <input
                  type="range"
                  id="postHarvestLossPct"
                  className="w-full"
                  min={0}
                  max={30}
                  step={1}
                  value={controls.postHarvestLossPct}
                  onChange={e => update("postHarvestLossPct", parseInt(e.target.value, 10))}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="numPlants" className="text-sm font-medium leading-none">Plants</label>
                  <Input
                    id="numPlants"
                    type="number"
                    value={controls.numPlants}
                    onChange={e => update("numPlants", clampNumber(e.target.valueAsNumber || 0, 1, 5000))}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="forecastDays" className="text-sm font-medium leading-none">Forecast days</label>
                  <Input
                    id="forecastDays"
                    type="number"
                    value={controls.forecastDays}
                    onChange={e => update("forecastDays", clampNumber(e.target.valueAsNumber || 0, 7, 90))}
                    min={7}
                    max={90}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="farmerName" className="text-sm font-medium leading-none">Farmer Name</label>
                  <Input id="farmerName" value={controls.farmerName || ""} onChange={e => update("farmerName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-sm font-medium leading-none">Phone</label>
                  <Input id="phoneNumber" value={controls.phoneNumber || ""} onChange={e => update("phoneNumber", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="harvestCapacityKgDay" className="text-sm font-medium leading-none">Harvest capacity</label>
                  <Input
                    id="harvestCapacityKgDay"
                    type="number"
                    value={controls.harvestCapacityKgDay}
                    onChange={e => update("harvestCapacityKgDay", clampNumber(e.target.valueAsNumber || 0, 1, 1000))}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                   <label htmlFor="farmSizeAcres" className="text-sm font-medium leading-none">Farm Size (Acres)</label>
                   <Input id="farmSizeAcres" type="number" step="0.1" min={0} value={controls.farmSizeAcres || 0} onChange={e => update("farmSizeAcres", parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="district" className="text-sm font-medium leading-none">District/Location</label>
                  <Input id="district" value={controls.district || ""} onChange={e => update("district", e.target.value)} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={saveToProfile} disabled={isLoading}>
                  Save to Profile
                </Button>
                <Button className="flex-2" onClick={onQuickAnalyze} disabled={isLoading}>
                  {isLoading ? "Running..." : "Re-run Analysis"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
